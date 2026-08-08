# 추천 근거 Explanation Factor 모델

## 원칙

설명은 검증된 구조화 근거에서만 생성한다. LLM을 사용하더라도 새 사실·줄거리·수상 경력을 추가할 수 없다.

## 테이블

| 테이블 | 핵심 열 | 제약 |
| --- | --- | --- |
| `recommendation.explanation_factors` | `id`, `item_id`, `factor_type`, `key`, `value`, `polarity`, `display_priority`, `evidence_ref`, `verified` | 항목별 우선순위 유니크 |
| `recommendation.explanation_renderings` | `id`, `item_id`, `locale`, `template_version`, `body`, `generator_type`, `input_checksum`, `review_status` | 동일 입력·로캘 렌더링 유니크 |

`factor_type`은 `purpose_match`, `feature_match`, `topic_match`, `time_fit`, `difficulty_fit`, `curation_evidence`, `youth_usage_evidence`, `availability`, `trade_off`로 제한한다. `polarity`는 `positive` 또는 `caveat`다.

## 공개 규칙

- 공개 렌더링에는 최소 하나의 양성 요인과 필요 시 트레이드오프를 포함한다.
- `verified = false` 또는 출처 없는 요인은 사용자 설명에 포함하지 않는다.
- `evidence_ref`는 특성 검수, 큐레이션, 출처 관측, 점수 구성요소 중 하나를 가리킨다.