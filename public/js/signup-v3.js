/**
 * Full-screen Signup Flow with Warning
 * Version: 3.0.0
 */

class FullScreenSignup {
    constructor() {
        this.currentScreen = 0;
        this.totalScreens = 9; // 총 9개 화면
        this.formData = {
            name: '',
            gender: '',
            age: '',
            region: ''
        };

        this.init();
    }

    init() {
        console.log('🚀 Full-screen Signup initialized');

        // Screen 0: Warning + Countdown
        this.startCountdown();

        // Screen 1: Gender
        const genderCards = document.querySelectorAll('.gender-card');
        genderCards.forEach(card => {
            card.addEventListener('click', () => this.handleGenderSelect(card));
        });

        // Screen 2: Gender Feedback Continue
        const genderContinueBtn = document.getElementById('gender-continue-btn');
        if (genderContinueBtn) {
            genderContinueBtn.addEventListener('click', () => this.goToScreen(3));
        }

        // Screen 3: Name
        const formName = document.getElementById('form-name');
        if (formName) {
            formName.addEventListener('submit', (e) => this.handleNameSubmit(e));
        }

        // Screen 4: Age
        const formAge = document.getElementById('form-age');
        if (formAge) {
            formAge.addEventListener('submit', (e) => this.handleAgeSubmit(e));
        }

        // Screen 5: Age Feedback Continue
        const ageContinueBtn = document.getElementById('age-continue-btn');
        if (ageContinueBtn) {
            ageContinueBtn.addEventListener('click', () => this.goToScreen(6));
        }

        // Screen 6: Region
        const regionCards = document.querySelectorAll('.region-card');
        regionCards.forEach(card => {
            card.addEventListener('click', () => this.handleRegionSelect(card));
        });

        // Screen 7: Region Feedback Continue
        const regionContinueBtn = document.getElementById('region-continue-btn');
        if (regionContinueBtn) {
            regionContinueBtn.addEventListener('click', () => this.goToScreen(8));
        }

        // Screen 8: Complete
        const btnStart = document.getElementById('btn-start');
        if (btnStart) {
            btnStart.addEventListener('click', () => this.completeSignup());
        }

        // Initialize age select
        this.initializeAgeSelect();
    }

    // ============================================
    // Screen 0: Warning + Countdown
    // ============================================

    startCountdown() {
        const countdownElement = document.getElementById('countdown');
        const btnSerious = document.getElementById('btn-serious');

        console.log('🎬 카운트다운 시작 - Element 확인:', {
            countdown: countdownElement,
            button: btnSerious
        });

        if (!countdownElement || !btnSerious) {
            console.error('❌ 요소를 찾을 수 없습니다!');
            return;
        }

        let count = 10;

        // 버튼 클릭 이벤트 미리 등록 (한 번만)
        btnSerious.addEventListener('click', () => {
            if (!btnSerious.disabled) {
                console.log('✅ 진심입니다 버튼 클릭!');
                this.goToScreen(1);
            }
        });

        const countdownInterval = setInterval(() => {
            count--;
            console.log('⏱️ 카운트:', count);
            countdownElement.textContent = count;

            if (count <= 0) {
                clearInterval(countdownInterval);
                // Enable the button
                btnSerious.disabled = false;
                btnSerious.classList.add('enabled');
                console.log('⏰ 카운트다운 완료! 버튼 활성화');
            }
        }, 1000);
    }

    // ============================================
    // Screen Navigation
    // ============================================

    goToScreen(screenIndex, direction = 'forward') {
        const screens = document.querySelectorAll('.screen');
        const currentScreenEl = screens[this.currentScreen];
        const nextScreenEl = screens[screenIndex];

        if (!nextScreenEl) return;

        console.log(`🔄 화면 전환: ${this.currentScreen} → ${screenIndex}`);

        // 모든 화면의 active 클래스 제거
        screens.forEach((screen, idx) => {
            if (idx !== screenIndex) {
                screen.classList.remove('active');
                screen.classList.add('previous');
            }
        });

        // 다음 화면 활성화
        setTimeout(() => {
            nextScreenEl.classList.remove('previous');
            nextScreenEl.classList.add('active');
            this.currentScreen = screenIndex;

            console.log(`✅ 화면 ${screenIndex} 활성화 완료`);

            // Bounce Bety on screen entry
            this.bounceBetyOnScreen(screenIndex);

            // Auto-focus input
            this.focusInputOnScreen(screenIndex);
        }, 50);
    }

    bounceBetyOnScreen(screenIndex) {
        const screen = document.getElementById(`screen-${screenIndex}`);
        if (!screen) return;

        const betyImg = screen.querySelector('.bety-img');
        if (betyImg) {
            betyImg.classList.remove('bety-bounce');
            setTimeout(() => {
                betyImg.classList.add('bety-bounce');
            }, 100);
        }
    }

    focusInputOnScreen(screenIndex) {
        setTimeout(() => {
            const screen = document.getElementById(`screen-${screenIndex}`);
            if (!screen) return;

            const input = screen.querySelector('input');
            if (input) {
                input.focus();
            }
        }, 700);
    }

    // ============================================
    // Form Handlers
    // ============================================


    handleNameSubmit(e) {
        e.preventDefault();

        const nameInput = document.getElementById('name');
        const name = nameInput.value.trim();

        // Validation
        if (name.length < 2) {
            alert('이름은 2자 이상이어야 합니다');
            return;
        }

        if (name.length > 10) {
            alert('이름은 10자 이하여야 합니다');
            return;
        }

        // Save data
        this.formData.name = name;
        console.log('👤 Name:', name);

        // Update welcome name on final screen
        const welcomeName = document.getElementById('welcome-name');
        if (welcomeName) {
            welcomeName.textContent = name;
        }

        // Go to next screen
        this.goToScreen(4);
    }

    handleGenderSelect(card) {
        const gender = card.dataset.gender;

        // Save data
        this.formData.gender = gender;
        console.log('⚧️ Gender:', gender);

        // Visual feedback
        card.style.transform = 'scale(0.95)';
        setTimeout(() => {
            card.style.transform = '';
            
            // Set gender-specific feedback message
            this.setGenderFeedback(gender);
            
            // Go to feedback screen
            this.goToScreen(2);
        }, 200);
    }

    setGenderFeedback(gender) {
        const titleElement = document.getElementById('gender-feedback-title');
        const messageElement = document.getElementById('gender-feedback-message');

        if (gender === 'male') {
            titleElement.textContent = '우와 신랑님! 🎉';
            messageElement.innerHTML = '<span>무려 <strong>1041명</strong>의 신부감이 당신을 기다리고 있어요!</span> 💕';
        } else if (gender === 'female') {
            titleElement.textContent = '우와! 🎉';
            messageElement.innerHTML = '<span>무려 <strong>843명</strong>의 신랑감이 기다리고 있어요!</span> 💕';
        }

        console.log('💝 Gender feedback set for:', gender);
    }

    setAgeFeedback(age) {
        const titleElement = document.getElementById('age-feedback-title');
        const messageElement = document.getElementById('age-feedback-message');
        const ageNum = parseInt(age);

        let title = '';
        let message = '';

        if (ageNum >= 18 && ageNum <= 22) {
            title = '와! 청춘의 활기가 넘치시네요! ✨';
            message = '<span>20대 초반의 에너지와 열정! 앞으로 펼쳐질 <strong>무한한 가능성</strong>이 기대돼요! 💫</span>';
        } else if (ageNum >= 23 && ageNum <= 27) {
            title = '젊음의 매력이 최고조네요! 🌟';
            message = '<span>가장 아름다운 20대! 이 <strong>황금같은 시기</strong>에 특별한 인연을 만나보세요! 💝</span>';
        } else if (ageNum >= 28 && ageNum <= 32) {
            title = '완벽한 나이시네요! 🎯';
            message = '<span>경험과 젊음이 조화를 이루는 시기! <strong>최고의 타이밍</strong>에 오셨어요! 🌈</span>';
        } else if (ageNum >= 33 && ageNum <= 37) {
            title = '성숙한 매력이 돋보이시네요! 💎';
            message = '<span>30대의 안정감과 여유! <strong>진정한 매력</strong>이 빛나는 나이예요! ⭐</span>';
        } else if (ageNum >= 38 && ageNum <= 42) {
            title = '원숙미가 느껴지시네요! 🌺';
            message = '<span>삶의 깊이가 묻어나는 나이! <strong>진짜 매력</strong>은 지금부터예요! 🎨</span>';
        } else if (ageNum >= 43 && ageNum <= 47) {
            title = '중년의 멋이 물씬하시네요! 🎩';
            message = '<span>경험이 쌓인 40대! <strong>가장 빛나는 시기</strong>를 맞이하셨어요! 🌟</span>';
        } else if (ageNum >= 48 && ageNum <= 52) {
            title = '인생의 깊이가 대단하시네요! 📚';
            message = '<span>여유롭고 지혜로운 50대! <strong>인생의 황금기</strong>를 즐기실 시간이에요! 🏆</span>';
        } else if (ageNum >= 53 && ageNum <= 57) {
            title = '지혜가 넘치시네요! 🦉';
            message = '<span>풍부한 경륜의 50대! <strong>인생의 진가</strong>를 아시는 멋진 나이예요! 🎭</span>';
        } else if (ageNum >= 58 && ageNum <= 62) {
            title = '경륜과 여유가 멋지시네요! 🎪';
            message = '<span>60대의 여유로움! <strong>새로운 시작</strong>은 언제나 아름다워요! 🌸</span>';
        } else if (ageNum >= 63 && ageNum <= 67) {
            title = '인생의 연륜이 빛나시네요! 🌄';
            message = '<span>풍성한 인생 경험! <strong>멋진 동반자</strong>를 찾으실 준비가 되셨네요! 💫</span>';
        } else if (ageNum >= 68 && ageNum <= 72) {
            title = '황금기를 맞이하셨네요! 🏅';
            message = '<span>70대의 지혜와 품격! <strong>인생의 완성</strong>을 함께할 분을 만나보세요! 🎯</span>';
        } else if (ageNum >= 73 && ageNum <= 80) {
            title = '귀하고 멋진 나이시네요! 👑';
            message = '<span>깊은 경험과 지혜! <strong>특별한 인연</strong>이 기다리고 있어요! 💝</span>';
        } else {
            title = '멋진 나이시네요! 🎉';
            message = '<span><strong>새로운 시작</strong>은 언제나 아름답습니다! 💕</span>';
        }

        titleElement.textContent = title;
        messageElement.innerHTML = message;

        console.log('🎂 Age feedback set for:', age);
    }

    initializeAgeSelect() {
        const ageSelect = document.getElementById('age-select');
        if (!ageSelect) return;

        // 18세부터 80세까지 옵션 추가
        for (let age = 18; age <= 80; age++) {
            const option = document.createElement('option');
            option.value = age;
            option.textContent = `${age}세`;
            ageSelect.appendChild(option);
        }
    }

    handleAgeSubmit(e) {
        e.preventDefault();

        const ageSelect = document.getElementById('age-select');
        const age = ageSelect.value;

        // Validation
        if (!age) {
            alert('나이를 선택해주세요');
            return;
        }

        // Save data
        this.formData.age = age;
        console.log('🎂 Age:', age);

        // Set age-specific feedback message
        this.setAgeFeedback(age);

        // Go to age feedback screen
        this.goToScreen(5);
    }

    handleRegionSelect(card) {
        const region = card.dataset.region;

        // Save data
        this.formData.region = region;
        console.log('🏙️ Region:', region);

        // Visual feedback
        card.style.transform = 'scale(0.95)';
        setTimeout(() => {
            card.style.transform = '';

            // Set region-specific feedback message
            this.setRegionFeedback(region);

            // Go to feedback screen
            this.goToScreen(7);
        }, 200);
    }

    setRegionFeedback(region) {
        const titleElement = document.getElementById('region-feedback-title');
        const messageElement = document.getElementById('region-feedback-message');
        
        const regionMessages = {
            'seoul': '전통과 현대가 조화를 이루는 아주 멋진 곳이죠! 🏙️',
            'busan': '바다와 산이 어우러진 아름다운 도시네요! 🌊',
            'incheon': '국제적이고 역동적인 매력이 넘치는 곳이에요! ✈️',
            'daegu': '사과처럼 달콤하고 따뜻한 인심의 고장이군요! 🍎',
            'daejeon': '과학과 교육의 중심지, 정말 스마트한 도시네요! 🔬',
            'gwangju': '예술과 문화가 살아 숨쉬는 아름다운 도시예요! 🎨',
            'ulsan': '산업의 힘과 자연의 아름다움이 공존하는 곳이네요! 🏭',
            'sejong': '미래를 향한 꿈이 가득한 신도시군요! 🏛️',
            'gyeonggi': '서울과 가까워 편리하면서도 자연이 풍부한 곳이에요! 🌳',
            'gangwon': '청정한 자연과 산악미가 압권인 아름다운 곳이군요! ⛰️',
            'chungbuk': '자연이 주는 평온함과 여유로움이 느껴지는 곳이네요! 🏞️',
            'chungnam': '풍요로운 들판과 따뜻한 인심이 매력적인 고장이에요! 🌾',
            'jeonbuk': '맛있는 음식과 깊은 역사가 살아있는 멋진 곳이군요! 🍚',
            'jeonnam': '푸른 자연과 풍부한 문화유산이 어우러진 보석같은 곳이에요! 🌿',
            'gyeongbuk': '유서 깊은 역사와 전통이 살아 숨쉬는 아름다운 고장이네요! 🏯',
            'gyeongnam': '온화한 기후와 벚꽃이 아름다운 낭만적인 지역이군요! 🌸',
            'jeju': '환상적인 자연경관과 독특한 문화가 매력적인 보물섬이에요! 🍊'
        };
        
        titleElement.textContent = '멋진 곳이네요! 🎉';
        messageElement.innerHTML = `<span>${regionMessages[region] || '정말 좋은 곳에 사시는군요!'}</span>`;
        
        console.log('🏙️ Region feedback set for:', region);
    }


    // ============================================
    // Completion
    // ============================================

    async completeSignup() {
        console.log('🎉 Signup completed!');
        console.log('📝 Form Data:', this.formData);

        try {
            // 회원가입 API 호출
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Signup failed');
            }

            console.log('✅ Signup successful:', data);

            // 토큰 및 사용자 정보 저장
            localStorage.setItem('token', data.data.token);
            localStorage.setItem('signupData', JSON.stringify({
                ...this.formData,
                userId: data.data.user.id,
                email: data.data.user.email,
                completedAt: new Date().toISOString()
            }));

            // 🔑 세션 플래그 설정 (이번 세션에서 방금 가입 완료함)
            sessionStorage.setItem('justCompletedSignup', 'true');
            console.log('✅ Session flag set: justCompletedSignup');

            // Redirect to main app
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);

        } catch (error) {
            console.error('❌ Signup error:', error);
            alert(`회원가입 실패: ${error.message}`);
        }
    }

    // ============================================
    // Validation Helpers
    // ============================================

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new FullScreenSignup();
});
