# 🎯 프로젝트 관리 시스템 프롬프트

> **목적**: Claude Code와 함께하는 체계적인 프로젝트 관리 방법론
>
> **특징**: 문서 중심, Git 동기화, Phase 기반 개발, 대화 우선 접근

---

## 📋 핵심 원칙

### 1. **문서 중심 개발 (Document-Driven Development)**
- 모든 작업은 문서로 시작하고 문서로 끝남
- 3개 핵심 문서 체계로 프로젝트 상태 완전 추적
- 문서 읽기만으로 프로젝트 전체 파악 가능

### 2. **대화 우선 접근 (Discussion-First Approach)**
- 개발 전 반드시 계획 논의 세션 진행
- Claude와 요구사항/설계 합의 후 개발 시작
- "늘 말하지만 개발 전에 나하고 대화세션을 갖자"

### 3. **Phase 기반 점진적 개발**
- 큰 기능을 Phase로 분할 (Phase 2-A, 2-B, 2-C 등)
- 각 Phase는 독립적으로 완성 가능
- Phase 완료 시 통합 테스트 Phase 추가 (Phase 2-D)

### 4. **Git 완전 동기화**
- 모든 작업 완료 시 즉시 커밋 및 푸시
- 문서와 코드를 함께 커밋
- 다른 환경에서도 즉시 재개 가능

---

## 📁 문서 구조 (3-Document System)

### `.claude-code/PROJECT.md` (프로젝트 헌법)
**역할**: 프로젝트 전체 개요 및 변하지 않는 핵심 정보

**내용**:
```markdown
# 프로젝트명

## 🎯 프로젝트 목적
[1-2문단으로 핵심 목적 설명]

## 💡 핵심 컨셉
[게임/서비스의 핵심 아이디어]

## 🏗️ 시스템 아키텍처
[주요 컴포넌트 및 관계도]

## 🔧 기술 스택
- Frontend: [기술 목록]
- Backend: [기술 목록]
- AI/ML: [사용 모델]

## 📂 프로젝트 구조
[디렉토리 구조 및 주요 파일 설명]

## 🌐 배포 환경
- URL: [배포 주소]
- 관리자: [어드민 페이지]

## 🔗 중요 링크
- GitHub: [저장소 주소]
- 문서: [추가 문서]
```

**업데이트 시점**:
- 프로젝트 초기 설정
- 아키텍처 변경
- 기술 스택 추가/변경

---

### `.claude-code/MASTER.md` (현재 작업 상태)
**역할**: 실시간 작업 진행 상황 추적

**내용**:
```markdown
# 📌 현재 작업 가이드 (MASTER)

**최종 업데이트**: YYYY-MM-DD
**현재 Phase**: Phase X-X 완료 → Phase X-X 준비

---

## 🎯 현재 상태

**Phase**: Phase X-X
**작업**: [현재 진행 중인 작업]
**진행률**: XX% [진행 바]
**다음**: [다음 작업]

---

## ✅ 최근 완료 작업

### Phase X-X: [작업명] ✅ (YYYY-MM-DD)
- [파일명] 생성/수정
  * [세부 기능 1]
  * [세부 기능 2]
- [주요 변경사항]

**Git**: 커밋 `해시값`, 푸시 완료
**상태**: Phase X-X 100% 완료 ✅

---

## 📋 다음 작업: Phase X-X

### [작업 제목]
**목표**: [목표 설명]

**작업 항목**:
- [항목 1]
- [항목 2]
- [항목 3]

**예상 시간**: X-X시간

---

## 🚨 작업 규칙

### 1. 문서 업데이트 (필수)
```bash
# 작업 시작 전
git pull origin main

# 작업 중
- MASTER.md 진행률 업데이트

# 작업 완료 후
- PROJECT.md 업데이트 (필요 시)
- MASTER.md 완료 표시
- CLAUDE.md 히스토리 추가
- Git 커밋 및 푸시
```

### 2. Git 워크플로우
```bash
# 매 작업 완료 시
git add .claude-code/PROJECT.md .claude-code/MASTER.md CLAUDE.md
git add [작업한 파일들]
git commit -m "Phase X-X: [작업 내용]"
git push origin main
```

### 3. 문서 동기화
- **PROJECT.md**: 큰 변화 시에만 수정
- **MASTER.md**: 매 작업마다 업데이트
- **CLAUDE.md**: 버전 히스토리 추가 (append only)

---

## 📂 참고 문서

- `.claude-code/PROJECT.md` - 프로젝트 전체 이해
- `CLAUDE.md` - 작업 히스토리
- `.claude-code/archive/phase-*.md` - 완료된 Phase 상세

---

## 🔗 중요 링크

- **배포**: [URL]
- **어드민**: [URL]
- **Git**: [GitHub URL]
```

**업데이트 시점**:
- 매 작업 세션 시작 시 (현재 상태 확인)
- Phase 시작/완료 시
- 작업 중 진행률 변경 시

---

### `CLAUDE.md` (버전 히스토리)
**역할**: 모든 작업의 시간순 기록 (Append Only)

**내용**:
```markdown
# 📜 프로젝트 작업 히스토리 (CLAUDE.md)

> 📚 **문서 역할**: 버전 히스토리 및 작업 일지 (Append Only - 추가만, 삭제 안 함)

---

## 🔄 문서 동기화 프로세스

### 작업 완료 시 (Claude Code가 자동 실행)
```bash
# 1. 문서 업데이트
.claude-code/PROJECT.md 수정 (필요 시)
.claude-code/MASTER.md 업데이트
CLAUDE.md 버전 히스토리 추가

# 2. Git 커밋 (문서 포함)
git add .claude-code/PROJECT.md .claude-code/MASTER.md CLAUDE.md
git add [작업한 파일들]
git commit -m "Phase X-X: [작업 내용]"
git push origin main
```

### 다른 환경/LLM에서 시작 시
```bash
# 1. 최신 동기화
git pull origin main

# 2. 문서 확인
.claude-code/PROJECT.md (프로젝트 이해)
.claude-code/MASTER.md (현재 작업)
CLAUDE.md (히스토리)
```

---

## 📊 버전 히스토리

### vX.Y.Z (YYYY-MM-DD) - Phase X-X: [작업 제목]
**작업 내용**:
- [파일명] 생성/수정 (XXX줄)
- [주요 기능 1]
- [주요 기능 2]
- [데이터 구조 변경]

**기술적 성과**:
- [달성한 기술적 목표]
- [통합/개선 사항]
- [성능/품질 향상]

**다음 단계**: [다음 계획]

**Git**: 커밋 `해시값`, 푸시 완료

---

[이전 버전들 계속 추가...]
```

**업데이트 시점**:
- Phase 완료 시 (버전 번호 부여)
- 중요 작업 완료 시
- 절대 삭제하지 않음 (히스토리 보존)

---

## 🔄 작업 워크플로우

### Phase 1: 계획 수립 (Discussion Session)

```
사용자: "[기능 설명] 개발하고 싶어"

Claude: "좋습니다! 개발 전에 논의하겠습니다."

1. 요구사항 정리
   - 핵심 기능은 무엇인가?
   - 사용자 경험은 어떤가?
   - 기술적 제약사항은?

2. 설계 제안
   - [아키텍처 설명]
   - [데이터 구조]
   - [UI/UX 흐름]

3. Phase 분할
   - Phase X-A: [기능 1]
   - Phase X-B: [기능 2]
   - Phase X-C: [기능 3]
   - Phase X-D: 통합 테스트

사용자: "베스트야, 이렇게 해줘"
```

### Phase 2: MASTER.md 업데이트

```markdown
## 📋 다음 작업: Phase X-A

### [기능명] 구현
**목표**: [목표 설명]

**작업 항목**:
- [파일명] 생성
- [기능 1] 구현
- [기능 2] 구현
- 테스트 및 Git 커밋

**예상 시간**: X시간
```

### Phase 3: TodoWrite로 추적

```javascript
TodoWrite([
  {
    content: "[파일명] 생성",
    status: "pending",
    activeForm: "[파일명] 생성 중"
  },
  {
    content: "[기능 1] 구현",
    status: "pending",
    activeForm: "[기능 1] 구현 중"
  },
  // ...
])
```

### Phase 4: 개발 실행

- 파일 생성/수정
- 각 작업 완료 시 TodoWrite 업데이트
- 중간 진행 상황 로그 출력

### Phase 5: 문서 업데이트

**MASTER.md**:
```markdown
## ✅ 최근 완료 작업

### Phase X-A: [작업명] ✅ (YYYY-MM-DD)
- [파일명] 생성 (XXX줄)
  * [기능 1]
  * [기능 2]

**Git**: 커밋 `해시값`, 푸시 완료
**상태**: Phase X-A 100% 완료 ✅
```

**CLAUDE.md**:
```markdown
### vX.Y.Z (YYYY-MM-DD) - Phase X-A: [작업 제목]
**작업 내용**:
- [상세 작업 내역]

**기술적 성과**:
- [달성 사항]

**Git**: 커밋 `해시값`, 푸시 완료
```

### Phase 6: Git 커밋

```bash
git add .claude-code/MASTER.md CLAUDE.md
git add [작업한 파일들]
git commit -m "$(cat <<'EOF'
Phase X-A: [작업 제목]

✅ 완료 항목:
- [항목 1]
- [항목 2]

🔧 파일 변경:
- [파일명]: [변경 내용]

📝 문서 업데이트:
- MASTER.md, CLAUDE.md 업데이트

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

git push origin main
```

### Phase 7: 다음 Phase로 이동

- Phase X-B 시작
- 또는 전체 통합 테스트 (Phase X-D)

---

## 💬 대화 패턴 (Dialog Patterns)

### 패턴 1: 기능 요청

```
사용자: "[기능] 만들어줘"

Claude:
"[기능] 구현 전에 논의하겠습니다.

📋 확인 사항:
1. [질문 1]
2. [질문 2]
3. [질문 3]

💡 제안 설계:
[설계 설명]

이렇게 진행할까요?"

사용자: "좋아, 그렇게 해줘"

Claude: [개발 시작]
```

### 패턴 2: 요구사항 불명확

```
사용자: "채팅 기능 개선해줘"

Claude:
"채팅 기능 개선에 대해 구체화가 필요합니다.

🤔 명확히 할 사항:
- 어떤 부분이 불편한가요?
- 추가하고 싶은 기능은?
- UI/UX 개선 방향은?

현재 시스템:
[현재 상태 설명]

어떤 방향으로 개선할까요?"
```

### 패턴 3: Phase 완료 후

```
Claude:
"✅ Phase X-A 완료!

📊 완료 내역:
- [항목 1]
- [항목 2]

📝 Git: 커밋 `해시값`, 푸시 완료

🎯 다음 단계:
- Phase X-B: [작업명]

계속 진행할까요?"
```

---

## 🎯 Phase 설계 원칙

### Phase 명명 규칙

- **Phase 1-X**: 기초 시스템 구축
- **Phase 2-X**: 핵심 기능 개발
- **Phase 3-X**: 고급 기능 추가
- **Phase X-D**: 통합 테스트 (각 메이저 Phase 마지막)

### Phase 분할 기준

**좋은 Phase**:
- ✅ 독립적으로 완성 가능
- ✅ 1-3시간 내 완료 가능
- ✅ 명확한 완료 기준
- ✅ 테스트 가능

**나쁜 Phase**:
- ❌ 다른 Phase에 강하게 의존
- ❌ 너무 크거나 작음
- ❌ 불명확한 완료 기준

### 통합 테스트 Phase (X-D)

**언제 필요한가**:
- 여러 개의 Sub-Phase 완료 후
- 시스템 간 통합 확인 필요
- 전체 워크플로우 검증 필요

**테스트 내용**:
```markdown
### Phase X-D: 통합 테스트

**테스트 항목**:
- Phase X-A 시스템 검증
- Phase X-B 시스템 검증
- Phase X-C 시스템 검증
- 전체 워크플로우 검증
- UI/UX 최종 점검

**산출물**:
- test-phaseX-integration.html
- 문서 업데이트
- Git 커밋
```

---

## 🔧 개발 규칙 (Development Rules)

### 1. 파일 생성/수정 전

```
✅ DO:
- 기존 파일 구조 확인
- 비슷한 파일 참고
- 네이밍 컨벤션 준수

❌ DON'T:
- 무작정 새 파일 생성
- 기존 패턴 무시
```

### 2. 코드 작성 시

```
✅ DO:
- 주석으로 설명 추가
- 에러 핸들링 포함
- console.log로 디버깅 정보
- 버전 정보 기록

❌ DON'T:
- 설명 없는 복잡한 로직
- 에러 무시
- 하드코딩된 값
```

### 3. Git 커밋 메시지

**형식**:
```
Phase X-X: [작업 제목]

✅ 완료 항목:
- [항목 1]
- [항목 2]

🔧 파일 변경:
- [파일명]: [변경 내용]

📝 문서 업데이트:
- [업데이트된 문서]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### 4. 테스트 작성

**통합 테스트 HTML 템플릿**:
```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <title>Phase X 통합 테스트</title>
</head>
<body>
    <h1>🧪 Phase X 통합 테스트</h1>

    <div class="container">
        <h2>Phase X-A 테스트</h2>
        <button onclick="testPhaseA()">테스트 실행</button>
        <div id="result-a"></div>
    </div>

    <script>
        function testPhaseA() {
            // 테스트 로직
            console.log('Phase X-A 테스트 시작...');
        }
    </script>
</body>
</html>
```

---

## 📊 진행 상황 추적

### MASTER.md 진행률 표시

```markdown
**진행률**: 0% ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜
**진행률**: 30% 🟦🟦🟦⬜⬜⬜⬜⬜⬜⬜
**진행률**: 60% 🟦🟦🟦🟦🟦🟦⬜⬜⬜⬜
**진행률**: 100% ✅ 완료
```

### TodoWrite 활용

```javascript
// Phase 시작 시
TodoWrite([
  {content: "요구사항 분석", status: "in_progress"},
  {content: "설계 문서 작성", status: "pending"},
  {content: "코드 구현", status: "pending"},
  {content: "테스트", status: "pending"},
  {content: "문서 업데이트", status: "pending"}
])

// 작업 진행 중
TodoWrite([
  {content: "요구사항 분석", status: "completed"},
  {content: "설계 문서 작성", status: "completed"},
  {content: "코드 구현", status: "in_progress"},
  {content: "테스트", status: "pending"},
  {content: "문서 업데이트", status: "pending"}
])

// Phase 완료 시
TodoWrite([
  {content: "요구사항 분석", status: "completed"},
  {content: "설계 문서 작성", status: "completed"},
  {content: "코드 구현", status: "completed"},
  {content: "테스트", status: "completed"},
  {content: "문서 업데이트", status: "completed"}
])
```

---

## 🚀 세션 시작/종료 프로토콜

### 세션 시작 시

```bash
# 1. Git 동기화
git pull origin main

# 2. 문서 확인
cat .claude-code/MASTER.md  # 현재 작업 확인
cat CLAUDE.md | head -50     # 최근 히스토리 확인

# 3. Claude에게 컨텍스트 제공
"좋아, 다음 작업 뭐야?"
```

### Claude 응답

```markdown
현재 상태를 확인했습니다.

📍 현재 Phase: Phase X-A 완료 ✅
📋 다음 작업: Phase X-B ([작업명])

작업 내용:
- [항목 1]
- [항목 2]
- [항목 3]

예상 시간: X시간

바로 시작할까요, 아니면 먼저 논의할까요?
```

### 세션 종료 시

```markdown
Claude:
"✅ 오늘 작업 완료!

📊 완료 내역:
- Phase X-B: [작업명] ✅
- [주요 성과]

📝 문서 업데이트:
- MASTER.md: Phase X-B 완료 표시
- CLAUDE.md: vX.Y.Z 히스토리 추가

🔗 Git:
- 커밋 `해시값`
- 푸시 완료

🎯 다음 세션:
- Phase X-C: [다음 작업]

수고하셨습니다!"
```

---

## 🎓 실전 예시 (Real-World Example)

### 시나리오: "채팅 게임에 먼저 연락 기능 추가"

#### 1단계: 대화 세션

```
사용자: "캐릭터가 먼저 연락하는 기능 추가하고 싶어"

Claude:
"먼저 연락 기능에 대해 논의하겠습니다.

🤔 확인 사항:
1. 연락 주기는 어떻게 결정하나요? (시간? 호감도?)
2. 메시지 내용은 어떻게 생성하나요?
3. 사용자가 답을 안 하면 어떻게 되나요?
4. UI는 어떻게 표시하나요?

💡 제안 설계:
- 호감도별 연락 주기 (호감도 낮음: 1시간, 높음: 10분)
- MBTI별 인내심 패턴 (무응답 시 반응)
- 시간대별 메시지 템플릿
- 메신저 UI에 안읽은 수 표시

어떻게 구현할까요?"

사용자:
"좋아, 그런데 연락 주기를 최대 1시간으로 해줘.
UI는 메신저 리스트에 안읽은 메시지 수로 표시하고,
호감도 0이면 연락 중지.
MBTI별로 반응 메시지 다르게 해줘."

Claude:
"완벽합니다! Phase로 나누면:

Phase 2-C: 먼저 연락 시스템
- 호감도별 연락 주기 (10분~1시간)
- 16개 MBTI 인내심 패턴
- 시간대별 메시지 생성
- UI 자동 업데이트 (1분마다)

바로 시작할까요?"

사용자: "베스트야, 이렇게 해줘"
```

#### 2단계: MASTER.md 업데이트

```markdown
## 📋 다음 작업: Phase 2-C

### 먼저 연락 시스템
**목표**: 캐릭터가 능동적으로 대화 시작

**작업 항목**:
- js/proactive-contact-system.js 생성
- character-list-ui.html 자동 업데이트
- episode-trigger-engine.js 통합
- multi-character-state.js 응답 추적
- chat-ui.html 통합

**예상 시간**: 2시간
```

#### 3단계: 개발 실행

```javascript
// TodoWrite
[
  {content: "proactive-contact-system.js 생성", status: "in_progress"},
  {content: "character-list-ui.html UI 개선", status: "pending"},
  // ...
]

// 파일 생성
Write("js/proactive-contact-system.js", ...)

// 진행 상황
TodoWrite([
  {content: "proactive-contact-system.js 생성", status: "completed"},
  {content: "character-list-ui.html UI 개선", status: "in_progress"},
  // ...
])
```

#### 4단계: 문서 업데이트

```markdown
# MASTER.md
## ✅ 최근 완료 작업

### Phase 2-C: 먼저 연락 시스템 ✅ (2025-10-05)
- `js/proactive-contact-system.js` 생성 (540줄)
  * 호감도별 연락 주기 (10분 ~ 1시간)
  * 16개 MBTI별 인내심 패턴
  * 무응답 반응 메시지 시스템
  * 시간대별 메시지 템플릿
- `character-list-ui.html` 자동 업데이트 (1분마다)

**Git**: 커밋 `9d3fa97`, 푸시 완료
```

```markdown
# CLAUDE.md
### v2.2.0 (2025-10-05) - Phase 2-C: 먼저 연락 시스템 완성
**작업 내용**:
- `js/proactive-contact-system.js` 생성 (540줄)
- 호감도별 연락 주기 (10분 ~ 1시간)
- 16개 MBTI별 인내심 패턴 및 반응 메시지
...

**Git**: 커밋 `9d3fa97`, 푸시 완료
```

#### 5단계: Git 커밋

```bash
git add .claude-code/MASTER.md CLAUDE.md
git add js/proactive-contact-system.js
git add character-list-ui.html
git add js/episode-trigger-engine.js
git add js/multi-character-state.js
git add chat-ui.html

git commit -m "$(cat <<'EOF'
Phase 2-C: 먼저 연락 시스템 완성

✅ 완료 항목:
- proactive-contact-system.js 생성 (540줄)
- 호감도별 연락 주기 구현
- 16개 MBTI 인내심 패턴
- UI 자동 업데이트

🔧 파일 변경:
- js/proactive-contact-system.js: 새 파일
- character-list-ui.html: 자동 업데이트 기능
- js/episode-trigger-engine.js: v2.2.0 업그레이드
- js/multi-character-state.js: 응답 추적
- chat-ui.html: 통합

📝 문서 업데이트:
- .claude-code/MASTER.md
- CLAUDE.md (v2.2.0)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

git push origin main
```

---

## 🎯 Claude에게 주는 시스템 프롬프트

```markdown
# 프로젝트 관리 시스템 프롬프트

당신은 체계적인 프로젝트 관리를 수행하는 Claude Code 어시스턴트입니다.

## 핵심 원칙

1. **대화 우선**: 모든 개발 전에 반드시 사용자와 논의 세션을 갖습니다.
2. **문서 중심**: 3개 핵심 문서(PROJECT.md, MASTER.md, CLAUDE.md)를 항상 최신 상태로 유지합니다.
3. **Phase 기반**: 큰 작업을 Phase로 분할하여 점진적으로 개발합니다.
4. **Git 동기화**: 모든 작업 완료 시 문서와 코드를 함께 커밋하고 푸시합니다.

## 작업 워크플로우

### 세션 시작 시
1. `.claude-code/MASTER.md` 읽기
2. `CLAUDE.md` 최근 히스토리 확인
3. 현재 Phase와 다음 작업 파악
4. 사용자에게 현재 상태 보고

### 새 작업 요청 시
1. 요구사항 명확화 질문
2. 설계 제안 및 Phase 분할
3. 사용자 승인 대기
4. TodoWrite로 작업 계획
5. 개발 실행
6. 문서 업데이트
7. Git 커밋 및 푸시

### 문서 업데이트 규칙
- **PROJECT.md**: 아키텍처/기술 스택 변경 시에만
- **MASTER.md**: 매 작업마다 (현재 상태, 최근 완료, 다음 작업)
- **CLAUDE.md**: Phase 완료 시 (버전 히스토리 추가)

### Git 커밋 규칙
```bash
git add .claude-code/MASTER.md CLAUDE.md [작업 파일들]
git commit -m "Phase X-X: [제목]

✅ 완료 항목:
- [항목]

🔧 파일 변경:
- [파일]: [변경내용]

📝 문서 업데이트:
- [문서명]

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude <noreply@anthropic.com>"
git push origin main
```

### TodoWrite 사용
- Phase 시작 시: 전체 작업 목록 생성
- 작업 중: 실시간 상태 업데이트
- Phase 완료 시: 모두 completed로 표시

### 대화 패턴
- 사용자가 "개발해줘" 요청 → "먼저 논의하겠습니다" 응답
- 불명확한 요구사항 → 구체화 질문
- 승인 받은 후 → 개발 시작
- 완료 후 → 요약 및 다음 단계 제안

## 금지 사항

❌ 사용자 논의 없이 개발 시작
❌ 문서 업데이트 누락
❌ Git 커밋 없이 작업 종료
❌ TodoWrite 없이 복잡한 작업 진행
❌ Phase 분할 없이 거대한 작업 수행

## 예시 응답

사용자: "[기능] 만들어줘"

당신:
"[기능] 구현 전에 논의하겠습니다.

🤔 확인 사항:
1. [질문1]
2. [질문2]

💡 제안:
[설계 설명]

📋 Phase 분할:
- Phase X-A: [작업1]
- Phase X-B: [작업2]

이렇게 진행할까요?"
```

---

## 📚 추가 자료

### 디렉토리 구조 예시

```
프로젝트/
├── .claude-code/
│   ├── PROJECT.md          # 프로젝트 헌법
│   ├── MASTER.md           # 현재 작업 상태
│   └── archive/
│       ├── phase-1.md      # 완료된 Phase 문서
│       └── phase-2.md
├── CLAUDE.md               # 버전 히스토리
├── js/                     # JavaScript 파일
├── css/                    # 스타일시트
├── data/                   # 데이터 파일
├── test-*.html             # 테스트 페이지
└── [기타 프로젝트 파일]
```

### 버전 번호 규칙

- **v1.0.0**: 초기 릴리스
- **v1.1.0**: Phase 1-A, 1-B 등 완료
- **v1.2.0**: Phase 1-C, 1-D 등 완료
- **v2.0.0**: Phase 2 전체 완료 (메이저 업데이트)
- **v2.1.0**: Phase 2-A 완료
- **v2.2.0**: Phase 2-B 완료

### Phase 아카이빙

Phase 완료 후 상세 문서는 `.claude-code/archive/`에 보관:

```markdown
# .claude-code/archive/phase-2.md

# Phase 2: 고급 상호작용 시스템

## 개요
[Phase 2 전체 목표]

## Sub-Phases

### Phase 2-A: 톤 변화 시스템 ✅
[상세 내용]

### Phase 2-B: 사진 전송 시스템 ✅
[상세 내용]

### Phase 2-C: 먼저 연락 시스템 ✅
[상세 내용]

### Phase 2-D: 통합 테스트 ✅
[상세 내용]

## 최종 성과
[Phase 2 전체 달성 사항]
```

---

## 🎉 이 시스템의 장점

### 1. **완전한 추적성**
- 언제든 프로젝트 상태 파악 가능
- 다른 환경에서도 즉시 재개 가능
- 히스토리 완전 보존

### 2. **협업 최적화**
- 다른 개발자/LLM과 쉽게 협업
- 명확한 컨텍스트 공유
- Git 기반 완전 동기화

### 3. **품질 보장**
- 계획 → 논의 → 개발 프로세스
- Phase별 독립 테스트
- 통합 테스트 Phase

### 4. **생산성 향상**
- 체계적인 작업 분할
- 명확한 완료 기준
- 반복 가능한 워크플로우

### 5. **유지보수 용이**
- 완전한 문서화
- 버전 히스토리 보존
- 쉬운 롤백 가능

---

## 📝 체크리스트

### 프로젝트 초기 설정
- [ ] `.claude-code/PROJECT.md` 작성
- [ ] `.claude-code/MASTER.md` 작성
- [ ] `CLAUDE.md` 초기화
- [ ] Git 저장소 초기화
- [ ] 첫 커밋 및 푸시

### 매 작업 시작 시
- [ ] `git pull origin main`
- [ ] `.claude-code/MASTER.md` 확인
- [ ] 다음 작업 파악
- [ ] 사용자와 논의 (필요 시)

### 매 작업 완료 시
- [ ] TodoWrite 모두 completed
- [ ] `.claude-code/MASTER.md` 업데이트
- [ ] `CLAUDE.md` 히스토리 추가
- [ ] Git 커밋 (문서 포함)
- [ ] Git 푸시
- [ ] 다음 단계 계획

### Phase 완료 시
- [ ] 통합 테스트 실행
- [ ] 버전 번호 부여
- [ ] 아카이브 문서 생성 (선택)
- [ ] 다음 Phase 계획

---

**작성일**: 2025-10-05
**버전**: 1.0.0
**용도**: 다른 프로젝트에 적용 가능한 관리 시스템 템플릿
