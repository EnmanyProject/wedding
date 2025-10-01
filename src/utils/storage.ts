import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from './config';
import { v4 as uuidv4 } from 'uuid';

export class StorageService {
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

export const storageService = new StorageService();