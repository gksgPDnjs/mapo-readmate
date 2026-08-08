# 사용자 Feedback Event 모델

## 테이블

| 테이블 | 핵심 열 | 제약 |
| --- | --- | --- |
| `recommendation.feedback_events` | `id`, `session_id`, `quiz_attempt_id`, `run_id`, `item_id`, `event_type`, `from_mode`, `to_mode`, `value`, `reason_code`, `occurred_at`, `metadata` | 추천 실행·시도·항목 일관성 확인 |
| `recommendation.feedback_reason_codes` | `code`, `event_type`, `label`, `active` | 복합 PK |

`event_type`은 `assessment_started`, `assessment_completed`, `upgrade_offer_shown`, `mode_upgrade_started`, `mode_upgrade_completed`, `premium_checkout_started`, `premium_access_granted`, `premium_access_denied`, `item_viewed`, `detail_opened`, `liked`, `disliked`, `replaced`, `saved_for_later`, `access_path_opened`, `started_reading`, `continued_reading`, `self_reported_completion`, `stopped_reading`, `explanation_helpful`, `result_not_helpful`로 제한한다.

## 수집·이용 정책

- 이벤트에는 IP, 식별 쿠키 원문, 자유 텍스트, 학교 정보 등 PII를 넣지 않는다.
- `reason_code`는 `too_long`, `too_difficult`, `not_interested`, `content_boundary`, `not_available`, `already_read`, `other`의 통제 목록만 사용한다.
- 추천 모델 학습·평가 시 피드백은 익명 집계로 사용하며, 개별 세션을 장기 행동 프로파일로 전환하지 않는다.
- 항목 교체는 기존 `recommendation_item`을 보존하고 새 실행 또는 교체 항목을 별도로 기록한다.
- `upgrade_offer_shown`과 `mode_upgrade_started`는 `from_mode`, `to_mode`를 반드시 가지며, `quick -> deep`만 허용한다. 이 이벤트로 무료·유료 전환율을 측정한다.
- 결제 관련 이벤트의 `metadata`에는 금액, 카드 정보, 결제 공급자 고객 식별자를 넣지 않는다. 구매 성공 여부의 기준 기록은 `billing.webhook_events`와 `billing.entitlements`다.