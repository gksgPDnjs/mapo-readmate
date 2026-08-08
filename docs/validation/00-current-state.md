# Current Validation State

검증 시점: 2026-08-08

## A. DB 상태

적용된 migration은 `0000_initial_schema`부터 `0005_open_library_source`까지 6개다.

| Schema | 테이블 수 | 주요 책임 |
| --- | ---: | --- |
| `catalog` | 16 | 작품, 판본, 식별자, 태그, 특성, 가용성, 인기 신호 |
| `quiz` | 8 | 퀴즈 버전, 질문, 선택지, 채점 규칙 |
| `recommendation` | 12 | 익명 세션, 시도, 응답, 프로필, 추천 실행·항목 |
| `provenance` | 7 | 외부 출처, 원본 레코드, 수집 실행, 관측값, 권리 |

실제 row count:

| 영역 | 수량 |
| --- | ---: |
| 활성 퀴즈 버전 | 2 |
| 활성 퀴즈 질문 | 20 |
| 퀴즈 선택지 | 64 |
| 출처 | 7 |
| 원본 출처 레코드 | 500 |
| 수집 실행 | 1 |
| 익명 세션 | 0 |
| 퀴즈 시도 | 0 |
| 퀴즈 응답 | 0 |
| 프로필 스냅샷 | 0 |
| 추천 실행 | 0 |
| 추천 항목 | 0 |

## B. 500권 도서 데이터 상태

| 항목 | 수량 | 비율 |
| --- | ---: | ---: |
| 전체 works | 510 | 100% |
| 전체 editions | 510 | 100% |
| published works | 10 | 2.0% |
| published editions | 10 | 2.0% |
| ISBN13 보유 | 0 | 0% |
| ISBN13 미보유 | 510 | 100% |
| 저자 미보유 work | 4 | 0.8% |
| description 미보유 work | 500 | 98.0% |
| publisher 미보유 edition | 510 | 100% |
| page_count 미보유 edition | 510 | 100% |
| cover_url 미보유 edition | 510 | 100% |
| 승인 특성 보유 work | 10 | 2.0% |
| 추천 가능 work | 10 | 2.0% |
| 승인된 표지 권리 레코드 | 0 | 0% |

500건의 Open Library 레코드는 모두 provenance 원본 레코드로 보존되어 있지만, `review` 상태이며 승인 특성이 없다. 따라서 현재 추천 엔진의 eligible 집합에는 포함되지 않는다.

## C. 런타임 연결 상태

- 1차 성향 화면은 `frontend/src/data/questions.js`의 정적 12문항과 브라우저 state로 동작한다.
- 2차 정밀 추천 질문은 `GET /api/deep-questions`에서 DB로 읽는다.
- 2차 선택값은 `POST /api/recommendations/preview`로 특성 코드 배열만 전송한다.
- 서버는 recommendation schema의 session, quiz attempt, quiz response, profile snapshot, recommendation run을 생성하지 않는다.
- 추천 화면은 API 응답의 제목, 저자, 설명, 이유를 표시한다.
- `frontend/src/data/books.js`와 `frontend/src/data/traits.js`는 존재하지만 현재 추천·성향 화면의 runtime import에는 사용되지 않는다.
- 표지는 외부 `cover_url`이 아니라 제목 기반 fallback cover 컴포넌트로 렌더링된다.

## 초기 판정

현재 시스템은 **DB 기반 2차 추천 미리보기**는 작동하지만, 사용자 클릭부터 DB 저장·프로필·추천 실행 이력까지 이어지는 전체 traceability는 구현되지 않았다. 이후 검증은 이 차이를 PASS가 아닌 FAIL 또는 BLOCKED로 기록한다.