/**
 * 100명의 여성 사용자 생성 및 프로필 이미지 할당 스크립트
 */

import { pool } from '../src/utils/database';

const PROFILE_IMAGES = [
  '/images/profiles/user1.jpg',
  '/images/profiles/user2.png',
  '/images/profiles/user3.jpg',
  '/images/profiles/user4.png',
  '/images/profiles/user5.jpg',
  '/images/profiles/user6.png',
  '/images/profiles/user7.jpg',
  '/images/profiles/user8.jpg',
  '/images/profiles/user9.jpg',
  '/images/profiles/user10.jpg'
];

const KOREAN_FEMALE_NAMES = [
  '지우', '서연', '민지', '수빈', '하은', '예은', '지민', '소율', '하윤', '채원',
  '수아', '지유', '다은', '은서', '시은', '하린', '유나', '윤서', '채은', '서윤',
  '가은', '나연', '다인', '라희', '마음', '바다', '사랑', '아름', '자연', '차민',
  '현서', '유진', '소연', '미주', '은채', '하늘', '보람', '슬기', '혜인', '정은',
  '미연', '승희', '지혜', '은지', '수정', '민경', '지선', '예린', '하영', '수현',
  '윤아', '태희', '혜리', '선미', '나은', '유빈', '소희', '다현', '예나', '채린',
  '민아', '서진', '유리', '하나', '보영', '지영', '수민', '예원', '다영', '서아',
  '민서', '유경', '지연', '수연', '예지', '하연', '채영', '서영', '민영', '유미',
  '지은', '수지', '예슬', '하빈', '채윤', '서현', '민하', '유정', '지원', '수진',
  '예진', '하율', '채이', '서우', '민지', '유주', '지안', '수아', '예림', '하진'
];

const REGIONS = [
  '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종',
  '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'
];

async function seed100Women() {
  const client = await pool.connect();

  try {
    console.log('🚀 100명의 여성 사용자 생성 시작...\n');

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < 100; i++) {
      try {
        const name = KOREAN_FEMALE_NAMES[i];
        const email = `${name}${i + 1}@wedding.app`;
        const age = 20 + Math.floor(Math.random() * 20); // 20-39세
        const region = REGIONS[Math.floor(Math.random() * REGIONS.length)];
        const profileImage = PROFILE_IMAGES[i % PROFILE_IMAGES.length]; // 10개 이미지 순환

        // 비밀번호 해시 (간단하게 고정값 사용)
        const passwordHash = '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890'; // 실제로는 bcrypt 사용

        // 사용자 생성
        const userResult = await client.query(
          `INSERT INTO users (email, password_hash, name, age, gender, location, profile_complete, is_active)
           VALUES ($1, $2, $3, $4, 'female', $5, true, true)
           ON CONFLICT (email) DO UPDATE
           SET name = EXCLUDED.name, age = EXCLUDED.age, location = EXCLUDED.location
           RETURNING id`,
          [email, passwordHash, name, age, region]
        );

        const userId = userResult.rows[0].id;

        // user_photos 테이블에 프로필 사진 레코드 생성
        const photoResult = await client.query(
          `INSERT INTO user_photos (user_id, role, order_idx, is_safe, moderation_status)
           VALUES ($1, 'PROFILE', 0, true, 'APPROVED')
           RETURNING id`,
          [userId]
        );

        const photoId = photoResult.rows[0].id;

        // photo_assets 테이블에 이미지 정보 저장 (ORIG 변형)
        await client.query(
          `INSERT INTO photo_assets (photo_id, variant, storage_key, width, height, mime_type)
           VALUES ($1, 'ORIG', $2, 500, 500, $3)
           ON CONFLICT DO NOTHING`,
          [photoId, profileImage, profileImage.endsWith('.png') ? 'image/png' : 'image/jpeg']
        );

        // Ring 잔액 초기화 (테이블이 있는 경우만)
        try {
          await client.query(
            `INSERT INTO user_ring_balance (user_id, balance)
             VALUES ($1, 100)
             ON CONFLICT (user_id) DO NOTHING`,
            [userId]
          );
        } catch (ringError) {
          // Ring 테이블이 없으면 무시 (마이그레이션 전)
        }

        successCount++;
        console.log(`✅ [${successCount}/100] ${name} (${email}) - ${profileImage}`);

      } catch (error) {
        errorCount++;
        console.error(`❌ [${i + 1}] 생성 실패:`, error instanceof Error ? error.message : error);
      }
    }

    console.log('\n🎉 완료!');
    console.log(`✅ 성공: ${successCount}명`);
    console.log(`❌ 실패: ${errorCount}명`);

  } catch (error) {
    console.error('❌ 스크립트 실행 중 오류:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// 스크립트 실행
seed100Women();
