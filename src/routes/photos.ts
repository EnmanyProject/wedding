import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { Database } from '../utils/database';
import { storageService } from '../utils/storage';
import { photoProcessorService } from '../services/photoProcessor';
import { v4 as uuidv4 } from 'uuid';
import {
  PhotoPresignRequest,
  PhotoPresignResponse,
  PhotoCommitRequest,
  PhotoCommitResponse,
  UserPhotoList,
  ProfilePhotosResponse,
  ApiResponse
} from '../types/api';
import { config } from '../utils/config';

const router = Router();
const db = Database.getInstance();

// Validation schemas
const presignSchema = z.object({
  filename: z.string().min(1).max(255),
  content_type: z.string().regex(/^image\/(jpeg|jpg|png|webp)$/),
  role: z.enum(['PROFILE', 'QUIZ', 'OTHER']).optional().default('PROFILE')
});

const commitSchema = z.object({
  photo_id: z.string().uuid(),
  exif_meta: z.record(z.any()).optional()
});

/**
 * POST /me/photos/presign
 * Generate presigned URL for photo upload
 */
router.post('/me/photos/presign', authenticateToken, asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const body = presignSchema.parse(req.body) as PhotoPresignRequest;
  const userId = req.userId!;

  // Check user's photo count limit (max 10 photos)
  const [photoCount] = await db.query(
    'SELECT COUNT(*) as count FROM user_photos WHERE user_id = $1',
    [userId]
  );

  if (photoCount.count >= 10) {
    throw createError('Maximum photo limit reached (10 photos)', 400, 'PHOTO_LIMIT_EXCEEDED');
  }

  // Generate presigned URL
  const { uploadUrl, storageKey, photoId } = await storageService.generatePresignedUploadUrl(
    userId,
    body.filename,
    body.content_type
  );

  // Create pending photo record
  await db.query(
    `INSERT INTO user_photos (id, user_id, role, order_idx, is_safe, moderation_status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
    [photoId, userId, body.role, 0, true, 'PENDING']
  );

  const response: ApiResponse<PhotoPresignResponse> = {
    success: true,
    data: {
      upload_url: uploadUrl,
      photo_id: photoId,
      storage_key: storageKey,
      expires_in: 300
    },
    timestamp: new Date().toISOString()
  };

  res.json(response);
}));

/**
 * POST /me/photos/upload
 * Direct file upload for local storage (replaces presigned URL flow)
 */
router.post('/me/photos/upload', authenticateToken, asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const userId = req.userId!;

  // Check user's photo count limit (max 10 photos)
  const [photoCount] = await db.query(
    'SELECT COUNT(*) as count FROM user_photos WHERE user_id = $1',
    [userId]
  );

  if (photoCount.count >= 10) {
    throw createError('Maximum photo limit reached (10 photos)', 400, 'PHOTO_LIMIT_EXCEEDED');
  }

  // Get file from request body (raw buffer)
  const fileBuffer = req.body as Buffer;

  if (!fileBuffer || fileBuffer.length === 0) {
    throw createError('No file data provided', 400, 'NO_FILE_DATA');
  }

  // Get metadata from headers
  const filename = req.headers['x-filename'] as string || 'photo.jpg';
  const contentType = req.headers['content-type'] as string || 'image/jpeg';
  const role = (req.headers['x-photo-role'] as string || 'PROFILE') as 'PROFILE' | 'QUIZ' | 'OTHER';

  // Validate content type
  if (!contentType.match(/^image\/(jpeg|jpg|png|webp)$/)) {
    throw createError('Invalid content type. Only JPEG, PNG, and WebP images are allowed', 400, 'INVALID_CONTENT_TYPE');
  }

  // Generate photo ID
  const photoId = uuidv4();
  const extension = filename.split('.').pop() || 'jpg';
  const storageKey = `users/${userId}/photos/${photoId}/orig.${extension}`;

  // Save file to local storage
  await storageService.uploadPhotoVariant(storageKey, fileBuffer, contentType);

  // Create photo record
  await db.query(
    `INSERT INTO user_photos (id, user_id, role, order_idx, is_safe, moderation_status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
    [photoId, userId, role, 0, true, 'PENDING']
  );

  // Queue photo for processing
  await photoProcessorService.queuePhotoProcessing({
    photoId,
    originalStorageKey: storageKey,
    userId
  });

  // ✅ FIX: Update user's profile_image_url if this is a PROFILE photo
  if (role === 'PROFILE') {
    // Check if user has existing profile_image_url
    const [user] = await db.query(
      'SELECT profile_image_url FROM users WHERE id = $1',
      [userId]
    );

    // If no profile image set, set this as the profile image
    if (!user || !user.profile_image_url || user.profile_image_url.includes('/images/profiles/user')) {
      const profileImageUrl = `/uploads/${storageKey}`;
      await db.query(
        'UPDATE users SET profile_image_url = $1, updated_at = NOW() WHERE id = $2',
        [profileImageUrl, userId]
      );
      console.log(`✅ [Photos] Updated profile_image_url for user ${userId}: ${profileImageUrl}`);
    }
  }

  const response: ApiResponse<PhotoPresignResponse> = {
    success: true,
    data: {
      upload_url: '', // Not needed for direct upload
      photo_id: photoId,
      storage_key: storageKey,
      expires_in: 0
    },
    timestamp: new Date().toISOString()
  };

  res.json(response);
}));

/**
 * POST /me/photos/commit
 * Commit photo upload and start processing
 */
router.post('/me/photos/commit', authenticateToken, asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const body = commitSchema.parse(req.body) as PhotoCommitRequest;
  const userId = req.userId!;

  // Verify photo belongs to user
  const [photo] = await db.query(
    'SELECT * FROM user_photos WHERE id = $1 AND user_id = $2',
    [body.photo_id, userId]
  );

  if (!photo) {
    throw createError('사진을 찾을 수 없습니다', 404, 'PHOTO_NOT_FOUND');
  }

  if (photo.moderation_status !== 'PENDING') {
    throw createError('Photo already committed', 400, 'PHOTO_ALREADY_COMMITTED');
  }

  // Update photo with metadata
  const [updatedPhoto] = await db.query(
    `UPDATE user_photos
     SET exif_meta = $1, updated_at = NOW()
     WHERE id = $2 AND user_id = $3
     RETURNING *`,
    [body.exif_meta ? JSON.stringify(body.exif_meta) : null, body.photo_id, userId]
  );

  // Get storage key for processing
  const [asset] = await db.query(
    'SELECT storage_key FROM photo_assets WHERE photo_id = $1 AND variant = $2',
    [body.photo_id, 'ORIG']
  );

  let processingStarted = false;
  if (!asset) {
    // Derive storage key from photo ID (this should match the presigned URL)
    const extension = 'jpg'; // Default extension
    const storageKey = `users/${userId}/photos/${body.photo_id}/orig.${extension}`;

    // Queue photo for processing
    await photoProcessorService.queuePhotoProcessing({
      photoId: body.photo_id,
      originalStorageKey: storageKey,
      userId: userId
    });

    processingStarted = true;
  }

  const response: ApiResponse<PhotoCommitResponse> = {
    success: true,
    data: {
      photo: updatedPhoto,
      processing_started: processingStarted
    },
    timestamp: new Date().toISOString()
  };

  res.json(response);
}));

/**
 * GET /me/photos
 * Get current user's photos
 */
router.get('/me/photos', authenticateToken, asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const userId = req.userId!;

  const photos = await db.query(
    `SELECT
       up.*,
       json_agg(
         json_build_object(
           'id', pa.id,
           'variant', pa.variant,
           'storage_key', pa.storage_key,
           'width', pa.width,
           'height', pa.height,
           'mime_type', pa.mime_type,
           'size_bytes', pa.size_bytes
         ) ORDER BY pa.variant
       ) as assets
     FROM user_photos up
     LEFT JOIN photo_assets pa ON up.id = pa.photo_id
     WHERE up.user_id = $1
     GROUP BY up.id
     ORDER BY up.order_idx, up.created_at`,
    [userId]
  );

  // Generate download URLs for assets
  for (const photo of photos) {
    if (photo.assets && photo.assets[0]) {
      for (const asset of photo.assets) {
        if (asset.storage_key) {
          asset.url = await storageService.generatePresignedDownloadUrl(asset.storage_key);
        }
      }
    }
  }

  const response: ApiResponse<UserPhotoList> = {
    success: true,
    data: {
      photos: photos,
      total: photos.length
    },
    timestamp: new Date().toISOString()
  };

  res.json(response);
}));

/**
 * GET /profile/:targetId/photos
 * Get target user's photos based on affinity/visibility
 */
router.get('/profile/:targetId/photos', authenticateToken, asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const userId = req.userId!;
  const targetId = req.params.targetId;

  if (userId === targetId) {
    throw createError('Cannot view own profile through this endpoint', 400, 'SELF_PROFILE_ACCESS');
  }

  // Get affinity score
  const [affinity] = await db.query(
    'SELECT score FROM affinity WHERE viewer_id = $1 AND target_id = $2',
    [userId, targetId]
  );

  const affinityScore = affinity?.score || 0;

  // Get photos with visibility filtering
  const photos = await db.query(
    `SELECT
       up.id,
       up.role,
       up.order_idx,
       pms.visible_stage,
       json_agg(
         json_build_object(
           'variant', pa.variant,
           'width', pa.width,
           'height', pa.height,
           'storage_key', pa.storage_key
         ) ORDER BY pa.variant
       ) as assets
     FROM user_photos up
     JOIN photo_mask_states pms ON up.id = pms.photo_id
     LEFT JOIN photo_assets pa ON up.id = pa.photo_id
     WHERE up.user_id = $1
       AND pms.user_id = $2
       AND up.moderation_status = 'APPROVED'
       AND pms.visible_stage != 'LOCKED'
     GROUP BY up.id, up.role, up.order_idx, pms.visible_stage
     ORDER BY up.order_idx`,
    [targetId, userId]
  );

  // Apply visibility rules and generate URLs
  for (const photo of photos) {
    const visibleVariants = [];

    for (const asset of photo.assets) {
      let shouldInclude = false;
      let variantToUse = asset.variant;

      // Determine which variant to show based on visible stage
      switch (photo.visible_stage) {
        case 'T3':
          shouldInclude = true; // Show all variants, user chooses
          break;
        case 'T2':
          shouldInclude = asset.variant !== 'ORIG'; // Hide original
          if (asset.variant === 'ORIG') variantToUse = 'BLUR1';
          break;
        case 'T1':
          shouldInclude = asset.variant === 'BLUR2' || asset.variant === 'THUMB';
          if (asset.variant === 'ORIG' || asset.variant === 'BLUR1') variantToUse = 'BLUR2';
          break;
      }

      if (shouldInclude) {
        const url = await storageService.generatePresignedDownloadUrl(asset.storage_key);
        visibleVariants.push({
          variant: variantToUse,
          url,
          width: asset.width,
          height: asset.height
        });
      }
    }

    photo.assets = visibleVariants;
  }

  const response: ApiResponse<ProfilePhotosResponse> = {
    success: true,
    data: {
      photos,
      visible_stage: photos.length > 0 ? photos[0].visible_stage : 'LOCKED',
      affinity_score: affinityScore
    },
    timestamp: new Date().toISOString()
  };

  res.json(response);
}));

/**
 * DELETE /me/photos/:photoId
 * Delete user's photo
 */
router.delete('/me/photos/:photoId', authenticateToken, asyncHandler(async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const userId = req.userId!;
  const photoId = req.params.photoId;

  // Get photo and its assets
  const [photo] = await db.query(
    'SELECT * FROM user_photos WHERE id = $1 AND user_id = $2',
    [photoId, userId]
  );

  if (!photo) {
    throw createError('사진을 찾을 수 없습니다', 404, 'PHOTO_NOT_FOUND');
  }

  const assets = await db.query(
    'SELECT storage_key FROM photo_assets WHERE photo_id = $1',
    [photoId]
  );

  // Delete from storage
  if (assets.length > 0) {
    const storageKeys = assets.map((asset: any) => asset.storage_key);
    await storageService.deletePhoto(storageKeys);
  }

  // Delete from database (cascades to photo_assets and photo_mask_states)
  await db.query('DELETE FROM user_photos WHERE id = $1', [photoId]);

  const response: ApiResponse = {
    success: true,
    timestamp: new Date().toISOString()
  };

  res.json(response);
}));

export default router;