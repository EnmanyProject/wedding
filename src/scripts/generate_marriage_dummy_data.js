const { Client } = require('pg');

const dbClient = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/wedding_app'
});

// Sample data for Korean marriage agency profiles
const koreanNames = {
  male: ['민수', '준호', '상우', '동현', '지훈', '성민', '현우', '태훈', '원석', '승현'],
  female: ['민지', '수진', '예진', '지혜', '하영', '서연', '유진', '다영', '소영', '은지']
};

const koreanCities = ['서울시', '부산시', '대구시', '인천시', '대전시', '광주시', '울산시', '세종시'];
const koreanDistricts = ['강남구', '서초구', '송파구', '중구', '종로구', '마포구', '용산구', '영등포구'];

const occupations = [
  '소프트웨어 엔지니어', '의사', '변호사', '교사', '공무원', '회계사', '디자이너', '마케터',
  '간호사', '약사', '건축가', '금융전문가', '컨설턴트', '연구원', '의료기사', '항공승무원'
];

const companies = [
  '삼성전자', 'SK하이닉스', 'LG전자', '현대자동차', '기아', '포스코', 'KB국민은행',
  '신한은행', 'LG화학', 'NAVER', '카카오', '쿠팡', '배달의민족', '토스', '네이버웹툰', 'NCsoft'
];

const universities = [
  '서울대학교', '연세대학교', '고려대학교', 'KAIST', 'POSTECH', '성균관대학교', '한양대학교',
  '중앙대학교', '경희대학교', '서강대학교', '이화여자대학교', '숙명여자대학교'
];

const hobbies = [
  '영화감상', '독서', '요리', '등산', '헬스', '요가', '피아노', '기타', '여행', '사진촬영',
  '골프', '테니스', '수영', '볼링', '보드게임', '드라마시청', '카페투어', '맛집탐방'
];

const bloodTypes = ['A', 'B', 'AB', 'O'];
const zodiacSigns = ['양자리', '황소자리', '쌍둥이자리', '게자리', '사자자리', '처녀자리', '천칭자리', '전갈자리', '궁수자리', '염소자리', '물병자리', '물고기자리'];

function getRandomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomChoices(arr, count) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function generateMarriageDummyData() {
  console.log('🎭 결혼 더미 데이터 생성 시작...');

  await dbClient.connect();

  // Get all existing users
  const users = await dbClient.query('SELECT id, name FROM users ORDER BY created_at DESC LIMIT 20');
  console.log(`👥 ${users.rows.length}명의 사용자 발견`);

  if (users.rows.length === 0) {
    console.log('❌ 사용자가 없습니다. 먼저 사용자를 생성해주세요.');
    return;
  }

  let profilesCreated = 0;

  for (const user of users.rows) {
    const userId = user.id;
    console.log(`\n🔨 ${user.name} (${userId}) 프로필 생성 중...`);

    try {
      // 1. Basic Profile
      const age = getRandomNumber(25, 40);
      const height = getRandomNumber(155, 185);
      const weight = getRandomNumber(50, 85);

      await dbClient.query(`
        INSERT INTO user_basic_profiles
        (user_id, age, height, weight, blood_type, zodiac_sign,
         residence_city, residence_district, hometown_city, hometown_district,
         body_type, personality_type, introduction)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        userId, age, height, weight,
        getRandomChoice(bloodTypes),
        getRandomChoice(zodiacSigns),
        getRandomChoice(koreanCities),
        getRandomChoice(koreanDistricts),
        getRandomChoice(koreanCities),
        getRandomChoice(koreanDistricts),
        getRandomChoice(['슬림', '보통', '운동형', '통통한']),
        getRandomChoice(['ISFP', 'ENFP', 'INTJ', 'ESFJ', 'INFP', 'ENTJ']),
        `안녕하세요! ${age}살 ${getRandomChoice(occupations)}입니다. 진실한 만남을 찾고 있어요.`
      ]);

      // 2. Economic Profile
      const annualIncome = getRandomNumber(3000, 15000) * 10000; // 3천만 ~ 1억5천만원
      const realEstate = ['아파트 1채', '오피스텔 1채'];

      await dbClient.query(`
        INSERT INTO user_economic_profiles
        (user_id, occupation, company_name, company_size, position, years_of_experience,
         annual_income, income_level, real_estate_owned, real_estate_value,
         savings_amount, car_owned, financial_stability)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        userId,
        getRandomChoice(occupations),
        getRandomChoice(companies),
        getRandomChoice(['대기업', '중견기업', '공기업', '외국계']),
        getRandomChoice(['사원', '대리', '과장', '차장', '부장']),
        getRandomNumber(2, 15),
        annualIncome,
        annualIncome >= 80000000 ? 'high' : annualIncome >= 50000000 ? 'middle' : 'low',
        realEstate,
        getRandomNumber(300000000, 800000000), // 3억 ~ 8억
        getRandomNumber(50000000, 300000000), // 5천만 ~ 3억
        getRandomChoice(['아반떼', '소나타', 'K5', '그랜저', 'BMW 3시리즈', '벤츠 C클래스', 'null']),
        getRandomChoice(['stable', 'excellent'])
      ]);

      // 3. Family Profile
      await dbClient.query(`
        INSERT INTO user_family_profiles
        (user_id, father_alive, father_age, father_occupation, mother_alive, mother_age, mother_occupation,
         siblings_count, birth_order, family_income_level, family_social_status,
         family_religion, family_support_level)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        userId,
        getRandomNumber(0, 1) === 1,
        getRandomNumber(55, 75),
        getRandomChoice(['사업가', '공무원', '교사', '의사', '회계사', '은퇴']),
        getRandomNumber(0, 1) === 1,
        getRandomNumber(50, 70),
        getRandomChoice(['주부', '교사', '간호사', '공무원', '사업가']),
        getRandomNumber(0, 3),
        getRandomNumber(1, 2),
        getRandomChoice(['middle', 'high']),
        getRandomChoice(['중상층', '중산층']),
        getRandomChoice(['기독교', '천주교', '불교', '무종교']),
        getRandomChoice(['supportive', 'neutral'])
      ]);

      // 4. Marriage History
      const marriageStatus = getRandomChoice(['single', 'divorced']);
      await dbClient.query(`
        INSERT INTO user_marriage_history
        (user_id, marriage_status, previous_marriages_count, has_children, children_count,
         wants_children, desired_children_count, marriage_timeline)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        userId,
        marriageStatus,
        marriageStatus === 'divorced' ? getRandomNumber(1, 2) : 0,
        marriageStatus === 'divorced' ? getRandomNumber(0, 1) === 1 : false,
        marriageStatus === 'divorced' ? getRandomNumber(0, 2) : 0,
        getRandomNumber(0, 1) === 1,
        getRandomNumber(1, 3),
        getRandomChoice(['within_1year', 'within_2years', 'within_3years'])
      ]);

      // 5. Education Profile
      await dbClient.query(`
        INSERT INTO user_education_profiles
        (user_id, highest_education, university_name, university_ranking, major,
         graduation_year, language_skills, certifications, career_stability, career_ambition_level)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        userId,
        getRandomChoice(['bachelor', 'master', 'doctorate']),
        getRandomChoice(universities),
        getRandomChoice(['SKY', 'in-seoul', 'local']),
        getRandomChoice(['경영학', '공학', '의학', '법학', '교육학', '컴퓨터공학', '경제학']),
        getRandomNumber(2005, 2020),
        JSON.stringify({
          english: getRandomChoice(['basic', 'intermediate', 'fluent']),
          chinese: getRandomChoice(['none', 'basic', 'intermediate'])
        }),
        getRandomChoices(['토익 900+', 'OPIC IM', '컴활 1급', '정보처리기사', 'PMP'], 2),
        getRandomChoice(['stable', 'excellent']),
        getRandomChoice(['moderate', 'high'])
      ]);

      // 6. Lifestyle Profile
      await dbClient.query(`
        INSERT INTO user_lifestyle_profiles
        (user_id, lifestyle_type, hobbies, interests, exercise_habits, diet_type,
         social_circle_size, travel_frequency, smoking_status, drinking_frequency,
         religion, religious_devotion)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        userId,
        getRandomChoice(['active', 'social', 'intellectual', 'quiet']),
        getRandomChoices(hobbies, 4),
        getRandomChoices(['영화', '음악', '독서', '여행', '요리', '스포츠', '게임'], 3),
        getRandomChoice(['헬스 주3회', '요가 주2회', '등산 월2회', '거의 안함']),
        getRandomChoice(['일반식', '다이어트식', '비건']),
        getRandomChoice(['small', 'medium', 'large']),
        getRandomChoice(['월1회', '분기1회', '년2회']),
        getRandomChoice(['never', 'former', 'social']),
        getRandomChoice(['social', 'rarely', 'never']),
        getRandomChoice(['기독교', '천주교', '불교', '무종교']),
        getRandomChoice(['not_religious', 'casual', 'devout'])
      ]);

      // 7. Health Profile
      await dbClient.query(`
        INSERT INTO user_health_profiles
        (user_id, overall_health, chronic_conditions, fertility_status,
         exercise_frequency, fitness_level)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        userId,
        getRandomChoice(['excellent', 'good', 'fair']),
        getRandomNumber(0, 1) === 1 ? ['고혈압'] : [],
        getRandomChoice(['정상', '검사필요']),
        getRandomChoice(['주3회', '주2회', '월2회']),
        getRandomChoice(['excellent', 'good', 'average'])
      ]);

      // 8. Verification Profile
      await dbClient.query(`
        INSERT INTO user_verifications
        (user_id, identity_verified, income_verified, education_verified,
         employment_verified, overall_verification_score, verification_level)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        userId,
        getRandomNumber(0, 1) === 1,
        getRandomNumber(0, 1) === 1,
        getRandomNumber(0, 1) === 1,
        getRandomNumber(0, 1) === 1,
        getRandomNumber(60, 95),
        getRandomChoice(['standard', 'premium'])
      ]);

      profilesCreated++;
      console.log(`✅ ${user.name} 프로필 생성 완료`);

    } catch (error) {
      console.error(`❌ ${user.name} 프로필 생성 실패:`, error.message);
    }
  }

  console.log(`\n🎉 ${profilesCreated}개의 결혼 프로필이 생성되었습니다!`);

  // Generate some milestone data based on existing affinity scores
  const affinityData = await dbClient.query(`
    SELECT viewer_id, target_id, score
    FROM affinity
    WHERE score > 0
    ORDER BY score DESC
    LIMIT 50
  `);

  console.log(`\n🏆 ${affinityData.rows.length}개의 호감도 기록 발견, 마일스톤 생성 중...`);

  for (const affinity of affinityData.rows) {
    const { viewer_id, target_id, score } = affinity;

    const t1Unlocked = score >= 10;
    const t2Unlocked = score >= 50;
    const t3Unlocked = score >= 100;

    await dbClient.query(`
      INSERT INTO user_disclosure_milestones
      (user_id, target_user_id, current_affinity_score, t1_unlocked, t1_unlocked_at,
       t2_unlocked, t2_unlocked_at, t3_unlocked, t3_unlocked_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (user_id, target_user_id) DO NOTHING
    `, [
      viewer_id, target_id, score,
      t1Unlocked, t1Unlocked ? new Date() : null,
      t2Unlocked, t2Unlocked ? new Date() : null,
      t3Unlocked, t3Unlocked ? new Date() : null
    ]);
  }

  console.log(`✅ 마일스톤 데이터 생성 완료`);

  await dbClient.end();
  console.log('\n🎭 결혼 더미 데이터 생성 완료!');
}

// Execute if run directly
if (require.main === module) {
  generateMarriageDummyData().catch(console.error);
}

module.exports = { generateMarriageDummyData };