# 데이터 품질·Recommendation Eval·Admin Audit 모델

## 테이블

| 테이블 | 핵심 열 | 제약 |
| --- | --- | --- |
| `operations.data_quality_rules` | `code`, `entity_kind`, `severity`, `definition`, `active` | `code` PK |
| `operations.data_quality_issues` | `id`, `rule_code`, `entity_kind`, `entity_id`, `severity`, `status`, `evidence`, `detected_at`, `resolved_at` | 열린 동일 이슈 유니크 |
| `operations.recommendation_eval_runs` | `id`, `engine_version_id`, `dataset_version`, `access_tier`, `dimension_set_code`, `status`, `started_at`, `finished_at`, `summary` | 등급·축 집합별 평가 기준 고정 |
| `operations.recommendation_eval_results` | `id`, `eval_run_id`, `case_code`, `metric_code`, `value`, `passed`, `evidence` | 케이스·지표 유니크 |
| `operations.admin_audit_logs` | `id`, `actor_id`, `actor_role`, `action`, `entity_kind`, `entity_id`, `before_state`, `after_state`, `request_id`, `occurred_at` | 수정 작업 감사 |

## 품질 게이트

- `published` 판본은 유효 ISBN 또는 수동 검토 근거, 제목, 언어, 작품 연결, 승인된 추천 특성 중 하나를 가져야 한다.
- 추천 평가에는 하드 필터 위반 0건, 동일 작품 중복 0건, 출처 없는 공개 근거 0건을 필수 통과 조건으로 둔다.
- 다양성·신규성·카탈로그 커버리지·인기도 편중은 임계값을 버전별 평가 데이터셋으로 관리한다.
- 무료 `core_4`와 유료 `refined_9`은 같은 골든 케이스에서 각각 평가한다. 유료 결과가 안전성·출처·중복 방지 기준을 완화하지 않는지 별도로 검사한다.
- 관리자 변경은 행 단위 이전·이후 상태와 작업 주체를 감사 로그에 남긴다. 원본 응답과 감사 로그는 운영 UI에서 수정할 수 없다.