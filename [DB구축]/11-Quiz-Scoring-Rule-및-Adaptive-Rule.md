# Quiz Scoring Rule 및 Adaptive Rule 설계

## 테이블

| 테이블 | 핵심 열 | 제약 |
| --- | --- | --- |
| `quiz.scoring_rule_sets` | `id`, `quiz_version_id`, `version`, `status`, `definition`, `published_at` | 버전별 하나의 활성 집합 |
| `quiz.dimension_sets` | `id`, `code`, `access_tier`, `dimension_count`, `status` | `code` 유니크 |
| `quiz.profile_dimensions` | `code`, `left_label`, `right_label`, `dimension_kind`, `active` | `code` PK |
| `quiz.dimension_set_memberships` | `dimension_set_id`, `dimension_code`, `display_order` | 복합 PK |
| `quiz.scoring_rules` | `id`, `rule_set_id`, `question_option_id`, `dimension_code`, `operation`, `weight`, `condition` | `dimension_code` FK, `weight` 범위 -1~1 |
| `quiz.adaptive_rules` | `id`, `quiz_version_id`, `priority`, `when_condition`, `candidate_question_id`, `stop_condition`, `status` | 우선순위 유니크 |
| `quiz.result_mode_templates` | `id`, `quiz_version_id`, `code`, `match_condition`, `title_template`, `description_template`, `status` | 코드 유니크 |

## 계산 규칙

- 차원 점수는 선택지별 가중치를 합산한 뒤 응답 가능 최대 절대값으로 정규화해 `-1..1`로 저장한다.
- `skip`과 `unknown`은 점수를 부여하지 않으며, 확신도만 낮춘다.
- `quick`은 `core_4`의 핵심 6개 뒤 가장 불확실한 축을 확인하는 최대 2개를 추가한다.
- `deep`은 `refined_9`의 상속 점수와 핵심 12개 뒤에만 적응형 질문을 추가하며, 관심 주제·독서 장벽·난이도·문체 중 정보 이득이 큰 항목을 최대 6개 선택한다.
- `core_4`는 `story_knowledge`, `reality_imagination`, `emotion_insight`, `light_deep`이고, `refined_9`는 여기에 `familiar_novel`, `rapid_contemplative`, `character_idea`, `personal_social`, `comfort_challenge`를 더한다. 모두 `dimension_kind = 'preference'`다.
- 목적·주제·가용 시간·분량·내용 경계는 차원 점수가 아닌 컨텍스트로 관리하며, 유료 권한이 없어도 답변·안전 필터에 사용할 수 있다.
- 결과 모드 템플릿은 표현용이다. 추천 후보 필터나 순위를 직접 결정하지 않는다.