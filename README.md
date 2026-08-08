# mapo-readmate

## Database Development

PostgreSQL과 Drizzle 기반으로 무료 4축 추천과 유료 9축 정밀 추천을 지원하는 초기 스키마를 제공합니다.

## Team Local Test

Docker가 설치되어 있으면 외부 DB 계정 없이 동일한 로컬 테스트 DB를 실행할 수 있습니다.

연결 확인, 전체 추천 저장 흐름, 문제 해결은 [팀 로컬 DB 연결·테스트 매뉴얼](docs/team-local-db.md)을 참고합니다.

```bash
npm install
cp .env.example .env
npm run db:dev:up
```

`db:dev:up`은 PostgreSQL 16 컨테이너를 시작하고, 모든 migration, 37개 특성 정의, 개발용 도서 10권을 순서대로 적재합니다. 이 구성의 `DATABASE_URL`은 `postgresql://mapo_readmate:mapo_readmate@localhost:5432/mapo_readmate`이며 로컬 개발 전용입니다. 실제 팀 공용 DB URL이나 API 키는 커밋하지 않습니다.

API와 화면은 각각 별도 터미널에서 실행합니다.

```bash
npm run api:dev
```

```bash
cd frontend
npm install
npm run dev
```

API 확인과 추천 흐름 검증:

```bash
curl http://localhost:3001/health
curl http://localhost:3001/api/catalog/diagnostics
npm run recommendations:check
```

테스트 데이터를 처음부터 다시 만들려면 `npm run db:dev:reset`, DB 컨테이너만 중지하려면 `npm run db:dev:down`을 실행합니다.

`NATIONAL_LIBRARY_CERT_KEY`, `ALADIN_TTB_KEY`, `GOOGLE_BOOKS_API_KEY`, `DATA4LIBRARY_API_KEY`, `GEMINI_API_KEY`는 외부 수집 또는 Gemini 설명 생성에만 필요하며 위 로컬 추천 테스트에는 필요하지 않습니다.

## AI Book Lookup MCP

VS Code의 MCP 클라이언트는 [`.vscode/mcp.json`](.vscode/mcp.json)에 등록된 `readmate-book-catalog` 서버를 통해 외부 서지 후보를 조회할 수 있습니다. 워크스페이스를 신뢰한 뒤 MCP 서버를 시작하면 AI는 다음 도구를 필요할 때 호출할 수 있습니다.

- `search_books`: 제목 또는 ISBN-13으로 Open Library를 검색합니다. 기본값은 최대 5건이며 최대 10건입니다.
- `find_book_by_isbn`: ISBN-13으로 단일 후보를 조회합니다.

기본 출처는 API 키가 필요 없는 Open Library입니다. `source: "national_library"`를 사용하려면 루트 `.env`에 유효한 `NATIONAL_LIBRARY_CERT_KEY`를 설정해야 합니다. MCP 응답은 외부의 **미검수 후보**이며, 운영 카탈로그에 반영하려면 기존 수집·검수 경로로 provenance 기록과 승인 절차를 거쳐야 합니다.

독립 실행으로 MCP 서버를 확인하려면 다음 명령을 사용합니다.

```bash
npm run mcp:books
```

```bash
npm install
npm test
DATABASE_URL='postgresql://...' npm run db:migrate
```

`drizzle/0000_initial_schema.sql`은 카탈로그, 퀴즈, 익명 세션, 추천 실행, 계정, 플랜·권한·결제 웹훅 테이블을 생성합니다. `premium` 정밀 매칭은 데이터베이스 트리거가 활성 `premium_recommendation` 권한과 `refined_9` 축 집합을 확인합니다.

환경 변수 형식은 `.env.example`을 참고합니다. 실제 결제 수단의 카드·계좌 정보는 데이터베이스에 저장하지 않습니다.

## National Library MVP Import

국립중앙도서관 ISBN 서지정보 API를 MVP 기준 서지 소스로 사용합니다. [인증키 신청/관리](https://www.nl.go.kr/NL/contents/N31101020000.do)에서 발급받은 키를 `NATIONAL_LIBRARY_CERT_KEY`에 설정한 뒤, ISBN 또는 제목으로 도서를 적재합니다.

```bash
DATABASE_URL='postgresql://...' \
NATIONAL_LIBRARY_CERT_KEY='issued-api-key' \
npm run catalog:sync:nl -- --isbn 9788936433598

DATABASE_URL='postgresql://...' \
NATIONAL_LIBRARY_CERT_KEY='issued-api-key' \
npm run catalog:sync:nl -- --title '불편한 편의점' --page-size 10
```

수집기는 API 원본을 `provenance.source_records`에 보관하고, 검증 가능한 제목·ISBN·출판사·발행일·쪽수를 카탈로그와 필드 관측 기록에 연결합니다. API 표지 URL과 책소개 URL은 이용 권리 검토 전 사용자 화면에 노출하지 않습니다.

## 2차 특성 추천 API

`book_feature_v1.csv`의 37개 특성은 다음 순서로 DB에 적재합니다.

```bash
DATABASE_URL='postgresql://...' npm run db:migrate
DATABASE_URL='postgresql://...' npm run db:seed-features
npm run api:start
```

로컬 UI 검증용으로만 데모 도서 10권을 넣으려면 명시적으로 개발 시드를 허용합니다. 이 데이터는 운영 카탈로그가 아니며 외부 API 수집·검수 데이터로 대체해야 합니다.

```bash
ALLOW_DEVELOPMENT_SEED=true DATABASE_URL='postgresql://...' npm run db:seed-demo
```

2차 화면은 `GET /api/deep-questions`에서 문항을 받고, `POST /api/recommendations/preview`에서 공개·검수된 도서 후보를 받습니다. 후보 책은 국립중앙도서관 수집 후 특성값을 검수하고 `catalog_status = 'published'`, `review_status = 'approved'`로 전환한 뒤에만 추천됩니다.

Gemini는 후보 선택기가 아니라 설명 생성기입니다. `GEMINI_API_KEY`를 별도로 설정하면 검증된 후보와 특성 코드만 사용해 추천 이유를 작성합니다. `GOOGLE_BOOKS_API_KEY`와 Gemini 키는 서로 대체할 수 없습니다.

## Open Library MVP Catalog

Open Library `fiction` 수집분은 원본 수집과 공개 승격을 분리합니다. 수집 직후에는 review queue이며, MVP 데모에서 전체 후보로 사용하려면 아래 명시적 승격 명령을 실행합니다.

```bash
DATABASE_URL='postgresql://...' npm run catalog:publish:openlibrary
```

이 명령은 Open Library 원본 레코드에 연결된 작품·판본만 `published`로 전환하고, 검색 범위(`fiction`)와 매체 형태에 근거한 최소 특성 `G_NOVEL`, `VIS_TEXT`를 `api_import` 출처로 부여합니다. 임의의 세부 장르, 분위기, 난이도는 자동으로 승인하지 않습니다.
 
