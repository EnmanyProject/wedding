const { chromium } = require('playwright');

async function testSwipePerformance() {
  console.log('🚀 스와이프 테스트 시작...');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500 // 시각적 확인을 위해 느리게
  });

  const context = await browser.newContext({
    viewport: { width: 375, height: 667 }, // 모바일 뷰포트
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
  });

  const page = await context.newPage();

  try {
    console.log('📱 모바일 뷰포트로 사이트 접속...');
    await page.goto('http://localhost:3000');

    // 페이지 로드 대기
    await page.waitForTimeout(2000);

    // 모바일 파트너 스와이퍼 요소 찾기
    console.log('🔍 파트너 카드 컨테이너 찾는 중...');
    const swiperExists = await page.locator('#mobile-partner-swiper').isVisible();
    console.log('모바일 스와이퍼 존재:', swiperExists);

    if (!swiperExists) {
      console.log('❌ 모바일 스와이퍼를 찾을 수 없습니다');
      return;
    }

    // 콘솔 로그 수집
    page.on('console', msg => {
      if (msg.text().includes('스와이프') || msg.text().includes('Snap') || msg.text().includes('📱') || msg.text().includes('📍')) {
        console.log('🖥️ [Browser]:', msg.text());
      }
    });

    const swiper = page.locator('#mobile-partner-swiper');
    const cardsContainer = page.locator('#partner-cards-container');

    // 스와이퍼 위치와 크기 확인
    const swiperBox = await swiper.boundingBox();
    console.log('📏 스와이퍼 크기:', swiperBox);

    if (!swiperBox) {
      console.log('❌ 스와이퍼 요소가 보이지 않습니다');
      return;
    }

    console.log('\n🧪 테스트 1: 천천히 스와이프 (느린 속도)');
    await page.mouse.move(swiperBox.x + swiperBox.width * 0.8, swiperBox.y + swiperBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(swiperBox.x + swiperBox.width * 0.2, swiperBox.y + swiperBox.height / 2, { steps: 20 });
    await page.waitForTimeout(500); // 천천히
    await page.mouse.up();
    await page.waitForTimeout(1000);

    console.log('\n🧪 테스트 2: 보통 속도 스와이프');
    await page.mouse.move(swiperBox.x + swiperBox.width * 0.2, swiperBox.y + swiperBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(swiperBox.x + swiperBox.width * 0.8, swiperBox.y + swiperBox.height / 2, { steps: 10 });
    await page.waitForTimeout(200);
    await page.mouse.up();
    await page.waitForTimeout(1000);

    console.log('\n🧪 테스트 3: 빠른 스와이프');
    await page.mouse.move(swiperBox.x + swiperBox.width * 0.8, swiperBox.y + swiperBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(swiperBox.x + swiperBox.width * 0.2, swiperBox.y + swiperBox.height / 2, { steps: 3 });
    await page.waitForTimeout(50); // 빠르게
    await page.mouse.up();
    await page.waitForTimeout(1000);

    console.log('\n🧪 테스트 4: 매우 빠른 플릭');
    await page.mouse.move(swiperBox.x + swiperBox.width * 0.2, swiperBox.y + swiperBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(swiperBox.x + swiperBox.width * 0.8, swiperBox.y + swiperBox.height / 2, { steps: 1 });
    await page.mouse.up();
    await page.waitForTimeout(1000);

    // 현재 transform 값 확인
    const transform = await cardsContainer.evaluate(el => el.style.transform);
    console.log('\n📍 최종 transform 값:', transform);

    // 카드 정렬 상태 확인
    const containerWidth = await swiper.evaluate(el => el.offsetWidth);
    const currentIndex = await page.evaluate(() => window.ui ? window.ui.currentPartnerIndex : 0);
    const expectedPosition = -(currentIndex * containerWidth);

    console.log('\n📊 위치 검증:');
    console.log('- 현재 인덱스:', currentIndex);
    console.log('- 컨테이너 너비:', containerWidth);
    console.log('- 예상 위치:', expectedPosition + 'px');
    console.log('- 실제 transform:', transform);

    const isProperlyAligned = transform.includes(`translateX(${expectedPosition}px)`);
    console.log('✅ 정렬 상태:', isProperlyAligned ? '정확히 정렬됨' : '정렬 오차 있음');

    await page.waitForTimeout(3000); // 결과 확인을 위해 대기

  } catch (error) {
    console.error('❌ 테스트 중 오류:', error);
  } finally {
    await browser.close();
    console.log('🏁 테스트 완료');
  }
}

testSwipePerformance().catch(console.error);