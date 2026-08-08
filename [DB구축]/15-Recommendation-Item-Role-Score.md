# Recommendation Item·Role·Score 모델

## 테이블

| 테이블 | 핵심 열 | 제약 |
| --- | --- | --- |
| `recommendation.recommendation_items` | `id`, `run_id`, `work_id`, `edition_id`, `role`, `display_order`, `total_score`, `fit_label`, `first_action`, `trade_offs` | `(run_id, role)` 유니크 |
| `recommendation.item_score_components` | `item_id`, `component_code`, `raw_score`, `weighted_score`, `weight`, `evidence` | `(item_id, component_code)` 유니크 |
| `recommendation.item_access_paths` | `id`, `item_id`, `path_type`, `url`, `availability_status`, `checked_at`, `source_record_id` | 항목별 경로 |

## 역할과 제약

- 무료 `quick`은 `read_now`, `stretch`, `discovery`를 한 권씩 제공한다.
- `deep`은 앞선 세 역할에 `topic_match`, `accessible_alternative`를 더해 다섯 권을 제공한다. 한 실행에 역할별 한 권만 둔다.
- 한 실행의 `work_id`는 중복될 수 없다. 동일 시리즈, 동일 저자 중복도 재정렬 단계에서 제한한다.
- `total_score`는 내부 순위용이며 사용자에게 퍼센트 일치율로 노출하지 않는다.
- `fit_label`은 `strong`, `good`, `explore`로 제한하고, 점수와 근거를 기반으로 결정한다.