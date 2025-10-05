/**
 * Chat-style Signup Flow with Bety
 * Version: 2.0.0
 */

class ChatSignup {
    constructor() {
        this.messagesContainer = document.getElementById('chat-messages');
        this.inputArea = document.getElementById('chat-input-area');

        this.currentStep = 0;
        this.formData = {
            email: '',
            password: '',
            name: '',
            gender: '',
            birthdate: ''
        };

        this.betyImages = {
            greeting: '/images/Bety2.png',      // 인사
            happy: '/images/Bety1.png',         // 행복
            excited: '/images/Bety4.png',       // 신남
            surprised: '/images/Bety3.png',     // 놀람
            cheerful: '/images/Bety5.png',      // 즐거움
            lovely: '/images/Bety7.png',        // 사랑
            wink: '/images/Bety6.png'           // 윙크
        };

        this.conversationFlow = [
            // 0: Greeting
            {
                betyMessages: [
                    { text: '안녕하세요! 👋', emotion: 'greeting', delay: 500 },
                    { text: '저는 베티예요! 누구나에 오신 걸 환영해요 💕', emotion: 'happy', delay: 1500 }
                ],
                inputType: 'continue',
                continueText: '시작할게요!'
            },
            // 1: Email
            {
                betyMessages: [
                    { text: '먼저 이메일 주소를 알려주세요 📧', emotion: 'cheerful', delay: 800 }
                ],
                inputType: 'email',
                placeholder: 'example@email.com',
                validation: (value) => {
                    if (!value) return '이메일을 입력해주세요';
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return '올바른 이메일 형식이 아니에요';
                    return null;
                },
                onAnswer: (value) => {
                    this.formData.email = value;
                    return { text: '멋진 이메일이네요! ✨', emotion: 'excited', delay: 600 };
                }
            },
            // 2: Password
            {
                betyMessages: [
                    { text: '이제 비밀번호를 만들어주세요 🔒', emotion: 'cheerful', delay: 800 },
                    { text: '8자 이상으로 안전하게 만들어주세요!', emotion: 'cheerful', delay: 1200 }
                ],
                inputType: 'password',
                placeholder: '비밀번호 (8자 이상)',
                validation: (value) => {
                    if (!value) return '비밀번호를 입력해주세요';
                    if (value.length < 8) return '8자 이상 입력해주세요';
                    return null;
                },
                onAnswer: (value) => {
                    this.formData.password = value;
                    return { text: '완벽해요! 안전하게 보관할게요 🛡️', emotion: 'happy', delay: 600 };
                }
            },
            // 3: Name
            {
                betyMessages: [
                    { text: '이제 당신을 뭐라고 부를까요? 😊', emotion: 'happy', delay: 800 }
                ],
                inputType: 'text',
                placeholder: '이름 또는 닉네임',
                validation: (value) => {
                    if (!value) return '이름을 입력해주세요';
                    if (value.length < 2) return '2자 이상 입력해주세요';
                    if (value.length > 10) return '10자 이하로 입력해주세요';
                    return null;
                },
                onAnswer: (value) => {
                    this.formData.name = value;
                    return { text: `${value}님! 정말 좋은 이름이에요! 💖`, emotion: 'lovely', delay: 600 };
                }
            },
            // 4: Gender
            {
                betyMessages: [
                    { text: '성별을 알려주실래요?', emotion: 'cheerful', delay: 800 }
                ],
                inputType: 'gender',
                onAnswer: (value) => {
                    this.formData.gender = value;
                    const genderText = value === 'male' ? '멋지시네요' : '아름다우시네요';
                    return { text: `알겠어요! ${genderText}! 🎯`, emotion: 'wink', delay: 600 };
                }
            },
            // 5: Birthdate
            {
                betyMessages: [
                    { text: '생년월일은 언제세요? 🎂', emotion: 'cheerful', delay: 800 }
                ],
                inputType: 'date',
                onAnswer: (value) => {
                    this.formData.birthdate = value;
                    const birthYear = new Date(value).getFullYear();
                    const age = new Date().getFullYear() - birthYear;
                    return { text: `${age}살이시군요! 완벽해요! ✨`, emotion: 'excited', delay: 600 };
                }
            },
            // 6: Complete
            {
                betyMessages: [
                    { text: '모든 준비가 끝났어요! 🎉', emotion: 'lovely', delay: 800 },
                    { text: `${this.formData.name}님, 이제 특별한 인연을 찾아볼까요?`, emotion: 'lovely', delay: 1400 }
                ],
                inputType: 'complete',
                continueText: '시작하기'
            }
        ];

        this.init();
    }

    init() {
        console.log('💬 Chat Signup initialized');
        this.startConversation();
    }

    async startConversation() {
        await this.processStep(0);
    }

    async processStep(stepIndex) {
        if (stepIndex >= this.conversationFlow.length) {
            this.completeSignup();
            return;
        }

        this.currentStep = stepIndex;
        const step = this.conversationFlow[stepIndex];

        // Show Bety's messages
        for (const msg of step.betyMessages) {
            await this.showBetyMessage(msg.text, msg.emotion, msg.delay);
        }

        // Show input based on type
        this.showInput(step);
    }

    async showBetyMessage(text, emotion, delay = 800) {
        // Show typing indicator
        const typingMsg = this.addMessage('bety', '', emotion, true);

        await this.sleep(delay);

        // Remove typing, show actual message
        typingMsg.remove();
        this.addMessage('bety', text, emotion);

        this.scrollToBottom();
    }

    addMessage(sender, text, emotion = 'happy', isTyping = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;

        if (sender === 'bety') {
            const avatar = document.createElement('div');
            avatar.className = 'bety-avatar';
            avatar.innerHTML = `<img src="${this.betyImages[emotion]}" alt="베티">`;
            messageDiv.appendChild(avatar);
        }

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        if (isTyping) {
            const typingDiv = document.createElement('div');
            typingDiv.className = 'typing-indicator';
            typingDiv.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';
            contentDiv.appendChild(typingDiv);
        } else {
            const bubbleDiv = document.createElement('div');
            bubbleDiv.className = 'message-bubble';
            bubbleDiv.textContent = text;
            contentDiv.appendChild(bubbleDiv);
        }

        messageDiv.appendChild(contentDiv);
        this.messagesContainer.appendChild(messageDiv);

        return messageDiv;
    }

    showInput(step) {
        this.inputArea.innerHTML = '';

        switch (step.inputType) {
            case 'continue':
            case 'complete':
                this.showContinueButton(step);
                break;
            case 'email':
            case 'password':
            case 'text':
                this.showTextInput(step);
                break;
            case 'gender':
                this.showGenderButtons();
                break;
            case 'date':
                this.showDateInput(step);
                break;
        }
    }

    showTextInput(step) {
        const container = document.createElement('div');
        container.className = 'input-text-container';

        const input = document.createElement('input');
        input.type = step.inputType === 'password' ? 'password' : step.inputType === 'email' ? 'email' : 'text';
        input.className = 'input-text';
        input.placeholder = step.placeholder || '';
        input.autofocus = true;

        const button = document.createElement('button');
        button.className = 'btn-send';
        button.innerHTML = '➤';
        button.disabled = true;

        input.addEventListener('input', () => {
            button.disabled = !input.value.trim();
        });

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && input.value.trim()) {
                this.handleTextSubmit(input.value, step);
            }
        });

        button.addEventListener('click', () => {
            this.handleTextSubmit(input.value, step);
        });

        container.appendChild(input);
        container.appendChild(button);
        this.inputArea.appendChild(container);

        setTimeout(() => input.focus(), 100);
    }

    async handleTextSubmit(value, step) {
        const validation = step.validation ? step.validation(value) : null;

        if (validation) {
            alert(validation);
            return;
        }

        // Disable input
        this.inputArea.classList.add('input-loading');

        // Show user's answer
        this.addMessage('user', value);
        this.scrollToBottom();

        await this.sleep(400);

        // Get Bety's response
        const response = step.onAnswer(value);
        await this.showBetyMessage(response.text, response.emotion, response.delay);

        await this.sleep(600);

        // Next step
        this.inputArea.classList.remove('input-loading');
        this.processStep(this.currentStep + 1);
    }

    showGenderButtons() {
        const container = document.createElement('div');
        container.className = 'gender-buttons';

        const maleBtn = document.createElement('button');
        maleBtn.className = 'gender-btn';
        maleBtn.innerHTML = '<span class="icon">👨</span><span>남성</span>';
        maleBtn.onclick = () => this.handleGenderSelect('male', '남성');

        const femaleBtn = document.createElement('button');
        femaleBtn.className = 'gender-btn';
        femaleBtn.innerHTML = '<span class="icon">👩</span><span>여성</span>';
        femaleBtn.onclick = () => this.handleGenderSelect('female', '여성');

        container.appendChild(maleBtn);
        container.appendChild(femaleBtn);
        this.inputArea.appendChild(container);
    }

    async handleGenderSelect(value, text) {
        this.inputArea.classList.add('input-loading');

        this.addMessage('user', text);
        this.scrollToBottom();

        await this.sleep(400);

        const step = this.conversationFlow[this.currentStep];
        const response = step.onAnswer(value);
        await this.showBetyMessage(response.text, response.emotion, response.delay);

        await this.sleep(600);

        this.inputArea.classList.remove('input-loading');
        this.processStep(this.currentStep + 1);
    }

    showDateInput(step) {
        const container = document.createElement('div');

        const input = document.createElement('input');
        input.type = 'date';
        input.className = 'input-date';
        input.max = '2010-01-01';

        const button = document.createElement('button');
        button.className = 'btn-action';
        button.textContent = '확인';
        button.disabled = true;

        input.addEventListener('change', () => {
            button.disabled = !input.value;
        });

        button.addEventListener('click', () => {
            this.handleDateSubmit(input.value, step);
        });

        container.appendChild(input);
        container.appendChild(button);
        this.inputArea.appendChild(container);
    }

    async handleDateSubmit(value, step) {
        this.inputArea.classList.add('input-loading');

        const formattedDate = new Date(value).toLocaleDateString('ko-KR');
        this.addMessage('user', formattedDate);
        this.scrollToBottom();

        await this.sleep(400);

        const response = step.onAnswer(value);
        await this.showBetyMessage(response.text, response.emotion, response.delay);

        await this.sleep(600);

        this.inputArea.classList.remove('input-loading');
        this.processStep(this.currentStep + 1);
    }

    showContinueButton(step) {
        const button = document.createElement('button');
        button.className = 'btn-action';
        button.textContent = step.continueText;
        button.onclick = () => this.handleContinue(step);
        this.inputArea.appendChild(button);
    }

    async handleContinue(step) {
        this.inputArea.classList.add('input-loading');

        await this.sleep(400);

        this.inputArea.classList.remove('input-loading');

        if (step.inputType === 'complete') {
            this.completeSignup();
        } else {
            this.processStep(this.currentStep + 1);
        }
    }

    completeSignup() {
        console.log('🎉 Signup completed!');
        console.log('📝 Form Data:', this.formData);

        localStorage.setItem('signupData', JSON.stringify({
            ...this.formData,
            completedAt: new Date().toISOString()
        }));

        // Show success message
        this.inputArea.innerHTML = '';
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.innerHTML = `
            <div class="success-icon">🎉</div>
            <div class="success-text">가입이 완료되었어요!</div>
        `;
        this.inputArea.appendChild(successDiv);

        setTimeout(() => {
            window.location.href = '/index.html';
        }, 2000);
    }

    scrollToBottom() {
        setTimeout(() => {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }, 100);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new ChatSignup();
});
