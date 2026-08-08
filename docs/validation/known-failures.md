# Known Failures

## FAIL-001

- Severity: HIGH
- Test: ANSWER_PERSISTENCE
- Expected: 사용자 입력부터 화면 추천까지 추적 가능하고 충분한 catalog가 추천 가능해야 한다.
- Actual: 사용자 응답, profile snapshot, recommendation run이 모두 0건이다.
- Root Cause: 현재 API는 preview만 제공하며 session/attempt/response 저장 endpoint가 없다.
- Status: Open

## FAIL-003

- Severity: HIGH
- Test: FIRST_STAGE_MAPPING
- Expected: 사용자 입력부터 화면 추천까지 추적 가능하고 충분한 catalog가 추천 가능해야 한다.
- Actual: 1차 static 질문의 축 결과가 recommendation preview 입력으로 전달되지 않는다.
- Root Cause: ChatScreen과 createTrait은 브라우저 state만 사용한다.
- Status: Open

## FAIL-004

- Severity: MEDIUM
- Test: METADATA_COVERAGE
- Expected: 사용자 입력부터 화면 추천까지 추적 가능하고 충분한 catalog가 추천 가능해야 한다.
- Actual: 표지·ISBN·출판사·쪽수가 모두 0%다.
- Root Cause: 현재 Open Library importer가 해당 필드를 보강하지 않는다.
- Status: Open

## WARN-001

- Severity: MEDIUM
- Test: FEATURE_DIVERSITY
- Expected: 사용자 입력부터 화면 추천까지 추적 가능하고 충분한 catalog가 추천 가능해야 한다.
- Actual: 500권이 G_NOVEL, VIS_TEXT 기본 특성만 보유한다.
- Root Cause: Open Library MVP 승격은 근거 없는 세부 분류를 만들지 않는다.
- Status: Open

## BLOCKED-001

- Severity: BLOCKED
- Test: UI_SCREENSHOT
- Expected: 사용자 입력부터 화면 추천까지 추적 가능하고 충분한 catalog가 추천 가능해야 한다.
- Actual: Playwright 의존성과 브라우저 자동화 harness가 없다.
- Root Cause: 실제 mobile/desktop screenshot 검증은 수행하지 못했다.
- Status: Open

## BLOCKED-002

- Severity: BLOCKED
- Test: LIVE_GEMINI
- Expected: 사용자 입력부터 화면 추천까지 추적 가능하고 충분한 catalog가 추천 가능해야 한다.
- Actual: GEMINI_API_KEY가 설정되지 않아 live AI 설명 품질은 검증하지 못했다.
- Root Cause: 템플릿 fallback만 검증 범위에 포함된다.
- Status: Open
