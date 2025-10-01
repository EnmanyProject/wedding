const fs = require('fs');
const path = require('path');

// 여성 프로필 이미지 생성을 위한 프롬프트 템플릿
const femaleProfilePrompts = [
  {
    base: "Beautiful Korean woman in her 20s",
    styles: [
      "professional headshot, soft lighting, warm smile, business casual attire",
      "casual portrait, natural makeup, friendly expression, soft background",
      "elegant portrait, sophisticated style, gentle smile, studio lighting",
      "artistic portrait, creative lighting, confident expression, modern style",
      "outdoor portrait, natural light, cheerful smile, casual fashion",
      "lifestyle portrait, relaxed pose, bright eyes, contemporary style",
      "glamour portrait, polished look, engaging smile, professional makeup",
      "minimalist portrait, clean aesthetic, serene expression, neutral background"
    ]
  }
];

// 사용자별 개성있는 스타일 매핑
const userStyleMapping = {
  '김나연': 'professional headshot, soft lighting, warm smile, business casual attire',
  '김다은': 'casual portrait, natural makeup, friendly expression, soft background',
  '김소영': 'elegant portrait, sophisticated style, gentle smile, studio lighting',
  '박서진': 'artistic portrait, creative lighting, confident expression, modern style',
  '박지현': 'outdoor portrait, natural light, cheerful smile, casual fashion',
  '배현정': 'lifestyle portrait, relaxed pose, bright eyes, contemporary style',
  '송유진': 'glamour portrait, polished look, engaging smile, professional makeup',
  '신예린': 'minimalist portrait, clean aesthetic, serene expression, neutral background',
  '오주연': 'professional headshot, soft lighting, warm smile, business casual attire',
  '윤서연': 'casual portrait, natural makeup, friendly expression, soft background',
  '이수진': 'elegant portrait, sophisticated style, gentle smile, studio lighting',
  '이현주': 'artistic portrait, creative lighting, confident expression, modern style',
  '임소영': 'outdoor portrait, natural light, cheerful smile, casual fashion',
  '장태연': 'lifestyle portrait, relaxed pose, bright eyes, contemporary style',
  '정다영': 'glamour portrait, polished look, engaging smile, professional makeup',
  '조성연': 'minimalist portrait, clean aesthetic, serene expression, neutral background',
  '최민정': 'professional headshot, soft lighting, warm smile, business casual attire',
  '최은영': 'casual portrait, natural makeup, friendly expression, soft background',
  '한지민': 'elegant portrait, sophisticated style, gentle smile, studio lighting',
  '홍지은': 'artistic portrait, creative lighting, confident expression, modern style'
};

async function generateFemaleProfiles() {
  console.log('🎨 여성 프로필 이미지 생성 시작...');

  // 1. 데이터베이스에서 사용자 목록 가져오기
  const usersResponse = await fetch('http://localhost:3000/api/admin/users', {
    headers: {
      'Authorization': `Bearer ${process.env.ADMIN_API_TOKEN || 'admin-token'}`
    }
  });

  if (!usersResponse.ok) {
    console.error('❌ 사용자 목록을 가져올 수 없습니다');
    return;
  }

  const usersData = await usersResponse.json();
  const users = usersData.data;

  console.log(`👥 총 ${users.length}명의 사용자 발견`);

  const results = [];

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const userName = user.name;

    console.log(`\n🎭 ${i + 1}/${users.length}: ${userName} 프로필 이미지 생성 중...`);

    // 사용자별 맞춤 프롬프트 생성
    const style = userStyleMapping[userName] || femaleProfilePrompts[0].styles[0];
    const prompt = `${femaleProfilePrompts[0].base}, ${style}, high quality, detailed, portrait photography`;

    console.log(`📝 프롬프트: ${prompt}`);

    try {
      // AI 이미지 생성 요청
      const imageResponse = await fetch('http://localhost:3000/admin/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.ADMIN_API_TOKEN || 'admin-token'}`
        },
        body: JSON.stringify({
          prompt: prompt,
          category: 'profile',
          aspectRatio: '1:1',
          style: 'photography'
        })
      });

      if (imageResponse.ok) {
        const imageResult = await imageResponse.json();
        console.log(`✅ ${userName} 이미지 생성 완료: ${imageResult.data.image_url}`);

        // 프로필 이미지 DB에 저장
        const saveResponse = await fetch('http://localhost:3000/api/admin/user-profile-images', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.ADMIN_API_TOKEN || 'admin-token'}`
          },
          body: JSON.stringify({
            user_id: user.id,
            image_url: imageResult.data.image_url,
            image_type: 'ai_generated',
            image_prompt: prompt
          })
        });

        if (saveResponse.ok) {
          console.log(`💾 ${userName} 프로필 이미지 DB 저장 완료`);
          results.push({
            user: userName,
            success: true,
            image_url: imageResult.data.image_url
          });
        } else {
          console.log(`❌ ${userName} DB 저장 실패`);
          results.push({
            user: userName,
            success: false,
            error: 'DB 저장 실패'
          });
        }
      } else {
        console.log(`❌ ${userName} 이미지 생성 실패`);
        results.push({
          user: userName,
          success: false,
          error: '이미지 생성 실패'
        });
      }

      // API 호출 간격 조정 (너무 빠른 요청 방지)
      if (i < users.length - 1) {
        console.log('⏳ 3초 대기 중...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

    } catch (error) {
      console.error(`❌ ${userName} 처리 중 오류:`, error.message);
      results.push({
        user: userName,
        success: false,
        error: error.message
      });
    }
  }

  // 결과 요약
  console.log('\n🎉 여성 프로필 이미지 생성 완료!');
  console.log(`✅ 성공: ${results.filter(r => r.success).length}개`);
  console.log(`❌ 실패: ${results.filter(r => !r.success).length}개`);

  if (results.filter(r => !r.success).length > 0) {
    console.log('\n실패한 사용자:');
    results.filter(r => !r.success).forEach(result => {
      console.log(`- ${result.user}: ${result.error}`);
    });
  }

  return results;
}

// 스크립트 직접 실행
if (require.main === module) {
  generateFemaleProfiles()
    .then(results => {
      console.log('\n📊 최종 결과:', results.length, '건 처리');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 스크립트 실행 오류:', error);
      process.exit(1);
    });
}

module.exports = { generateFemaleProfiles };