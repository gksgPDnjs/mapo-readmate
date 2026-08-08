# Quiz Version·Question·Option 데이터 모델

## 테이블

| 테이블 | 핵심 열 | 제약 |
| --- | --- | --- |
| `quiz.quiz_versions` | `id`, `version`, `experience_mode`, `required_access_tier`, `dimension_set_id`, `status`, `min_question_count`, `max_question_count`, `recommendation_count`, `definition`, `published_at`, `retired_at` | `version` 유니크 |
| `quiz.questions` | `id`, `quiz_version_id`, `code`, `prompt`, `help_text`, `question_type`, `required`, `display_order`, `dimension`, `status` | `(quiz_version_id, code)` 유니크 |
| `quiz.question_options` | `id`, `question_id`, `code`, `label`, `value`, `display_order`, `is_skip`, `is_unknown` | `(question_id, code)` 유니크 |
| `quiz.question_transitions` | `id`, `question_id`, `option_id`, `next_question_id`, `condition` | 분기당 하나의 전이 |
| `quiz.mode_upgrade_paths` | `id`, `source_quiz_version_id`, `target_quiz_version_id`, `minimum_answer_count`, `carry_forward_dimensions`, `status` | 출발·대상 조합 유니크, 같은 버전 연결 금지 |

`question_type`은 `single_select`, `multi_select`, `pairwise`, `duration_select`, `boundary_select`만 허용한다. 모든 질문에는 필요 시 `건너뛰기` 또는 `잘 모르겠음` 선택지를 제공한다.

## 모드 계약

| `experience_mode` | 문항 수 | 결과 | 측정 범위 | 승급 경로 |
| --- | --- | --- | --- | --- |
| `quick` | 6~8 | 3권 | 무료 `core_4` | `deep` |
| `deep` | 12~18 | 5권 | 유료 `refined_9` + 목적·주제·시간·난이도·콘텐츠 경계 | 없음 |

`carry_forward_dimensions`에는 승급 시 다시 묻지 않을 검증된 축 코드만 기록한다. 주제, 목적, 제약은 `deep`에서 새로 받거나 사용자가 수정할 수 있다.

`required_access_tier`는 `quick`에서 `free`, `deep`에서 `premium`이다. 클라이언트 화면이 아닌 서버의 권한 해석이 이 제약을 적용한다.

## 버전 정책

- 발행된 버전의 질문·선택지·점수 의미는 수정하지 않는다. 변경은 새 `quiz_version`으로 발행한다.
- 모드별로 활성 버전은 하나이며, 기존 시도는 시작 시점의 버전으로 끝까지 진행한다.
- UI 표시 순서와 추천 점수 순서는 분리한다. `display_order`가 결과 영향도를 암시하면 안 된다.