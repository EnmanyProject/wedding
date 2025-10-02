# Git 작업 워크플로우 지침

## 🚨 필수 규칙
**모든 작업 완료 후 반드시 커밋과 푸시를 진행합니다.**

## 커밋 주기
- **작업 단위별**: 기능 구현, 버그 수정, UI 개선 등 의미 있는 작업이 완료될 때마다
- **강제 실행**: Claude Code가 매 작업 후 자동으로 커밋/푸시 수행
- **최대 간격**: 30분 이내 또는 5개 이상 파일 수정 시

## 커밋 명령어 템플릿

### 1. 변경사항 스테이징
```bash
git add .
```

### 2. 커밋 메시지 작성
```bash
git commit -m "$(cat <<'EOF'
[type]: [간단한 한글 설명]

- [세부 변경사항 1]
- [세부 변경사항 2]
- [세부 변경사항 3]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

### 3. GitHub에 푸시
```bash
git push origin main
```

## 커밋 타입 (type)
- `feat`: 새로운 기능 추가
- `fix`: 버그 수정
- `ui`: UI/UX 개선
- `style`: 스타일링 변경
- `refactor`: 코드 리팩토링
- `perf`: 성능 개선
- `docs`: 문서 수정
- `config`: 설정 파일 변경
- `test`: 테스트 추가/수정

## 커밋 메시지 예시

### 기능 구현
```bash
git commit -m "$(cat <<'EOF'
feat: 퀴즈 카드 모바일 최적화 구현

- 퀴즈 옵션을 세로 배치로 변경하여 모바일 화면 너비 초과 방지
- 반응형 모달 크기 조정 (max-width: min(400px, 95vw))
- 터치 접근성 향상을 위한 최소 높이 44px 설정
- 모바일 전용 CSS 미디어 쿼리 추가

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

### 버그 수정
```bash
git commit -m "$(cat <<'EOF'
fix: 카드 스와이프 터치 인식 오류 해결

- 터치 이벤트와 클릭 이벤트 충돌 문제 해결
- 10px 이상 이동 시에만 스와이프로 인식하도록 수정
- hasMovedEnough 플래그로 탭과 스와이프 구분

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

### UI 개선
```bash
git commit -m "$(cat <<'EOF'
ui: 베티 캐릭터 디자인 및 카드 정렬 개선

- 베티 캐릭터 원형 배경 제거
- 카드 중앙 정렬 알고리즘 개선
- 푸터 디자인 반응형 레이아웃 적용

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

## 작업 플로우

### 작업 시작 전
```bash
git status  # 현재 상태 확인
git pull origin main  # 최신 변경사항 동기화
```

### 작업 완료 후
```bash
git add .
git commit -m "[커밋 메시지]"
git push origin main
```

### 상태 확인
```bash
git status  # 변경사항 확인
git log --oneline -5  # 최근 5개 커밋 확인
```

## 🔄 자동화 규칙

**Claude Code는 다음 상황에서 자동으로 커밋/푸시를 수행합니다:**

1. **작업 완료 시**: 사용자가 요청한 기능이나 수정이 완료되었을 때
2. **파일 변경량 기준**: 5개 이상 파일이 수정되었을 때
3. **시간 기준**: 마지막 커밋으로부터 30분 경과 시
4. **세션 종료 전**: 대화가 길어져 종료될 가능성이 있을 때

## 🏷️ 버전 관리 시스템

### 자동 버전 생성
**모든 커밋과 푸시마다 자동으로 버전이 업데이트됩니다.**

### 버전 생성 명령어
```bash
# 버전 업데이트 스크립트 실행
node scripts/update-version.js

# 커밋 전 버전 업데이트 포함
node scripts/update-version.js && git add . && git commit -m "[커밋메시지]"
```

### 버전 형식
- **Git 기반**: `v1.{커밋수}.{빌드번호}-{커밋해시}`
  - 예: `v1.34.02-58e746a`
- **타임스탬프 기반**: `v1.0.{YYYYMMDD}.{HHMM}`
  - 예: `v1.0.20251002.1430`

### 버전 표시 위치
1. **앱 헤더**: 상단 제목 아래 작은 텍스트로 표시
2. **콘솔 로그**: 앱 시작 시 버전 정보 출력
3. **version.js 파일**: 전역 변수로 버전 정보 제공

### 자동 버전 워크플로우
```bash
# 1. 코드 수정 완료
# 2. 자동 버전 업데이트
node scripts/update-version.js

# 3. 변경사항 스테이징 (버전 파일 포함)
git add .

# 4. 커밋 (버전 정보 포함)
git commit -m "$(cat <<'EOF'
[type]: [설명] (v1.34.02-58e746a)

- 변경사항 1
- 변경사항 2

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

# 5. 푸시
git push origin main
```

### 버전 확인 방법
1. **웹 앱**: 헤더 상단에서 현재 버전 확인
2. **개발자 도구**: `window.APP_VERSION` 변수 확인
3. **Git**: `git log --oneline -1` 최신 커밋 확인

## 📋 체크리스트

### 매 작업 후 확인사항
- [ ] 모든 변경사항이 의도대로 작동하는지 확인
- [ ] 관련 파일들이 모두 수정되었는지 점검
- [ ] 커밋 메시지가 변경사항을 정확히 설명하는지 확인
- [ ] GitHub에 정상적으로 푸시되었는지 확인

### 긴급 상황 대응
```bash
# 커밋 취소 (아직 푸시하지 않은 경우)
git reset --soft HEAD~1

# 특정 파일만 커밋에서 제외
git reset HEAD [파일명]

# 강제 푸시 (신중하게 사용)
git push --force origin main
```

## 📍 중요 사항

1. **절대 main 브랜치에서 직접 작업하지 말 것** - 현재는 예외적으로 main에서 작업
2. **커밋 전 반드시 테스트 실행** - 개발 서버가 정상 작동하는지 확인
3. **의미 있는 커밋 단위 유지** - 너무 작거나 큰 변경사항 지양
4. **푸시 실패 시 즉시 해결** - 충돌이나 네트워크 오류 시 바로 대응

---

**이 지침은 프로젝트의 버전 관리 품질과 협업 효율성을 보장하기 위해 작성되었습니다.**
**모든 개발자와 AI 어시스턴트는 이 규칙을 준수해야 합니다.**