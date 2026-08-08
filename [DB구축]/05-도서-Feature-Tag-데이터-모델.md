# 도서 Feature·Tag 데이터 모델

## 목적

태그는 사람이 이해하는 분류와 필터에, 연속형 특성은 추천 점수 계산에 사용한다. 자동 추출 값은 검수 전 추천에 사용하지 않는다.

## 테이블

| 테이블 | 핵심 열 | 제약 |
| --- | --- | --- |
| `catalog.tags` | `id`, `taxonomy`, `slug`, `label`, `parent_id`, `status` | `(taxonomy, slug)` 유니크 |
| `catalog.work_tags` | `work_id`, `tag_id`, `source_type`, `confidence`, `review_status` | 복합 PK, 신뢰도 0~1 |
| `catalog.feature_versions` | `id`, `version`, `definition`, `status`, `published_at` | `version` 유니크 |
| `catalog.work_features` | `work_id`, `feature_version_id`, `narrative_score`, `knowledge_score`, `pace_score`, `emotional_intensity`, `difficulty_score`, `estimated_reading_minutes`, `age_min`, `age_max`, `embedding`, `review_status` | 복합 PK, 점수는 0~1 |

## 분류 체계

- `genre`: 장르, `topic`: 주제, `tone`: 분위기, `audience`: 독자층, `form`: 형식, `reading_trait`: 독서 특성.
- 태그 삭제 대신 `status = 'deprecated'`로 바꾸고 대체 태그를 운영 메타데이터로 연결한다.
- 상위 태그는 탐색용이며 점수 계산은 명시적으로 연결된 태그만 사용한다.

## 추천 사용 규칙

추천 엔진은 `review_status = 'approved'`인 최신 `feature_version`만 사용한다. `estimated_reading_minutes`는 판본의 페이지 수 및 형식과 충돌할 경우 품질 이슈를 만들고 보수적인 더 긴 시간을 선택한다.