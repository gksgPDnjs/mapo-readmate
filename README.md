# mapo-readmate

## Database Development

PostgreSQL과 Drizzle 기반으로 무료 4축 추천과 유료 9축 정밀 추천을 지원하는 초기 스키마를 제공합니다.

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
 
