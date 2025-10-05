/**
 * Full-screen Signup Flow with Warning
 * Version: 3.0.0
 */

class FullScreenSignup {
    constructor() {
        this.currentScreen = 0;
        this.totalScreens = 7;
        this.formData = {
            email: '',
            password: '',
            name: '',
            gender: '',
            birthdate: ''
        };

        this.init();
    }

    init() {
        console.log('🚀 Full-screen Signup initialized');

        // Screen 0: Warning + Countdown
        this.startCountdown();

        // Screen 1: Email
        const formEmail = document.getElementById('form-email');
        if (formEmail) {
            formEmail.addEventListener('submit', (e) => this.handleEmailSubmit(e));
        }

        // Screen 2: Password
        const formPassword = document.getElementById('form-password');
        if (formPassword) {
            formPassword.addEventListener('submit', (e) => this.handlePasswordSubmit(e));
        }

        // Screen 3: Name
        const formName = document.getElementById('form-name');
        if (formName) {
            formName.addEventListener('submit', (e) => this.handleNameSubmit(e));
        }

        // Screen 4: Gender
        const genderCards = document.querySelectorAll('.gender-card');
        genderCards.forEach(card => {
            card.addEventListener('click', () => this.handleGenderSelect(card));
        });

        // Screen 5: Birthdate
        const formBirthdate = document.getElementById('form-birthdate');
        if (formBirthdate) {
            formBirthdate.addEventListener('submit', (e) => this.handleBirthdateSubmit(e));
        }

        // Screen 6: Complete
        const btnStart = document.getElementById('btn-start');
        if (btnStart) {
            btnStart.addEventListener('click', () => this.completeSignup());
        }
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

        // Remove active classes
        currentScreenEl.classList.remove('active');

        // Add previous class for backward animation
        if (direction === 'backward') {
            currentScreenEl.classList.add('previous');
            nextScreenEl.classList.remove('previous');
        }

        // Activate next screen
        setTimeout(() => {
            nextScreenEl.classList.add('active');
            this.currentScreen = screenIndex;

            // Remove previous class after animation
            setTimeout(() => {
                currentScreenEl.classList.remove('previous');
            }, 600);
        }, 50);

        // Bounce Bety on screen entry
        this.bounceBetyOnScreen(screenIndex);

        // Auto-focus input
        this.focusInputOnScreen(screenIndex);
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

    handleEmailSubmit(e) {
        e.preventDefault();

        const emailInput = document.getElementById('email');
        const email = emailInput.value.trim();

        // Validation
        if (!this.validateEmail(email)) {
            alert('올바른 이메일 주소를 입력해주세요');
            return;
        }

        // Save data
        this.formData.email = email;
        console.log('📧 Email:', email);

        // Go to next screen
        this.goToScreen(2);
    }

    handlePasswordSubmit(e) {
        e.preventDefault();

        const passwordInput = document.getElementById('password');
        const password = passwordInput.value.trim();

        // Validation
        if (password.length < 8) {
            alert('비밀번호는 8자 이상이어야 합니다');
            return;
        }

        // Save data
        this.formData.password = password;
        console.log('🔒 Password set');

        // Go to next screen
        this.goToScreen(3);
    }

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
            // Go to next screen
            this.goToScreen(5);
        }, 200);
    }

    handleBirthdateSubmit(e) {
        e.preventDefault();

        const birthdateInput = document.getElementById('birthdate');
        const birthdate = birthdateInput.value;

        // Validation
        if (!birthdate) {
            alert('생년월일을 입력해주세요');
            return;
        }

        const birthYear = new Date(birthdate).getFullYear();
        const currentYear = new Date().getFullYear();
        const age = currentYear - birthYear;

        if (age < 18) {
            alert('만 18세 이상만 가입할 수 있습니다');
            return;
        }

        if (age > 100) {
            alert('올바른 생년월일을 입력해주세요');
            return;
        }

        // Save data
        this.formData.birthdate = birthdate;
        console.log('🎂 Birthdate:', birthdate);

        // Go to completion screen
        this.goToScreen(6);
    }

    // ============================================
    // Completion
    // ============================================

    completeSignup() {
        console.log('🎉 Signup completed!');
        console.log('📝 Form Data:', this.formData);

        // Save to localStorage
        localStorage.setItem('signupData', JSON.stringify({
            ...this.formData,
            completedAt: new Date().toISOString()
        }));

        // Redirect to main app
        setTimeout(() => {
            window.location.href = '/index.html';
        }, 1000);
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
