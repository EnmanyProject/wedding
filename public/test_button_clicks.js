// 방향키 버튼 클릭 자동 테스트
function testDirectionButtons() {
  console.log('🧪 [Auto Test] 방향키 버튼 테스트 시작');

  // 파트너 카드 버튼들 찾기
  const prevBtn = document.getElementById('prev-partner-btn');
  const nextBtn = document.getElementById('next-partner-btn');

  if (!prevBtn || !nextBtn) {
    console.error('❌ [Auto Test] 방향키 버튼을 찾을 수 없습니다');
    console.log('Available buttons:', {
      prev: !!prevBtn,
      next: !!nextBtn,
      prevId: prevBtn?.id,
      nextId: nextBtn?.id
    });
    return;
  }

  console.log('✅ [Auto Test] 방향키 버튼 발견:', {
    prevBtn: prevBtn.id,
    nextBtn: nextBtn.id,
    prevVisible: !prevBtn.disabled,
    nextVisible: !nextBtn.disabled
  });

  // 현재 상태 확인
  const cardsContainer = document.getElementById('partner-cards-container');
  const swiperContainer = document.getElementById('mobile-partner-swiper');

  if (!cardsContainer || !swiperContainer) {
    console.error('❌ [Auto Test] 컨테이너를 찾을 수 없습니다');
    return;
  }

  function checkCurrentPosition(label) {
    const currentTransform = cardsContainer.style.transform;
    const containerWidth = swiperContainer.offsetWidth;
    const currentIndex = window.ui ? window.ui.currentPartnerIndex : 0;
    const expectedPosition = -(currentIndex * containerWidth);

    console.log(`📊 [Auto Test] ${label} 위치 확인:`, {
      currentIndex,
      containerWidth,
      expectedPosition: expectedPosition + 'px',
      actualTransform: currentTransform,
      matches: currentTransform.includes(`translateX(${expectedPosition}px)`)
    });

    return currentTransform.includes(`translateX(${expectedPosition}px)`);
  }

  // 초기 상태 확인
  console.log('\n🔍 [Auto Test] 초기 상태 확인');
  checkCurrentPosition('초기');

  // 테스트 시퀀스
  const tests = [
    { button: nextBtn, name: '다음 버튼', delay: 0 },
    { button: nextBtn, name: '다음 버튼 (2회)', delay: 1000 },
    { button: prevBtn, name: '이전 버튼', delay: 2000 },
    { button: prevBtn, name: '이전 버튼 (2회)', delay: 3000 }
  ];

  tests.forEach((test, index) => {
    setTimeout(() => {
      console.log(`\n🧪 [Auto Test] ${index + 1}/${tests.length}: ${test.name} 클릭`);

      // 클릭 전 상태
      const beforePosition = checkCurrentPosition('클릭 전');

      // 버튼 클릭
      test.button.click();

      // 클릭 직후 확인 (짧은 딜레이)
      setTimeout(() => {
        const afterPosition = checkCurrentPosition('클릭 후 (100ms)');
      }, 100);

      // 애니메이션 완료 후 확인
      setTimeout(() => {
        const finalPosition = checkCurrentPosition('애니메이션 완료 후 (600ms)');

        if (finalPosition) {
          console.log('✅ [Auto Test] 정렬 성공');
        } else {
          console.warn('⚠️ [Auto Test] 정렬 실패 - 재정렬 시도');

          // 수동 재정렬 시도
          if (window.ui && window.ui.verifyAndFixAlignment) {
            window.ui.verifyAndFixAlignment();
          }
        }
      }, 600);

    }, test.delay);
  });

  // 최종 결과 확인
  setTimeout(() => {
    console.log('\n📊 [Auto Test] 최종 결과 확인');
    const finalResult = checkCurrentPosition('최종');

    console.log('🏁 [Auto Test] 테스트 완료:', {
      success: finalResult,
      recommendation: finalResult ? '정렬이 정확합니다' : '추가 조정이 필요합니다'
    });
  }, 5000);
}

// 페이지 로드 후 자동 실행
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(testDirectionButtons, 2000);
  });
} else {
  setTimeout(testDirectionButtons, 2000);
}