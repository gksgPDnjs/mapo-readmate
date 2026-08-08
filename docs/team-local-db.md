# 팀 로컬 DB 연결·테스트 매뉴얼

## 목적

이 문서는 팀원이 공용 DB URL이나 외부 API 키 없이, 애플리케이션과 같은 PostgreSQL 기반 카탈로그·퀴즈·추천 API를 로컬에서 실행하고 연결 상태를 검증하는 방법을 안내합니다.

## 로컬 전용 접속 정보

Docker 개발 DB의 고정 연결 문자열은 아래와 같습니다.

```text
postgresql://mapo_readmate:mapo_readmate@localhost:5432/mapo_readmate
```

이 값은 Docker 로컬 개발 전용입니다. 공용 Supabase DB URL, 운영 DB URL, API 키는 Git, PR, 채팅에 올리지 말고 팀 비밀 관리 도구를 통해 전달받아 각자의 `.env`에만 설정합니다.

## 사전 조건

- Node.js 22.12 이상
- Docker 및 Docker Compose
- `5432`, `3001` 포트를 사용 중인 다른 PostgreSQL/API가 없을 것

포트 사용 여부는 다음으로 확인합니다.

```bash
lsof -iTCP:5432 -sTCP:LISTEN
lsof -iTCP:3001 -sTCP:LISTEN
```

## 최초 실행

프로젝트 루트에서 아래를 실행합니다.

```bash
npm install
npm --prefix frontend install
cp .env.example .env
npm run db:dev:up
```

`db:dev:up`은 다음을 순서대로 수행합니다.

1. PostgreSQL 16 Docker 컨테이너를 시작하고 health check를 기다립니다.
2. `drizzle/`의 모든 migration을 적용합니다.
3. 활성 특성 정의 37개를 적재합니다.
4. 로컬 추천 테스트용 개발 도서 10권을 적재합니다.

같은 명령을 다시 실행해도 안전합니다. DB 컨테이너 상태는 다음으로 확인합니다.

```bash
docker compose ps
```

`db` 서비스가 `healthy`여야 합니다.

## API·화면 실행

서로 다른 터미널에서 실행합니다.

```bash
npm run api:dev
```

```bash
npm --prefix frontend run dev
```

- API: `http://localhost:3001`
- 프런트엔드: Vite가 출력하는 URL, 보통 `http://localhost:5173`
- 프런트엔드의 `/api` 요청은 `http://localhost:3001`으로 프록시됩니다. 화면 테스트에서는 API 포트를 바꾸지 마세요.

## DB 연결 확인

API를 시작한 뒤 아래 명령을 실행합니다.

```bash
curl http://localhost:3001/health
curl http://localhost:3001/api/catalog/diagnostics
RECOMMENDATION_API_URL=http://localhost:3001 npm run demo:check
RECOMMENDATION_API_URL=http://localhost:3001 npm run recommendations:check
npm test
npm --prefix frontend run build
```

정상 기준은 다음과 같습니다.

| 확인 항목 | 기대 결과 |
| --- | --- |
| `/health` | `status: ok`, `database: connected` |
| `/api/catalog/diagnostics` | 활성 특성 정의와 공개 개발 도서가 JSON으로 반환 |
| `demo:check` | 12개 1차 답변 저장, 성향 계산, 역할별 3권 추천 저장, 공개 결과 조회, 피드백 저장 통과 |
| `recommendations:check` | DB 연결, 8개 정밀 문항, 중복 없는 추천 도서 3권 통과 |
| `npm test` | DB 계약 및 TypeScript 검사 통과 |
| frontend build | Vite production build 통과 |

## 선택: 500권 카탈로그 테스트

기본 bootstrap은 빠른 테스트를 위해 개발 도서 10권만 적재합니다. 인터넷 연결이 있을 때 Open Library 후보 500권까지 검증하려면 아래를 실행합니다.

```bash
npm run catalog:sync:openlibrary -- --query fiction --limit 500
npm run catalog:publish:openlibrary
npm run catalog:check:500
```

`catalog:publish:openlibrary`는 Open Library provenance에 연결된 작품·판본만 공개하고, 각 작품에 출처가 기록된 MVP 기본 특성 `G_NOVEL`, `VIS_TEXT`를 부여합니다. 이로써 500권 모두 추천 후보 조건을 충족하지만, 분위기·난이도·세부 장르 같은 상세 특성은 자동으로 사실처럼 생성하지 않습니다.

## 자주 발생하는 문제

| 증상 | 확인·해결 |
| --- | --- |
| `docker`를 찾을 수 없음 | Docker Desktop 또는 Docker Engine/Compose를 설치한 뒤 터미널을 다시 엽니다. |
| `5432` 포트 충돌 | 다른 PostgreSQL 컨테이너·프로세스를 중지한 뒤 `npm run db:dev:up`을 다시 실행합니다. |
| API가 `database_unavailable` | `docker compose ps`에서 DB가 `healthy`인지 확인하고 `npm run db:dev:up`을 다시 실행합니다. |
| `3001` 포트 충돌 | 기존 API를 중지한 뒤 `npm run api:dev`를 실행합니다. 프런트엔드 프록시가 3001을 사용합니다. |
| migration checksum 오류 | 로컬 DB를 삭제하고 `npm run db:dev:reset`으로 새로 만듭니다. |
| 외부 도서 수집 실패 | Open Library 네트워크 연결·응답 제한을 확인하고, 기본 10권 테스트로 먼저 API 연결을 검증합니다. |

## 중지·초기화

```bash
npm run db:dev:down
npm run db:dev:reset
```

`db:dev:reset`은 로컬 Docker volume만 삭제한 뒤 개발 DB를 다시 만듭니다. 공용 또는 원격 DB에는 영향을 주지 않습니다.

## Gemini·MCP

Gemini는 DB가 선정한 도서의 한 문장 추천 이유만 생성합니다. 후보 선택과 순위는 PostgreSQL 특성 매칭이 담당합니다. `GEMINI_API_KEY`가 없으면 안전한 템플릿 설명을 반환하므로 기본 DB 테스트에는 키가 필요하지 않습니다.

MCP 도구는 외부 도서 메타데이터 검색 전용이며 DB 연결 테스트와 별개입니다. 동작 여부는 아래로 확인합니다.

```bash
npm run mcp:check
```