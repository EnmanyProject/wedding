/**
 * Signup Page JavaScript
 * 가상 회원가입 플로우 (실제 데이터 연동 없음)
 * Version: 1.0.0
 */

class SignupFlow {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 3;
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
        console.log('🚀 Signup Flow initialized');
        this.setupEventListeners();
        this.updateProgress();
    }

    setupEventListeners() {
        // Step 1: Email & Password
        const formStep1 = document.getElementById('form-step-1');
        formStep1?.addEventListener('submit', (e) => this.handleStep1Submit(e));

        // Step 2: Basic Info
        const formStep2 = document.getElementById('form-step-2');
        formStep2?.addEventListener('submit', (e) => this.handleStep2Submit(e));

        // Gender buttons
        const genderButtons = document.querySelectorAll('.gender-btn');
        genderButtons.forEach(btn => {
            btn.addEventListener('click', () => this.selectGender(btn));
        });

        // Back buttons
        const btnBack1 = document.getElementById('btn-back-1');
        btnBack1?.addEventListener('click', () => this.goToStep(1));

        const btnBack2 = document.getElementById('btn-back-2');
        btnBack2?.addEventListener('click', () => this.goToStep(2));

        // Start button
        const btnStart = document.getElementById('btn-start');
        btnStart?.addEventListener('click', () => this.completeSignup());
    }

    handleStep1Submit(e) {
        e.preventDefault();

        const email = document.getElementById('email')?.value;
        const password = document.getElementById('password')?.value;
        const passwordConfirm = document.getElementById('password-confirm')?.value;

        // 비밀번호 일치 확인
        if (password !== passwordConfirm) {
            alert('❌ 비밀번호가 일치하지 않습니다.');
            return;
        }

        // 가상 데이터 저장
        this.formData.email = email;
        this.formData.password = password;

        console.log('✅ Step 1 completed:', { email });

        // 다음 단계로
        this.goToStep(2);
    }

    handleStep2Submit(e) {
        e.preventDefault();

        const name = document.getElementById('name')?.value;
        const gender = document.getElementById('gender')?.value;
        const birthdate = document.getElementById('birthdate')?.value;

        // 성별 선택 확인
        if (!gender) {
            alert('❌ 성별을 선택해주세요.');
            return;
        }

        // 가상 데이터 저장
        this.formData.name = name;
        this.formData.gender = gender;
        this.formData.birthdate = birthdate;

        console.log('✅ Step 2 completed:', { name, gender, birthdate });

        // 환영 화면에 이름 표시
        const welcomeName = document.getElementById('welcome-name');
        if (welcomeName) {
            welcomeName.textContent = name;
        }

        // 다음 단계로
        this.goToStep(3);
    }

    selectGender(button) {
        // 모든 버튼에서 selected 제거
        document.querySelectorAll('.gender-btn').forEach(btn => {
            btn.classList.remove('selected');
        });

        // 선택된 버튼에 selected 추가
        button.classList.add('selected');

        // hidden input에 값 설정
        const gender = button.getAttribute('data-gender');
        const genderInput = document.getElementById('gender');
        if (genderInput) {
            genderInput.value = gender;
        }

        console.log('✅ Gender selected:', gender);
    }

    goToStep(stepNumber) {
        if (stepNumber < 1 || stepNumber > this.totalSteps) {
            return;
        }

        // 현재 단계 비활성화
        const currentStepEl = document.getElementById(`step-${this.currentStep}`);
        if (currentStepEl) {
            currentStepEl.classList.remove('active');
            if (stepNumber < this.currentStep) {
                currentStepEl.classList.remove('previous');
            } else {
                currentStepEl.classList.add('previous');
            }
        }

        // 다음 단계 활성화
        const nextStepEl = document.getElementById(`step-${stepNumber}`);
        if (nextStepEl) {
            nextStepEl.classList.add('active');
            nextStepEl.classList.remove('previous');
        }

        // 현재 단계 업데이트
        this.currentStep = stepNumber;

        // 진행 바 업데이트
        this.updateProgress();

        console.log(`📍 Moved to step ${stepNumber}`);
    }

    updateProgress() {
        const progressBar = document.getElementById('progress-bar');
        if (progressBar) {
            const percentage = (this.currentStep / this.totalSteps) * 100;
            progressBar.style.width = `${percentage}%`;
        }
    }

    completeSignup() {
        console.log('🎉 Signup completed!');
        console.log('📝 Form Data:', this.formData);

        // 가상 데이터를 localStorage에 저장 (실제로는 API 호출)
        localStorage.setItem('signupData', JSON.stringify({
            ...this.formData,
            completedAt: new Date().toISOString()
        }));

        // 메인 페이지로 이동
        setTimeout(() => {
            window.location.href = '/index.html';
        }, 500);
    }
}

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    new SignupFlow();
});
