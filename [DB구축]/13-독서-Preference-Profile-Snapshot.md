# 독서 Preference Profile Snapshot 설계

## 목적

프로필은 고정된 성격 판정이 아니라 현재 응답을 계산한 시점의 읽기 조건이다. 응답 또는 규칙이 바뀌면 새 스냅샷을 생성한다.

## 테이블

| 테이블 | 핵심 열 | 제약 |
| --- | --- | --- |
| `recommendation.preference_profile_snapshots` | `id`, `session_id`, `quiz_attempt_id`, `quiz_version_id`, `rule_set_id`, `experience_mode`, `access_tier`, `dimension_set_id`, `entitlement_id`, `inherited_from_snapshot_id`, `sequence`, `purpose`, `available_time_band`, `format_preferences`, `dimension_scores`, `confidence_scores`, `created_at` | `(session_id, sequence)` 유니크 |
| `recommendation.profile_topics` | `profile_snapshot_id`, `tag_id`, `preference_strength`, `source` | 복합 PK |
| `recommendation.content_boundaries` | `profile_snapshot_id`, `note_code`, `preference` | 복합 PK |

## 규칙

- `dimension_scores`에는 사전에 정의된 연속형 축만 저장하며 값은 `-1..1`이다.
- `confidence_scores`는 문항 충족도와 상충 응답을 반영한 `0..1` 값이다.
- 프로필에는 진단명, 민감 정체성, 학업 성취 추론을 저장하지 않는다.
- 추천 실행은 반드시 하나의 스냅샷을 참조한다. 최신 프로필을 덮어쓰지 않는다.
- 승급 프로필은 `inherited_from_snapshot_id`로 직전 완료 모드 스냅샷을 가리킨다. 상속한 3~4축의 점수와 근거는 새 스냅샷에 고정해, 원본 응답을 다시 계산하지 않고도 결과를 재현한다.
- 유료 스냅샷은 `refined_9` 축 집합과 권한 스냅샷을 함께 보존한다. 계정 권한이 나중에 만료되어도 과거 추천의 입력 조건은 바뀌지 않는다.