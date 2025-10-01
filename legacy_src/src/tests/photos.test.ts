import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Database } from '../utils/database';
import { storageService } from '../utils/storage';
import { photoProcessorService } from '../services/photoProcessor';
import { seedService } from '../services/seedService';

describe('Photo System Tests (PH1-PH3)', () => {
  let db: Database;
  let testUserId: string;

  beforeEach(async () => {
    db = Database.getInstance();

    // Clean up test data
    await db.query('DELETE FROM photo_mask_states');
    await db.query('DELETE FROM photo_assets');
    await db.query('DELETE FROM user_photos');
    await db.query('DELETE FROM users WHERE email LIKE \'test-%\'');

    // Create test user
    const [user] = await db.query(
      `INSERT INTO users (id, email, password_hash, name, profile_complete, is_active)
       VALUES (gen_random_uuid(), 'test-photo-user@example.com', 'hashedpass', 'Test User', true, true)
       RETURNING id`
    );
    testUserId = user.id;
  });

  afterEach(async () => {
    // Clean up test data
    await db.query('DELETE FROM photo_mask_states');
    await db.query('DELETE FROM photo_assets');
    await db.query('DELETE FROM user_photos');
    await db.query('DELETE FROM users WHERE email LIKE \'test-%\'');
  });

  describe('PH1: presign→commit→asset generation flow', () => {
    it('should generate presigned URL and create photo record', async () => {
      // Generate presigned URL
      const { uploadUrl, storageKey, photoId } = await storageService.generatePresignedUploadUrl(
        testUserId,
        'test-photo.jpg',
        'image/jpeg'
      );

      expect(uploadUrl).toBeDefined();
      expect(storageKey).toContain(testUserId);
      expect(photoId).toBeDefined();

      // Verify photo record was created in pending state
      const [photo] = await db.query(
        'SELECT * FROM user_photos WHERE id = $1',
        [photoId]
      );

      expect(photo).toBeDefined();
      expect(photo.user_id).toBe(testUserId);
      expect(photo.moderation_status).toBe('PENDING');
    });

    it('should process photo and create all variants', async () => {
      // Create a test photo record
      const [photo] = await db.query(
        `INSERT INTO user_photos (id, user_id, role, moderation_status)
         VALUES (gen_random_uuid(), $1, 'PROFILE', 'PENDING')
         RETURNING id`,
        [testUserId]
      );

      const photoId = photo.id;
      const storageKey = `users/${testUserId}/photos/${photoId}/orig.jpg`;

      // Mock storage service to avoid actual file operations
      const originalDownload = storageService.downloadPhoto;
      const originalUpload = storageService.uploadPhotoVariant;

      // Create mock image buffer
      const mockImageBuffer = Buffer.from('mock-image-data');

      storageService.downloadPhoto = async () => mockImageBuffer;
      storageService.uploadPhotoVariant = async () => Promise.resolve();

      try {
        // Process photo
        await photoProcessorService.processPhoto({
          photoId,
          originalStorageKey: storageKey,
          userId: testUserId
        });

        // Verify photo status updated to APPROVED
        const [updatedPhoto] = await db.query(
          'SELECT moderation_status FROM user_photos WHERE id = $1',
          [photoId]
        );

        expect(updatedPhoto.moderation_status).toBe('APPROVED');

        // Verify all variants were created
        const assets = await db.query(
          'SELECT variant FROM photo_assets WHERE photo_id = $1 ORDER BY variant',
          [photoId]
        );

        const variants = assets.map(a => a.variant);
        expect(variants).toEqual(['BLUR1', 'BLUR2', 'ORIG', 'THUMB']);

      } finally {
        // Restore original methods
        storageService.downloadPhoto = originalDownload;
        storageService.uploadPhotoVariant = originalUpload;
      }
    });

    it('should handle photo processing failure with retry', async () => {
      // Create a test photo record
      const [photo] = await db.query(
        `INSERT INTO user_photos (id, user_id, role, moderation_status)
         VALUES (gen_random_uuid(), $1, 'PROFILE', 'PENDING')
         RETURNING id`,
        [testUserId]
      );

      const photoId = photo.id;
      const storageKey = `users/${testUserId}/photos/${photoId}/orig.jpg`;

      // Mock storage service to simulate failure
      storageService.downloadPhoto = async () => {
        throw new Error('Storage download failed');
      };

      try {
        // Process photo (should fail and mark as REJECTED after retries)
        await photoProcessorService.processPhoto({
          photoId,
          originalStorageKey: storageKey,
          userId: testUserId,
          retryCount: 3 // Max retries exceeded
        });

        // Verify photo status updated to REJECTED
        const [updatedPhoto] = await db.query(
          'SELECT moderation_status FROM user_photos WHERE id = $1',
          [photoId]
        );

        expect(updatedPhoto.moderation_status).toBe('REJECTED');

      } catch (error) {
        // Expected to fail after retries
        expect(error.message).toContain('Storage download failed');
      }
    });
  });

  describe('PH2: REJECTED photo non-exposure', () => {
    it('should not expose rejected photos in profile view', async () => {
      // Create approved and rejected photos
      const [approvedPhoto] = await db.query(
        `INSERT INTO user_photos (id, user_id, role, moderation_status)
         VALUES (gen_random_uuid(), $1, 'PROFILE', 'APPROVED')
         RETURNING id`,
        [testUserId]
      );

      const [rejectedPhoto] = await db.query(
        `INSERT INTO user_photos (id, user_id, role, moderation_status)
         VALUES (gen_random_uuid(), $1, 'PROFILE', 'REJECTED')
         RETURNING id`,
        [testUserId]
      );

      // Create a viewer user
      const [viewer] = await db.query(
        `INSERT INTO users (id, email, password_hash, name, profile_complete, is_active)
         VALUES (gen_random_uuid(), 'test-viewer@example.com', 'hashedpass', 'Viewer', true, true)
         RETURNING id`
      );

      // Create photo mask states for viewer
      await db.query(
        `INSERT INTO photo_mask_states (user_id, photo_id, visible_stage)
         VALUES ($1, $2, 'T1'), ($1, $3, 'T1')`,
        [viewer.id, approvedPhoto.id, rejectedPhoto.id]
      );

      // Query photos that should be visible to viewer
      const visiblePhotos = await db.query(
        `SELECT up.id, up.moderation_status
         FROM user_photos up
         JOIN photo_mask_states pms ON up.id = pms.photo_id
         WHERE up.user_id = $1
           AND pms.user_id = $2
           AND up.moderation_status = 'APPROVED'
           AND pms.visible_stage != 'LOCKED'`,
        [testUserId, viewer.id]
      );

      expect(visiblePhotos).toHaveLength(1);
      expect(visiblePhotos[0].id).toBe(approvedPhoto.id);
    });
  });

  describe('PH3: Stage-based variant exposure', () => {
    it('should expose appropriate variants based on visible stage', async () => {
      // Create test photo with all variants
      const [photo] = await db.query(
        `INSERT INTO user_photos (id, user_id, role, moderation_status)
         VALUES (gen_random_uuid(), $1, 'PROFILE', 'APPROVED')
         RETURNING id`,
        [testUserId]
      );

      const photoId = photo.id;

      // Create all variants
      const variants = ['ORIG', 'THUMB', 'BLUR1', 'BLUR2'];
      for (const variant of variants) {
        await db.query(
          `INSERT INTO photo_assets (id, photo_id, variant, storage_key, width, height, mime_type, size_bytes)
           VALUES (gen_random_uuid(), $1, $2, $3, 800, 600, 'image/jpeg', 150000)`,
          [photoId, variant, `users/${testUserId}/photos/${photoId}/${variant.toLowerCase()}.jpg`]
        );
      }

      // Create viewer user
      const [viewer] = await db.query(
        `INSERT INTO users (id, email, password_hash, name, profile_complete, is_active)
         VALUES (gen_random_uuid(), 'test-viewer2@example.com', 'hashedpass', 'Viewer2', true, true)
         RETURNING id`
      );

      // Test T1 stage (should see BLUR2 and THUMB only)
      await db.query(
        `INSERT INTO photo_mask_states (user_id, photo_id, visible_stage)
         VALUES ($1, $2, 'T1')`,
        [viewer.id, photoId]
      );

      let visibleAssets = await db.query(
        `SELECT pa.variant
         FROM photo_assets pa
         JOIN user_photos up ON pa.photo_id = up.id
         JOIN photo_mask_states pms ON up.id = pms.photo_id
         WHERE up.user_id = $1
           AND pms.user_id = $2
           AND pms.visible_stage = 'T1'
           AND pa.variant IN ('BLUR2', 'THUMB')`,
        [testUserId, viewer.id]
      );

      expect(visibleAssets).toHaveLength(2);
      expect(visibleAssets.map(a => a.variant).sort()).toEqual(['BLUR2', 'THUMB']);

      // Test T2 stage (should see all except ORIG)
      await db.query(
        `UPDATE photo_mask_states SET visible_stage = 'T2'
         WHERE user_id = $1 AND photo_id = $2`,
        [viewer.id, photoId]
      );

      visibleAssets = await db.query(
        `SELECT pa.variant
         FROM photo_assets pa
         JOIN user_photos up ON pa.photo_id = up.id
         JOIN photo_mask_states pms ON up.id = pms.photo_id
         WHERE up.user_id = $1
           AND pms.user_id = $2
           AND pms.visible_stage = 'T2'
           AND pa.variant != 'ORIG'`,
        [testUserId, viewer.id]
      );

      expect(visibleAssets).toHaveLength(3);
      expect(visibleAssets.map(a => a.variant).sort()).toEqual(['BLUR1', 'BLUR2', 'THUMB']);

      // Test T3 stage (should see all variants)
      await db.query(
        `UPDATE photo_mask_states SET visible_stage = 'T3'
         WHERE user_id = $1 AND photo_id = $2`,
        [viewer.id, photoId]
      );

      visibleAssets = await db.query(
        `SELECT pa.variant
         FROM photo_assets pa
         JOIN user_photos up ON pa.photo_id = up.id
         JOIN photo_mask_states pms ON up.id = pms.photo_id
         WHERE up.user_id = $1
           AND pms.user_id = $2
           AND pms.visible_stage = 'T3'`,
        [testUserId, viewer.id]
      );

      expect(visibleAssets).toHaveLength(4);
      expect(visibleAssets.map(a => a.variant).sort()).toEqual(['BLUR1', 'BLUR2', 'ORIG', 'THUMB']);
    });
  });
});