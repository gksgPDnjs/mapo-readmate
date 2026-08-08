# Anonymous Session 및 Quiz Response 모델

## 개인정보 원칙

세션 식별자는 무작위 UUID이며 이름·학교·전화번호·IP 원문을 저장하지 않는다. 요청 보안 로그가 필요하면 별도 시스템에서 단방향 축약값과 짧은 보존 기간을 사용한다.

## 테이블

| 테이블 | 핵심 열 | 제약 |
| --- | --- | --- |
| `recommendation.anonymous_sessions` | `id`, `client_token_hash`, `app_user_id`, `linked_at`, `status`, `started_at`, `expires_at`, `deleted_at` | 토큰은 해시만 저장, 계정 연결은 선택 사항 |
| `recommendation.quiz_attempts` | `id`, `session_id`, `quiz_version_id`, `experience_mode`, `access_tier`, `dimension_set_id`, `entitlement_id`, `upgrade_path_id`, `upgraded_from_attempt_id`, `status`, `started_at`, `completed_at`, `abandoned_at` | 버전·등급·축 집합 일치, 유료는 유효 권한 필수 |
| `recommendation.quiz_responses` | `id`, `attempt_id`, `quiz_version_id`, `question_id`, `option_id`, `selected_option_ids`, `response_order`, `answered_at`, `was_skipped` | 응답의 버전은 시도 버전과 일치 |
| `recommendation.session_events` | `id`, `session_id`, `event_type`, `occurred_at`, `metadata` | 허용 이벤트만 저장 |

## 보존 정책

- 세션과 원 응답은 기본 30일, 동의 없는 분석 집계는 비식별 처리 후 보관한다.
- 사용자의 삭제 요청 또는 `expires_at` 도래 시 응답, 프로필, 추천, 피드백을 삭제 큐에 넣는다.
- 응답 수정은 행 갱신 대신 새 행을 기록하고 이전 행에 `superseded_at`을 설정한다. 추천 계산에는 각 문항의 최신 응답만 사용한다.
- `quiz_attempts.upgraded_from_attempt_id`는 `quick -> deep` 순서만 허용한다. 승급한 시도는 이전 응답을 보존하며, 새 모드에서 추가된 질문만 답한다.
- `app_user_id`는 사용자가 결과 저장 또는 유료 정밀 매칭을 명시적으로 선택한 뒤에만 연결한다. `premium` 시도는 세션에 연결된 계정과 유효한 `entitlement_id`가 필수다.