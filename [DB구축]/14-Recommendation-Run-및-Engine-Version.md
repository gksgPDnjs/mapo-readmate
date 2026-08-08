# Recommendation Run 및 Engine Version 모델

## 테이블

| 테이블 | 핵심 열 | 제약 |
| --- | --- | --- |
| `recommendation.engine_versions` | `id`, `version`, `status`, `config`, `code_revision`, `catalog_cutoff_at`, `published_at` | `version` 유니크 |
| `recommendation.recommendation_runs` | `id`, `session_id`, `quiz_attempt_id`, `profile_snapshot_id`, `engine_version_id`, `quiz_version_id`, `experience_mode`, `access_tier`, `dimension_set_id`, `entitlement_id`, `plan_version`, `requested_item_count`, `status`, `requested_at`, `completed_at`, `candidate_count`, `filter_summary`, `failure_code` | 모드·등급·축 집합·결과 수 일치 |
| `recommendation.run_candidate_stats` | `run_id`, `work_id`, `edition_id`, `eligible`, `excluded_reason_codes`, `score_components` | 복합 PK |

## 실행 불변성

- `engine_versions.config`에는 가중치, 하드 필터, 재정렬, 역할 배정 규칙을 완전한 스냅샷으로 저장한다.
- 실행 완료 후 후보·점수·추천 항목을 갱신하지 않는다. 수정된 알고리즘은 새 엔진 버전과 새 실행을 만든다.
- 실패한 실행도 상태·실패 코드·입력 버전을 남기되, 사용자에게 내부 오류 세부정보를 노출하지 않는다.
- `catalog_cutoff_at`은 실행에서 참조한 검수 카탈로그 시점을 고정한다.
- `requested_item_count`는 무료 `quick = 3`, 유료 `deep = 5`여야 한다. 새 모드로 승급한 추천은 독립 실행으로 보존하며 이전 실행을 대체하지 않는다.
- `access_tier`, `dimension_set_id`, `entitlement_id`, `plan_version`은 실행 시점의 권한 스냅샷이다. 이 값은 추천 생성 뒤 갱신하지 않는다.