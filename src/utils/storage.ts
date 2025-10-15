import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from './config';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Storage Service Interface
 */
export interface IStorageService {
  generatePresignedUploadUrl(
    userId: string,
    filename: string,
    contentType: string
  ): Promise<{ uploadUrl: string; storageKey: string; photoId: string }>;
  generatePresignedDownloadUrl(storageKey: string, expiresIn?: number): Promise<string>;
  uploadPhotoVariant(storageKey: string, buffer: Buffer, contentType?: string): Promise<void>;
  downloadPhoto(storageKey: string): Promise<Buffer>;
  deletePhoto(storageKeys: string[]): Promise<void>;
  generateVariantStorageKey(originalKey: string, variant: 'THUMB' | 'BLUR1' | 'BLUR2'): string;
  photoExists(storageKey: string): Promise<boolean>;
}

/**
 * Local File System Storage Service
 */
class LocalStorageService implements IStorageService {
  private basePath: string;

  constructor() {
    this.basePath = config.LOCAL_STORAGE_PATH;
  }

  /**
   * Ensure directory exists
   */
  private async ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error: any) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Get absolute file path
   */
  private getAbsolutePath(storageKey: string): string {
    return path.join(this.basePath, storageKey);
  }

  /**
   * Get public URL path
   */
  private getPublicUrl(storageKey: string): string {
    // ✅ FIX: Development environment needs absolute HTTP URL to avoid SSL protocol errors
    // Browser interprets relative URLs using current page protocol (HTTPS), but server is HTTP-only
    if (config.NODE_ENV === 'development') {
      return `http://localhost:${config.PORT}/uploads/${storageKey}`;
    }
    // Production: Return relative path (HTTPS will be handled by reverse proxy)
    return `/uploads/${storageKey}`;
  }

  /**
   * Generate upload info (no presigned URL needed for local storage)
   */
  async generatePresignedUploadUrl(
    userId: string,
    filename: string,
    contentType: string
  ): Promise<{ uploadUrl: string; storageKey: string; photoId: string }> {
    const photoId = uuidv4();
    const extension = filename.split('.').pop() || 'jpg';
    const storageKey = `users/${userId}/photos/${photoId}/orig.${extension}`;

    // Ensure directory exists
    const absolutePath = this.getAbsolutePath(storageKey);
    await this.ensureDir(path.dirname(absolutePath));

    // For local storage, uploadUrl is just the storage key
    // Client will use multipart upload API instead
    return {
      uploadUrl: this.getPublicUrl(storageKey),
      storageKey,
      photoId
    };
  }

  /**
   * Generate download URL (just return public path)
   */
  async generatePresignedDownloadUrl(storageKey: string, expiresIn: number = 3600): Promise<string> {
    return this.getPublicUrl(storageKey);
  }

  /**
   * Upload photo variant to local file system
   */
  async uploadPhotoVariant(
    storageKey: string,
    buffer: Buffer,
    contentType: string = 'image/jpeg'
  ): Promise<void> {
    const absolutePath = this.getAbsolutePath(storageKey);
    await this.ensureDir(path.dirname(absolutePath));
    await fs.writeFile(absolutePath, buffer);
  }

  /**
   * Download photo from local file system
   */
  async downloadPhoto(storageKey: string): Promise<Buffer> {
    const absolutePath = this.getAbsolutePath(storageKey);
    return await fs.readFile(absolutePath);
  }

  /**
   * Delete photo and all its variants
   */
  async deletePhoto(storageKeys: string[]): Promise<void> {
    const deletePromises = storageKeys.map(async (key) => {
      const absolutePath = this.getAbsolutePath(key);
      try {
        await fs.unlink(absolutePath);
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }
    });

    await Promise.all(deletePromises);
  }

  /**
   * Generate storage key for photo variant
   */
  generateVariantStorageKey(originalKey: string, variant: 'THUMB' | 'BLUR1' | 'BLUR2'): string {
    const pathParts = originalKey.split('/');
    const filename = pathParts.pop() || '';
    const extension = filename.split('.').pop() || 'jpg';
    const basePath = pathParts.join('/');

    const variantName = variant.toLowerCase();
    return `${basePath}/${variantName}.${extension}`;
  }

  /**
   * Check if photo exists in local file system
   */
  async photoExists(storageKey: string): Promise<boolean> {
    try {
      const absolutePath = this.getAbsolutePath(storageKey);
      await fs.access(absolutePath);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * MinIO/S3 Storage Service
 */
class MinIOStorageService implements IStorageService {
  private s3Client: S3Client;
  private bucket: string;

  constructor() {
    this.s3Client = new S3Client({
      endpoint: config.STORAGE_ENDPOINT,
      region: config.STORAGE_REGION,
      credentials: {
        accessKeyId: config.STORAGE_ACCESS_KEY,
        secretAccessKey: config.STORAGE_SECRET_KEY,
      },
      forcePathStyle: config.STORAGE_FORCE_PATH_STYLE,
      // Disable TLS for localhost development MinIO
      tls: !config.STORAGE_ENDPOINT.includes('localhost'),
    });
    this.bucket = config.STORAGE_BUCKET;
  }

  /**
   * Generate presigned URL for photo upload
   */
  async generatePresignedUploadUrl(
    userId: string,
    filename: string,
    contentType: string
  ): Promise<{ uploadUrl: string; storageKey: string; photoId: string }> {
    const photoId = uuidv4();
    const extension = filename.split('.').pop() || 'jpg';
    const storageKey = `users/${userId}/photos/${photoId}/orig.${extension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
      ContentType: contentType,
      Metadata: {
        userId,
        photoId,
        originalFilename: filename,
      },
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: config.PRESIGN_URL_EXPIRES,
    });

    // Fix SSL protocol error: Convert HTTPS to HTTP for localhost MinIO
    const httpUploadUrl = uploadUrl.replace('https://localhost:9000', 'http://localhost:9000');

    return { uploadUrl: httpUploadUrl, storageKey, photoId };
  }

  /**
   * Generate presigned URL for photo download
   */
  async generatePresignedDownloadUrl(storageKey: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
    });

    const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });

    // Fix SSL protocol error: Convert HTTPS to HTTP for localhost MinIO
    // This handles the case where AWS SDK forces HTTPS but MinIO is running on HTTP
    const httpUrl = signedUrl.replace('https://localhost:9000', 'http://localhost:9000');

    return httpUrl;
  }

  /**
   * Upload processed photo variant
   */
  async uploadPhotoVariant(
    storageKey: string,
    buffer: Buffer,
    contentType: string = 'image/jpeg'
  ): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
      Body: buffer,
      ContentType: contentType,
    });

    await this.s3Client.send(command);
  }

  /**
   * Download photo for processing
   */
  async downloadPhoto(storageKey: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
    });

    const response = await this.s3Client.send(command);

    if (!response.Body) {
      throw new Error('No photo data found');
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    const stream = response.Body as any;

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Uint8Array) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  /**
   * Delete photo and all its variants
   */
  async deletePhoto(storageKeys: string[]): Promise<void> {
    const deletePromises = storageKeys.map(key => {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      return this.s3Client.send(command);
    });

    await Promise.all(deletePromises);
  }

  /**
   * Generate storage key for photo variant
   */
  generateVariantStorageKey(originalKey: string, variant: 'THUMB' | 'BLUR1' | 'BLUR2'): string {
    const pathParts = originalKey.split('/');
    const filename = pathParts.pop() || '';
    const extension = filename.split('.').pop() || 'jpg';
    const basePath = pathParts.join('/');

    const variantName = variant.toLowerCase();
    return `${basePath}/${variantName}.${extension}`;
  }

  /**
   * Check if photo exists in storage
   */
  async photoExists(storageKey: string): Promise<boolean> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
      });
      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NoSuchKey') {
        return false;
      }
      throw error;
    }
  }
}

/**
 * Storage Service Factory
 * Returns appropriate storage service based on configuration
 */
function createStorageService(): IStorageService {
  if (config.STORAGE_MODE === 'local') {
    console.log('📁 Using Local File System Storage');
    return new LocalStorageService();
  } else {
    console.log('☁️ Using MinIO/S3 Storage');
    return new MinIOStorageService();
  }
}

export const storageService = createStorageService();