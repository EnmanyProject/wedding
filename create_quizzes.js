const fs = require('fs');
const path = require('path');

// 새로운 퀴즈 데이터 (기존 패턴 참조)
const newQuizzes = [
  {
    category: 'food',
    title: '뭐가 좋아?',
    description: '좋아하는 음료 선택',
    option_a_title: '커피',
    option_a_description: '향긋한 원두 커피',
    option_b_title: '차',
    option_b_description: '따뜻한 전통차'
  },
  {
    category: 'lifestyle',
    title: '언제가 좋아?',
    description: '선호하는 계절',
    option_a_title: '봄',
    option_a_description: '따뜻한 봄날',
    option_b_title: '가을',
    option_b_description: '시원한 가을날'
  },
  {
    category: 'food',
    title: '뭐 먹을래?',
    description: '간식 선택',
    option_a_title: '과자',
    option_a_description: '달콤한 과자',
    option_b_title: '견과류',
    option_b_description: '건강한 견과류'
  },
  {
    category: 'lifestyle',
    title: '어디로?',
    description: '여행지 선택',
    option_a_title: '바다',
    option_a_description: '시원한 바다',
    option_b_title: '산',
    option_b_description: '푸른 산'
  },
  {
    category: 'fashion',
    title: '어떤 색?',
    description: '좋아하는 색깔',
    option_a_title: '파란색',
    option_a_description: '시원한 파란색',
    option_b_title: '빨간색',
    option_b_description: '따뜻한 빨간색'
  },
  {
    category: 'hobby',
    title: '뭐가 좋아?',
    description: '운동 선택',
    option_a_title: '수영',
    option_a_description: '시원한 수영',
    option_b_title: '달리기',
    option_b_description: '상쾌한 달리기'
  },
  {
    category: 'hobby',
    title: '어떤 음악?',
    description: '음악 장르',
    option_a_title: '발라드',
    option_a_description: '감성적인 발라드',
    option_b_title: '댄스',
    option_b_description: '신나는 댄스음악'
  },
  {
    category: 'lifestyle',
    title: '뭐가 좋아?',
    description: '반려동물 선택',
    option_a_title: '강아지',
    option_a_description: '충성스러운 강아지',
    option_b_title: '고양이',
    option_b_description: '독립적인 고양이'
  },
  {
    category: 'food',
    title: '뭐 먹을래?',
    description: '디저트 선택',
    option_a_title: '아이스크림',
    option_a_description: '시원한 아이스크림',
    option_b_title: '빙수',
    option_b_description: '달콤한 팥빙수'
  },
  {
    category: 'hobby',
    title: '뭐가 좋아?',
    description: '취미 활동',
    option_a_title: '독서',
    option_a_description: '조용한 독서',
    option_b_title: '영화감상',
    option_b_description: '재미있는 영화감상'
  }
];

async function createQuizWithImages(quizData, index) {
  console.log(`\n=== 퀴즈 ${index + 1}/10 생성 중: ${quizData.title} ===`);

  try {
    // FormData 준비
    const FormData = require('form-data');
    const form = new FormData();

    form.append('category', quizData.category);
    form.append('title', quizData.title);
    form.append('description', quizData.description);
    form.append('option_a_title', quizData.option_a_title);
    form.append('option_a_description', quizData.option_a_description);
    form.append('option_b_title', quizData.option_b_title);
    form.append('option_b_description', quizData.option_b_description);
    form.append('is_active', 'true');

    console.log(`📸 ${quizData.option_a_title} 이미지 생성 중...`);

    // Option A 이미지 생성
    const optionAResponse = await fetch('http://localhost:3000/admin/generate-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ADMIN_API_TOKEN || 'admin-token'}` // 환경변수에서 로드
      },
      body: JSON.stringify({
        prompt: quizData.option_a_title,
        category: quizData.category
      })
    });

    if (optionAResponse.ok) {
      const optionAResult = await optionAResponse.json();
      if (optionAResult.success && optionAResult.data.image_url) {
        console.log(`✅ ${quizData.option_a_title} 이미지 생성 완료`);

        // 이미지를 다운로드하여 FormData에 추가
        const imageResponse = await fetch(optionAResult.data.image_url);
        const imageBuffer = await imageResponse.buffer();
        form.append('option_a_image', imageBuffer, {
          filename: `${quizData.option_a_title}.png`,
          contentType: 'image/png'
        });
      }
    } else {
      console.log(`❌ ${quizData.option_a_title} 이미지 생성 실패`);
    }

    console.log(`📸 ${quizData.option_b_title} 이미지 생성 중...`);

    // Option B 이미지 생성
    const optionBResponse = await fetch('http://localhost:3000/admin/generate-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ADMIN_API_TOKEN || 'admin-token'}`
      },
      body: JSON.stringify({
        prompt: quizData.option_b_title,
        category: quizData.category
      })
    });

    if (optionBResponse.ok) {
      const optionBResult = await optionBResponse.json();
      if (optionBResult.success && optionBResult.data.image_url) {
        console.log(`✅ ${quizData.option_b_title} 이미지 생성 완료`);

        // 이미지를 다운로드하여 FormData에 추가
        const imageResponse = await fetch(optionBResult.data.image_url);
        const imageBuffer = await imageResponse.buffer();
        form.append('option_b_image', imageBuffer, {
          filename: `${quizData.option_b_title}.png`,
          contentType: 'image/png'
        });
      }
    } else {
      console.log(`❌ ${quizData.option_b_title} 이미지 생성 실패`);
    }

    console.log(`💾 퀴즈 데이터베이스 저장 중...`);

    // 퀴즈 생성 API 호출
    const quizResponse = await fetch('http://localhost:3000/admin/quizzes', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.ADMIN_API_TOKEN || 'admin-token'}`
      },
      body: form
    });

    if (quizResponse.ok) {
      const result = await quizResponse.json();
      console.log(`✅ 퀴즈 "${quizData.title}" 생성 완료!`);
      return result;
    } else {
      const error = await quizResponse.text();
      console.error(`❌ 퀴즈 생성 실패:`, error);
      return null;
    }

  } catch (error) {
    console.error(`❌ 퀴즈 ${index + 1} 생성 중 오류:`, error.message);
    return null;
  }
}

async function createAllQuizzes() {
  console.log('🚀 새로운 퀴즈 10개 생성을 시작합니다...\n');

  const results = [];

  for (let i = 0; i < newQuizzes.length; i++) {
    const result = await createQuizWithImages(newQuizzes[i], i);
    results.push(result);

    // API 호출 간격 조절 (과부하 방지)
    if (i < newQuizzes.length - 1) {
      console.log('⏳ 3초 대기 중...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  console.log('\n🎉 모든 퀴즈 생성 완료!');
  console.log(`✅ 성공: ${results.filter(r => r !== null).length}개`);
  console.log(`❌ 실패: ${results.filter(r => r === null).length}개`);
}

// 실행
createAllQuizzes().catch(console.error);