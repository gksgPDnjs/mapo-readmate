# ISBN 정규화 및 중복 판본 처리 정책

## ISBN 정규화

1. 공백·하이픈을 제거하고 대문자로 변환한다.
2. ISBN-10은 체크섬을 검증하고 유효한 경우 ISBN-13으로 변환한다.
3. ISBN-13은 체크섬을 검증한다. `978` 또는 `979` 접두어가 아닌 값은 ISBN으로 승인하지 않는다.
4. 유효한 원문과 정규화 결과, 검증 결과를 `edition_identifiers`와 `source_records`에 보존한다.

| 테이블 | 핵심 열 | 제약 |
| --- | --- | --- |
| `catalog.isbn_registry` | `isbn13`, `isbn10`, `canonical_edition_id`, `validation_status`, `first_seen_at`, `last_seen_at` | `isbn13` PK, 유효 ISBN만 `canonical_edition_id` 연결 |
| `operations.duplicate_candidates` | `id`, `entity_type`, `left_entity_id`, `right_entity_id`, `match_reason`, `confidence`, `status`, `reviewed_by`, `reviewed_at` | 쌍은 정렬해 유니크, `confidence`는 0~1 |
| `operations.entity_merge_events` | `id`, `entity_type`, `source_id`, `target_id`, `reason`, `actor_id`, `created_at` | 원본·대상 동일 금지 |

## 충돌 정책

- 같은 유효 ISBN-13은 하나의 정식 판본만 가리킨다. 서로 다른 판본으로 들어오면 자동 병합 대신 `duplicate_candidates`를 생성한다.
- ISBN이 없거나 오류여도 판본은 등록할 수 있지만 `catalog_status = 'review'`로 두고 추천에서 제외한다.
- 제목·출판사·발행일이 유사한 무ISBN 판본은 후보로만 제시한다. 자동 병합하지 않는다.
- 병합은 원본 레코드를 삭제하지 않고 `merged_into_id`와 병합 이벤트로 추적한다.