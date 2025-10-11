# 📌 현재 작업 가이드 (MASTER)

**최종 업데이트**: 2025-10-11
**현재 Phase**: Phase 1 - 프로젝트 분석 및 초기 설정
**현재 버전**: v1.0.0

---

## 🎯 현재 상태

**진행 중**: Claude Code 에이전트 시스템 구축 완료
**다음 작업**: 프로젝트 구조 분석 및 핵심 기능 파악

---

## ✅ TODO 리스트

### 🔴 긴급 (이번 주)
- [x] Claude Code 에이전트 설정
- [x] 3대 문서 시스템 초기화
- [ ] 프로젝트 구조 분석 (Architect)
- [ ] 기존 파일 및 폴더 분석
- [ ] 핵심 기능 파악

### 🟡 중요 (이번 달)
- [ ] 주요 기능 목록 정리
- [ ] 개발 우선순위 결정
- [ ] Phase별 작업 계획 수립
- [ ] 각 폴더에 claude.md 생성

### 🟢 개선 (언젠가)
- [ ] 코드 리팩토링
- [ ] 성능 최적화
- [ ] 테스트 커버리지 향상
- [ ] 문서화 강화

---

## 📋 최근 완료 작업

### 2025-10-11
- [x] Claude Code 에이전트 4개 설정 완료
  - Architect (설계자)
  - Coder (개발자)
  - Reviewer (검증자)
  - Documenter (문서화)
- [x] 3대 문서 시스템 초기화
  - PROJECT.md (프로젝트 전체 개요)
  - MASTER.md (현재 작업 상태)
  - CLAUDE.md (버전 히스토리)
- [x] 폴더 구조 생성
  - `.claudecode/agents/` (에이전트 설정)
  - `.claude-code/` (문서 및 백업)

---

## 🚨 작업 규칙

### 버전 관리
- **Major (X.0.0)**: 대규모 구조 변경, 새로운 Phase
- **Minor (0.X.0)**: 새 기능 추가
- **Patch (0.0.X)**: 버그 수정, 소규모 개선

### 문서 동기화
- **PROJECT.md**: 큰 변화 시에만 (프로젝트 방향 전환 등)
- **MASTER.md**: 매 작업마다 (이 파일!)
- **CLAUDE.md**: 작업 완료 시마다 (버전 히스토리 추가)

### 에이전트 사용 가이드
1. **새 기능 추가**: Architect → Coder → Reviewer → Documenter
2. **버그 수정**: Reviewer → Coder → Documenter
3. **리팩토링**: Architect → Coder → Reviewer → Documenter
4. **문서 작업**: Documenter

---

## 🔗 빠른 명령어

### 프로젝트 분석
```bash
claude-code --agent architect "wedding 프로젝트 구조 분석 및 PROJECT.md 업데이트"
```

### 폴더별 문서 생성
```bash
claude-code --agent documenter "모든 폴더에 claude.md 생성"
```

### 현재 상태 리뷰
```bash
claude-code --agent reviewer "프로젝트 현재 상태 분석. 개선점 제안"
```

---

## 📝 작업 메모

### 프로젝트 이해하기
- [ ] 기존 파일들의 역할 파악
- [ ] 데이터 흐름 이해
- [ ] 주요 기능 정리
- [ ] 개선이 필요한 부분 찾기

### 다음 Phase 준비
- [ ] Phase 2 작업 목록 작성
- [ ] 우선순위 결정
- [ ] 일정 계획

---

**작성일**: 2025-10-11
**용도**: 현재 작업 상태 및 TODO 관리

> 💡 **추천**: 매일 작업 시작 시 이 파일을 먼저 확인하고, 작업 완료 시 체크 표시!
