// 데이터베이스 설정 테스트 스크립트
const fetch = require('node-fetch');

const DEPLOYMENT_URL = 'https://wedding-k3wh9d4oa-enmanys-projects.vercel.app';

async function testDatabaseConnection() {
  console.log('🔍 데이터베이스 연결 테스트 중...');

  try {
    const response = await fetch(`${DEPLOYMENT_URL}/api/test-db`);
    const data = await response.text();

    if (response.status === 200) {
      console.log('✅ 데이터베이스 연결 성공!');
      console.log(data);
    } else {
      console.log('⚠️ 데이터베이스 연결 테스트 응답:', response.status);
      console.log(data.substring(0, 200) + '...');
    }
  } catch (error) {
    console.error('❌ 데이터베이스 연결 테스트 실패:', error.message);
  }
}

async function setupDatabase() {
  console.log('🛠️ 데이터베이스 스키마 설정 중...');

  try {
    const response = await fetch(`${DEPLOYMENT_URL}/api/setup-db`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.text();

    if (response.status === 200) {
      console.log('✅ 데이터베이스 스키마 설정 성공!');
      console.log(data);
    } else {
      console.log('⚠️ 데이터베이스 스키마 설정 응답:', response.status);
      console.log(data.substring(0, 200) + '...');
    }
  } catch (error) {
    console.error('❌ 데이터베이스 스키마 설정 실패:', error.message);
  }
}

async function main() {
  console.log('🚀 Wedding App 데이터베이스 설정 테스트 시작\n');

  await testDatabaseConnection();
  console.log('\n' + '='.repeat(50) + '\n');
  await setupDatabase();

  console.log('\n✨ 테스트 완료!');
}

main().catch(console.error);