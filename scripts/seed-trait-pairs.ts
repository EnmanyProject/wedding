/**
 * Trait Pairs 생성 스크립트
 */

import { pool } from '../src/utils/database';
import { v4 as uuidv4 } from 'uuid';

async function seedTraitPairs() {
  const client = await pool.connect();

  try {
    console.log('🚀 Trait Pairs 생성 시작...\n');

    const traitPairs = [
      { key: 'communication_style', left: '많은 대화', right: '조용한 시간', category: 'communication' },
      { key: 'date_preference', left: '야외 활동', right: '실내 활동', category: 'lifestyle' },
      { key: 'food_style', left: '한식', right: '양식', category: 'food' },
      { key: 'weekend_style', left: '활동적인', right: '휴식', category: 'lifestyle' },
      { key: 'social_energy', left: '외향적', right: '내향적', category: 'personality' },
      { key: 'planning_style', left: '계획적', right: '즉흥적', category: 'personality' },
      { key: 'decision_making', left: '신중한', right: '빠른', category: 'personality' },
      { key: 'living_space', left: '깔끔한', right: '편안한', category: 'lifestyle' },
      { key: 'fashion_style', left: '클래식', right: '트렌디', category: 'style' },
      { key: 'travel_style', left: '계획 여행', right: '배낭 여행', category: 'lifestyle' },
      { key: 'career_priority', left: '일 우선', right: '균형', category: 'values' },
      { key: 'financial_style', left: '저축', right: '소비', category: 'values' },
      { key: 'hobby_type', left: '창작', right: '감상', category: 'interests' },
      { key: 'exercise_type', left: '개인 운동', right: '팀 스포츠', category: 'lifestyle' },
      { key: 'conflict_style', left: '직접 대화', right: '시간 두고', category: 'communication' },
      { key: 'gift_preference', left: '실용적', right: '로맨틱', category: 'love_language' },
      { key: 'family_time', left: '자주', right: '가끔', category: 'family' },
      { key: 'future_planning', left: '구체적', right: '유연한', category: 'values' },
      { key: 'learning_style', left: '독서', right: '체험', category: 'interests' },
      { key: 'pet_preference', left: '강아지', right: '고양이', category: 'lifestyle' }
    ];

    let successCount = 0;
    let skipCount = 0;

    for (const pair of traitPairs) {
      try {
        // 중복 체크
        const existingResult = await client.query(
          `SELECT id FROM trait_pairs WHERE key = $1`,
          [pair.key]
        );

        if (existingResult.rows.length > 0) {
          console.log(`⏭️  [${successCount + skipCount + 1}/20] ${pair.key} - 이미 존재함`);
          skipCount++;
          continue;
        }

        const pairId = uuidv4();

        // trait_pairs 생성
        await client.query(
          `INSERT INTO trait_pairs (id, key, left_label, right_label, category, weight, entropy, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
          [pairId, pair.key, pair.left, pair.right, pair.category, 1.0, 0.5, true]
        );

        // trait_visuals 생성
        await client.query(
          `INSERT INTO trait_visuals (id, pair_id, left_asset_id, right_asset_id, left_description, right_description, is_default, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
          [uuidv4(), pairId, `asset_${pair.key}_left`, `asset_${pair.key}_right`, pair.left, pair.right, true]
        );

        successCount++;
        console.log(`✅ [${successCount + skipCount}/20] ${pair.key} (${pair.left} / ${pair.right})`);

      } catch (error) {
        console.error(`❌ [${successCount + skipCount + 1}] ${pair.key} 생성 실패:`, error instanceof Error ? error.message : error);
      }
    }

    console.log('\n🎉 완료!');
    console.log(`✅ 생성: ${successCount}개`);
    console.log(`⏭️  스킵: ${skipCount}개`);

  } catch (error) {
    console.error('❌ 스크립트 실행 중 오류:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// 스크립트 실행
seedTraitPairs();
