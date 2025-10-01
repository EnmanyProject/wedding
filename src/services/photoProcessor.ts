// import sharp from 'sharp'; // Temporarily disabled - needs native build

// Mock Sharp for development without native build
const sharp = (buffer: Buffer) => ({
  metadata: async () => ({ width: 1024, height: 1024, format: 'jpeg' }),
  resize: (width: number, height: number) => ({
    jpeg: (options?: any) => ({
      toBuffer: async () => buffer // Return original buffer for now
    })
  }),
  blur: (sigma: number) => ({
    toBuffer: async () => buffer // Return original buffer for now
  })
});

import { Database } from '../utils/database';
import { storageService } from '../utils/storage';
import { config } from '../utils/config';
import { PhotoAsset } from '../types/database';
import { v4 as uuidv4 } from 'uuid';

export interface PhotoProcessingJob {
  photoId: string;
  originalStorageKey: string;
  userId: string;
  retryCount?: number;
}

export class PhotoProcessorService {
  private db: Database;
  private maxRetries = 3;

  constructor() {
    this.db = Database.getInstance();
  }

  /**
   * Process original photo into all variants
   */
  async processPhoto(job: PhotoProcessingJob): Promise<void> {
    try {
      console.log(`Processing photo ${job.photoId} for user ${job.userId}`);

      // Download original photo
      const originalBuffer = await storageService.downloadPhoto(job.originalStorageKey);

      // Get image metadata
      const metadata = await sharp(originalBuffer).metadata();
      const { width, height } = metadata;

      // Create original asset record
      await this.createPhotoAsset(job.photoId, 'ORIG', job.originalStorageKey, {
        width,
        height,
        size_bytes: originalBuffer.length,
        mime_type: `image/${metadata.format}`,
      });

      // Generate and upload variants
      await Promise.all([
        this.generateThumbnail(job, originalBuffer, metadata),
        this.generateBlurVariant(job, originalBuffer, metadata, 'BLUR1', config.PHOTO_BLUR1_SIGMA),
        this.generateBlurVariant(job, originalBuffer, metadata, 'BLUR2', config.PHOTO_BLUR2_SIGMA),
      ]);

      // Update photo status to approved (simple moderation)
      await this.db.query(
        'UPDATE user_photos SET moderation_status = $1, updated_at = NOW() WHERE id = $2',
        ['APPROVED', job.photoId]
      );

      console.log(`Successfully processed photo ${job.photoId}`);
    } catch (error) {
      console.error(`Error processing photo ${job.photoId}:`, error);

      const retryCount = (job.retryCount || 0) + 1;
      if (retryCount < this.maxRetries) {
        console.log(`Retrying photo processing (${retryCount}/${this.maxRetries})`);
        await this.processPhoto({ ...job, retryCount });
      } else {
        // Mark as rejected after max retries
        await this.db.query(
          'UPDATE user_photos SET moderation_status = $1, updated_at = NOW() WHERE id = $2',
          ['REJECTED', job.photoId]
        );
        console.error(`Failed to process photo ${job.photoId} after ${this.maxRetries} retries`);
      }
    }
  }

  /**
   * Generate thumbnail variant
   */
  private async generateThumbnail(
    job: PhotoProcessingJob,
    originalBuffer: Buffer,
    metadata: sharp.Metadata
  ): Promise<void> {
    const thumbBuffer = await sharp(originalBuffer)
      .resize(config.PHOTO_THUMB_SIZE, config.PHOTO_THUMB_SIZE, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    const thumbStorageKey = storageService.generateVariantStorageKey(job.originalStorageKey, 'THUMB');
    await storageService.uploadPhotoVariant(thumbStorageKey, thumbBuffer, 'image/jpeg');

    const thumbMetadata = await sharp(thumbBuffer).metadata();
    await this.createPhotoAsset(job.photoId, 'THUMB', thumbStorageKey, {
      width: thumbMetadata.width,
      height: thumbMetadata.height,
      size_bytes: thumbBuffer.length,
      mime_type: 'image/jpeg',
    });
  }

  /**
   * Generate blur variant
   */
  private async generateBlurVariant(
    job: PhotoProcessingJob,
    originalBuffer: Buffer,
    metadata: sharp.Metadata,
    variant: 'BLUR1' | 'BLUR2',
    sigma: number
  ): Promise<void> {
    const blurBuffer = await sharp(originalBuffer)
      .blur(sigma)
      .jpeg({ quality: 80 })
      .toBuffer();

    const blurStorageKey = storageService.generateVariantStorageKey(job.originalStorageKey, variant);
    await storageService.uploadPhotoVariant(blurStorageKey, blurBuffer, 'image/jpeg');

    const blurMetadata = await sharp(blurBuffer).metadata();
    await this.createPhotoAsset(job.photoId, variant, blurStorageKey, {
      width: blurMetadata.width,
      height: blurMetadata.height,
      size_bytes: blurBuffer.length,
      mime_type: 'image/jpeg',
    });
  }

  /**
   * Create photo asset record
   */
  private async createPhotoAsset(
    photoId: string,
    variant: 'ORIG' | 'THUMB' | 'BLUR1' | 'BLUR2',
    storageKey: string,
    metadata: {
      width?: number;
      height?: number;
      size_bytes: number;
      mime_type: string;
    }
  ): Promise<PhotoAsset> {
    const [asset] = await this.db.query<PhotoAsset>(
      `INSERT INTO photo_assets (id, photo_id, variant, storage_key, width, height, mime_type, size_bytes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        uuidv4(),
        photoId,
        variant,
        storageKey,
        metadata.width,
        metadata.height,
        metadata.mime_type,
        metadata.size_bytes,
      ]
    );

    return asset;
  }

  /**
   * Simple moderation check (placeholder for real moderation)
   */
  private async moderatePhoto(buffer: Buffer): Promise<boolean> {
    // Placeholder: implement real content moderation here
    // For now, just check if it's a valid image
    try {
      const metadata = await sharp(buffer).metadata();
      return metadata.width !== undefined && metadata.height !== undefined;
    } catch {
      return false;
    }
  }

  /**
   * Queue photo for processing
   */
  async queuePhotoProcessing(job: PhotoProcessingJob): Promise<void> {
    // In a real application, you'd use a queue like Bull/BullMQ
    // For now, process immediately in background
    setImmediate(() => {
      this.processPhoto(job).catch(error => {
        console.error('Background photo processing failed:', error);
      });
    });
  }
}

export const photoProcessorService = new PhotoProcessorService();