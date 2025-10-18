import { db } from '../utils/database';
import { storageService } from '../utils/storage';
import { ringService } from './ringService';
import { v4 as uuidv4 } from 'uuid';

/**
 * 전당포 서비스 응답 타입
 */
export interface PawnPhotoResult {
  success: boolean;
  photoId: number;
  storageKey: string;
  ringsEarned: number;
  message: string;
}

export interface PawnInfoResult {
  success: boolean;
  infoId: number;
  ringsEarned: number;
  message: string;
}

/**
 * Ring 가격 설정
 */
const RING_PRICES = {
  PHOTO: 50,          // 사진 맡기기
  IDEAL_TYPE: 50,     // 이상형 정보
  JOB: 30,            // 직업 정보
  HOBBY: 20,          // 취미 정보
};

/**
 * 전당포 서비스
 * Phase 1: 사진/정보 맡기기 기능
 */
export class PawnshopService {

  /**
   * 사진 맡기기
   *
   * @param userId - 사용자 ID
   * @param file - 업로드할 사진 파일 Buffer
   * @param photoType - 사진 타입 (face, body, hobby, lifestyle)
   * @param mimeType - MIME 타입
   * @param fileSize - 파일 크기
   * @returns 사진 맡기기 결과
   */
  async pawnPhoto(
    userId: string,
    file: Buffer,
    photoType: string,
    mimeType: string,
    fileSize: number
  ): Promise<PawnPhotoResult> {

    // 트랜잭션 시작
    return await db.transaction(async (client) => {
      try {
        // 1. 기존 사진이 있는지 확인 (사진 타입당 1개만 허용)
        const existingPhoto = await client.query(
          `SELECT id FROM pawnshop_photos
           WHERE user_id = $1 AND photo_type = $2 AND is_active = true`,
          [userId, photoType]
        );

        if (existingPhoto.rows.length > 0) {
          throw new Error(`이미 ${photoType} 타입의 사진을 맡기셨습니다. 삭제 후 다시 맡겨주세요.`);
        }

        // 2. Storage에 파일 업로드
        const photoId = uuidv4();
        const extension = mimeType.split('/')[1] || 'jpg';
        const storageKey = `pawnshop/users/${userId}/photos/${photoId}/orig.${extension}`;

        await storageService.uploadPhotoVariant(storageKey, file, mimeType);

        // 3. Ring 지급
        const ringsEarned = RING_PRICES.PHOTO;
        const ringSuccess = await ringService.addRings(
          userId.toString(),
          ringsEarned,
          'PAWN_PHOTO',
          `사진 맡기기 (${photoType})`,
          { photo_type: photoType, storage_key: storageKey }
        );

        if (!ringSuccess) {
          throw new Error('Ring 지급에 실패했습니다.');
        }

        // 4. DB에 사진 정보 저장
        const result = await client.query(
          `INSERT INTO pawnshop_photos
           (user_id, storage_key, photo_type, file_size, mime_type, rings_earned)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [userId, storageKey, photoType, fileSize, mimeType, ringsEarned]
        );

        const pawnPhotoId = result.rows[0].id;

        // 5. 전당포 거래 내역 저장
        await client.query(
          `INSERT INTO pawnshop_transactions
           (user_id, transaction_type, amount, description, metadata)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            userId,
            'PAWN_PHOTO',
            ringsEarned,
            `사진 맡기기 (${photoType})`,
            JSON.stringify({ photo_type: photoType, photo_id: pawnPhotoId })
          ]
        );

        return {
          success: true,
          photoId: pawnPhotoId,
          storageKey,
          ringsEarned,
          message: `사진을 맡기고 ${ringsEarned}💍을 받았습니다!`
        };

      } catch (error) {
        console.error('사진 맡기기 실패:', error);
        throw error;
      }
    });
  }

  /**
   * 정보 맡기기
   *
   * @param userId - 사용자 ID
   * @param infoType - 정보 타입 (ideal_type, job, hobby)
   * @param content - 정보 내용
   * @returns 정보 맡기기 결과
   */
  async pawnInfo(
    userId: string,
    infoType: 'ideal_type' | 'job' | 'hobby',
    content: string
  ): Promise<PawnInfoResult> {

    // 트랜잭션 시작
    return await db.transaction(async (client) => {
      try {
        // 1. 기존 정보가 있는지 확인 (정보 타입당 1개만 허용)
        const existingInfo = await client.query(
          `SELECT id FROM pawnshop_info
           WHERE user_id = $1 AND info_type = $2 AND is_active = true`,
          [userId, infoType]
        );

        if (existingInfo.rows.length > 0) {
          throw new Error(`이미 ${infoType} 정보를 맡기셨습니다. 삭제 후 다시 맡겨주세요.`);
        }

        // 2. Ring 금액 결정
        let ringsEarned: number;
        let description: string;

        switch (infoType) {
          case 'ideal_type':
            ringsEarned = RING_PRICES.IDEAL_TYPE;
            description = '이상형 정보 맡기기';
            break;
          case 'job':
            ringsEarned = RING_PRICES.JOB;
            description = '직업 정보 맡기기';
            break;
          case 'hobby':
            ringsEarned = RING_PRICES.HOBBY;
            description = '취미 정보 맡기기';
            break;
          default:
            throw new Error('올바르지 않은 정보 타입입니다.');
        }

        // 3. Ring 지급
        const ringSuccess = await ringService.addRings(
          userId.toString(),
          ringsEarned,
          'PAWN_INFO',
          description,
          { info_type: infoType }
        );

        if (!ringSuccess) {
          throw new Error('Ring 지급에 실패했습니다.');
        }

        // 4. DB에 정보 저장
        const result = await client.query(
          `INSERT INTO pawnshop_info
           (user_id, info_type, content, rings_earned)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [userId, infoType, content, ringsEarned]
        );

        const pawnInfoId = result.rows[0].id;

        // 5. 전당포 거래 내역 저장
        await client.query(
          `INSERT INTO pawnshop_transactions
           (user_id, transaction_type, amount, description, metadata)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            userId,
            'PAWN_INFO',
            ringsEarned,
            description,
            JSON.stringify({ info_type: infoType, info_id: pawnInfoId })
          ]
        );

        return {
          success: true,
          infoId: pawnInfoId,
          ringsEarned,
          message: `${description}로 ${ringsEarned}💍을 받았습니다!`
        };

      } catch (error) {
        console.error('정보 맡기기 실패:', error);
        throw error;
      }
    });
  }

  /**
   * 사용자의 맡긴 사진 목록 조회
   *
   * @param userId - 사용자 ID
   * @returns 맡긴 사진 목록
   */
  async getMyPawnedPhotos(userId: string): Promise<any[]> {
    try {
      const photos = await db.query(
        `SELECT id, photo_type, rings_earned, view_count, created_at
         FROM pawnshop_photos
         WHERE user_id = $1 AND is_active = true
         ORDER BY created_at DESC`,
        [userId]
      );

      return photos;
    } catch (error) {
      console.error('맡긴 사진 목록 조회 실패:', error);
      throw new Error('맡긴 사진 목록 조회에 실패했습니다.');
    }
  }

  /**
   * 사용자의 맡긴 정보 목록 조회
   *
   * @param userId - 사용자 ID
   * @returns 맡긴 정보 목록
   */
  async getMyPawnedInfo(userId: string): Promise<any[]> {
    try {
      const info = await db.query(
        `SELECT id, info_type, content, rings_earned, view_count, created_at
         FROM pawnshop_info
         WHERE user_id = $1 AND is_active = true
         ORDER BY created_at DESC`,
        [userId]
      );

      return info;
    } catch (error) {
      console.error('맡긴 정보 목록 조회 실패:', error);
      throw new Error('맡긴 정보 목록 조회에 실패했습니다.');
    }
  }

  /**
   * 사진 삭제 (비활성화)
   *
   * @param userId - 사용자 ID
   * @param photoId - 사진 ID
   */
  async deletePawnedPhoto(userId: string, photoId: number): Promise<void> {
    try {
      const result = await db.query(
        `UPDATE pawnshop_photos
         SET is_active = false, updated_at = NOW()
         WHERE id = $1 AND user_id = $2`,
        [photoId, userId]
      );

      if (result.length === 0) {
        throw new Error('사진을 찾을 수 없거나 삭제 권한이 없습니다.');
      }
    } catch (error) {
      console.error('사진 삭제 실패:', error);
      throw error;
    }
  }

  /**
   * 정보 삭제 (비활성화)
   *
   * @param userId - 사용자 ID
   * @param infoId - 정보 ID
   */
  async deletePawnedInfo(userId: string, infoId: number): Promise<void> {
    try {
      const result = await db.query(
        `UPDATE pawnshop_info
         SET is_active = false, updated_at = NOW()
         WHERE id = $1 AND user_id = $2`,
        [infoId, userId]
      );

      if (result.length === 0) {
        throw new Error('정보를 찾을 수 없거나 삭제 권한이 없습니다.');
      }
    } catch (error) {
      console.error('정보 삭제 실패:', error);
      throw error;
    }
  }
}

export const pawnshopService = new PawnshopService();
