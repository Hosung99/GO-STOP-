## Project Context

- 목표: 실시간 멀티플레이어 고스톱(Go-Stop) 웹 애플리케이션 개발

- 프론트엔드 스택: React 18, TypeScript, TanStack Router, Zustand, TanStack Query, Tailwind CSS

- 백엔드 스택: Node.js, Socket.io, Supabase

- 배포 환경: 프론트엔드는 Vercel에 배포하고, 백엔드는 지연 시간 최소화를 위해 한국 서울(ap-northeast-2) 리전 인프라 사용

## Architecture Decisions

- 상태 관리 분리: TanStack Query는 API 요청 등 서버 상태 관리에만 사용하고, Zustand는 클라이언트 상태 및 웹소켓 데이터 동기화를 전담

- 웹소켓 싱글톤: 웹소켓 연결은 개별 React 컴포넌트 마운트/언마운트 생명주기에 의존하지 않고, 항상 싱글톤 서비스 패턴(Singleton Service Pattern)으로 중앙 집중화

- 서버 권위 모델(Server-Authoritative): 게임 로직의 단일 진실 원천(Source of Truth)은 백엔드 서버이며, 클라이언트는 서버의 유효성 검증 없이 상태 임의 조작 불가

## Code Style Preferences

- TypeScript: 모노레포 전체에서 항상 strict 모드로 작성하며 any 타입 사용 전면 금지

- React: 컴포넌트 파일은 ES 모듈(ES Modules) 방식을 사용하며, Named Exports를 우선하여 작성

- 타입 정의: 프론트엔드와 백엔드가 공유하는 웹소켓 이벤트 페이로드 및 FSM 상태 객체는 구별된 유니온(Discriminated Unions) 타입으로 명확하게 정의

## Workflow Commands

- 프론트엔드 개발 서버: pnpm dev:web

- 백엔드 개발 서버: pnpm dev:server

- 전역 타입 검사: pnpm typecheck

- 라우트 자동 생성: pnpm generate:routes

## Multi-Agent Workflow Rules

- 계획 모드(Plan mode): 코드를 바로 작성하지 말고, 항상 계획 모드를 통해 구현 단계를 먼저 설계하고 인간 오케스트레이터의 검토를 받은 후 코드 작성을 실행

- 에이전트별 브랜치(Branch-Per-Agent): 작업 충돌 방지를 위해 프론트엔드, 백엔드 등 각 역할별로 전용 브랜치를 생성하여 격리된 환경에서 개발 진행

- 동기화 지점(Sync Points): 병렬 작업 시 최소 30분마다 정기적인 동기화 지점을 마련하여, 최상위 기획 문서 및 합의된 API 명세 재확인

## Commit Strategy

- 커밋 빈도: 각 에이전트는 주요 작업이후 마다 커밋하여 작업 진행 상황을 자주 기록하고, 다른 에이전트와의 협업을 원활하게 유지
- 커밋 메시지 형식: [Agent] <Type>: <Description> (예: [Frontend] feat: Add game lobby UI)
- 커밋 유형:
  - feat: 새로운 기능 추가
  - fix: 버그 수정
  - refactor: 코드 리팩토링
  - docs: 문서 변경
  - chore: 기타 변경사항 (빌드 스크립트, 패키지 매니저 설정 등)
