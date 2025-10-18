import { chromium } from 'playwright';

async function testProfileModal() {
  console.log('🎭 Playwright 테스트 시작: 프로필 모달 스와이프 후 클릭');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500 // 천천히 실행
  });

  const context = await browser.newContext({
    viewport: { width: 375, height: 812 }, // iPhone X 크기
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
  });

  const page = await context.newPage();

  try {
    // 콘솔 로그 수집
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[Profile Modal]') || text.includes('[Click]') || text.includes('[Modal]')) {
        console.log('📱 브라우저 로그:', text);
      }
    });

    // 1. 메인 페이지 접속
    console.log('1️⃣ 메인 페이지 접속...');
    await page.goto('http://localhost:3002');
    await page.waitForLoadState('networkidle');

    // 2. 로그인 (간단하게 localStorage 설정)
    console.log('2️⃣ 로그인 설정...');
    await page.evaluate(() => {
      localStorage.setItem('userId', '0049dc08-1b9a-4d2f-88ee-b47024ea4f78');
      localStorage.setItem('authToken', 'dummy-token');
    });
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 로딩 화면이 사라질 때까지 대기
    await page.waitForFunction(() => {
      const loadingScreen = document.getElementById('loading-screen');
      return loadingScreen && loadingScreen.classList.contains('fade-out');
    }, { timeout: 15000 });

    console.log('⏳ 로딩 화면 종료 대기 중...');
    await page.waitForTimeout(2000); // 로딩 전환 애니메이션 대기

    // 3. 추천 파트너 섹션 확인
    console.log('3️⃣ 추천 파트너 섹션 확인...');

    // 파트너 카드가 실제 데이터와 함께 로드될 때까지 대기
    await page.waitForFunction(() => {
      const cards = document.querySelectorAll('.partner-card');
      const firstCard = cards[0];
      return firstCard &&
             firstCard.getAttribute('data-user-id') !== null &&
             firstCard.getAttribute('data-user-id') !== '';
    }, { timeout: 15000 });

    console.log('✅ 파트너 카드 데이터 로드 완료');

    // 4. 첫 번째 파트너 카드 정보 출력
    const firstCard = await page.locator('.partner-card').first();
    const userName = await firstCard.getAttribute('data-user-name');
    const userId = await firstCard.getAttribute('data-user-id');
    console.log('4️⃣ 첫 번째 파트너:', { userName, userId });

    // 5. 스와이프 시뮬레이션 (터치 이벤트)
    console.log('5️⃣ 스와이프 시뮬레이션...');
    const cardBox = await firstCard.boundingBox();
    if (cardBox) {
      await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(cardBox.x - 200, cardBox.y + cardBox.height / 2, { steps: 10 });
      await page.mouse.up();
      await page.waitForTimeout(1000); // 애니메이션 대기
    }

    // 6. 스와이프 후 새로운 카드 확인
    console.log('6️⃣ 스와이프 후 새 카드 확인...');
    const newCard = await page.locator('.partner-card').first();
    const newUserName = await newCard.getAttribute('data-user-name');
    const newUserId = await newCard.getAttribute('data-user-id');
    console.log('   새 파트너:', { userName: newUserName, userId: newUserId });

    // 7. 새 카드 클릭
    console.log('7️⃣ 새 카드 클릭...');
    await newCard.click();
    await page.waitForTimeout(1000);

    // 8. 모달 상태 확인
    console.log('8️⃣ 모달 상태 확인...');
    const modal = page.locator('#user-profile-modal');
    const isVisible = await modal.isVisible();
    const classes = await modal.getAttribute('class');
    const ariaHidden = await modal.getAttribute('aria-hidden');

    const computedStyle = await modal.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        display: style.display,
        opacity: style.opacity,
        visibility: style.visibility,
        zIndex: style.zIndex
      };
    });

    console.log('📊 모달 상태:', {
      isVisible,
      classes,
      ariaHidden,
      computedStyle
    });

    // 9. 스크린샷 저장
    console.log('9️⃣ 스크린샷 저장...');
    await page.screenshot({
      path: 'scripts/screenshots/profile-modal-test.png',
      fullPage: true
    });

    if (isVisible) {
      console.log('✅ 성공: 모달이 표시됨!');
    } else {
      console.log('❌ 실패: 모달이 표시되지 않음');
      console.log('🔍 추가 디버깅 정보:');

      // 모달 내용 확인
      const modalContent = await modal.innerHTML();
      console.log('   모달 내용 길이:', modalContent.length);

      // 모든 모달 확인
      const allModals = await page.locator('.modal').count();
      console.log('   전체 모달 수:', allModals);
    }

    console.log('\n⏸️  브라우저 유지 (수동 확인 가능) - 30초 후 자동 종료');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('❌ 테스트 에러:', error);
    await page.screenshot({
      path: 'scripts/screenshots/profile-modal-error.png',
      fullPage: true
    });
  } finally {
    await browser.close();
    console.log('🏁 테스트 종료');
  }
}

testProfileModal().catch(console.error);
