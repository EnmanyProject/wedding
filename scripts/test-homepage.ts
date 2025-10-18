import { chromium } from 'playwright';

/**
 * 홈페이지 로딩 및 Ring 값 확인 스크립트
 */
async function testHomepage() {
  console.log('🚀 브라우저 시작...');
  const browser = await chromium.launch({
    headless: false,  // 브라우저를 실제로 보기 위해
    slowMo: 500       // 각 동작을 천천히
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });

  const page = await context.newPage();

  try {
    console.log('📱 페이지 로딩 중...');

    // 페이지 이동 (최대 30초 대기)
    await page.goto('http://localhost:3002', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('✅ 페이지 로드 완료!');

    // 5초 대기해서 페이지 확인
    await page.waitForTimeout(5000);

    // Ring 관련 텍스트 찾기
    console.log('\n💍 Ring 값 찾기 중...');

    // 모든 텍스트 컨텐츠 가져오기
    const bodyText = await page.locator('body').innerText();
    console.log('\n📄 페이지 전체 텍스트:');
    console.log('─'.repeat(50));
    console.log(bodyText.substring(0, 500)); // 처음 500자만
    console.log('─'.repeat(50));

    // Ring이나 150이 포함된 텍스트 찾기
    const ringMatches = bodyText.match(/\d+.*?ring|ring.*?\d+/gi);
    if (ringMatches) {
      console.log('\n💍 Ring 관련 텍스트 발견:');
      ringMatches.forEach(match => console.log(`  - ${match}`));
    }

    // 150이 있는지 확인
    if (bodyText.includes('150')) {
      console.log('\n⚠️  150 발견! 위치 찾는 중...');
      const lines = bodyText.split('\n');
      lines.forEach((line, index) => {
        if (line.includes('150')) {
          console.log(`  Line ${index}: ${line.trim()}`);
        }
      });
    }

    // 스크린샷 저장
    const screenshotPath = 'screenshots/homepage-test.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`\n📸 스크린샷 저장: ${screenshotPath}`);

    // 10초 동안 브라우저 열어두기
    console.log('\n⏳ 10초 동안 브라우저 확인 가능...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('❌ 오류 발생:', error);

    // 오류 발생 시에도 스크린샷
    try {
      await page.screenshot({ path: 'screenshots/error-screenshot.png' });
      console.log('📸 오류 스크린샷 저장: screenshots/error-screenshot.png');
    } catch (screenshotError) {
      console.error('스크린샷 저장 실패:', screenshotError);
    }
  } finally {
    await browser.close();
    console.log('\n✅ 테스트 완료!');
  }
}

testHomepage();
