insert into quiz.profile_dimensions (code, left_label, right_label, dimension_kind)
values
  ('purpose_knowledge_story', '지식 탐색', '이야기 몰입', 'preference'),
  ('language_east_west', '동양 친숙', '서양 탐험', 'preference'),
  ('popularity_mainstream_discovery', '대중 선택', '새로운 발견', 'preference'),
  ('difficulty_light_deep', '가볍게 읽기', '깊이 읽기', 'preference');

insert into quiz.dimension_sets (code, access_tier, dimension_count, status)
values ('first_stage_4', 'free', 4, 'active');

insert into quiz.dimension_set_memberships (dimension_set_id, dimension_code, display_order)
select dimension_set.id, membership.dimension_code, membership.display_order
from quiz.dimension_sets as dimension_set
join (
  values
    ('purpose_knowledge_story', 1),
    ('language_east_west', 2),
    ('popularity_mainstream_discovery', 3),
    ('difficulty_light_deep', 4)
) as membership(dimension_code, display_order) on true
where dimension_set.code = 'first_stage_4';

insert into quiz.quiz_versions (
  version,
  experience_mode,
  required_access_tier,
  dimension_set_id,
  status,
  min_question_count,
  max_question_count,
  recommendation_count,
  definition,
  published_at
)
select
  'first-stage-v1',
  'quick',
  'free',
  id,
  'active',
  12,
  12,
  3,
  '{"scoring":"a1=-1,a2=0,a3=1","response_format":"single_select"}'::jsonb,
  now()
from quiz.dimension_sets
where code = 'first_stage_4';

with question_data(code, prompt, dimension_code, display_order) as (
  values
    ('purpose_1', '책을 읽을 때 어떤 마음으로 읽는 것이 더 즐겁나요?', 'purpose_knowledge_story', 1),
    ('purpose_2', '친구에게 책을 추천한다면 어떤 책을 추천하고 싶나요?', 'purpose_knowledge_story', 2),
    ('purpose_3', '책을 다 읽고 났을 때 어떤 생각이 들면 가장 뿌듯한가요?', 'purpose_knowledge_story', 3),
    ('language_1', '책 속에 나오는 등장인물 이름이나 배경은 어떤 것이 더 마음에 드나요?', 'language_east_west', 4),
    ('language_2', '역사나 문화에 대한 책을 읽는다면 어떤 지역 이야기를 더 읽고 싶나요?', 'language_east_west', 5),
    ('language_3', '동화나 소설을 골라야 한다면 어떤 분위기가 끌리나요?', 'language_east_west', 6),
    ('popularity_1', '서점에 가서 어떤 책을 골라 읽는 편인가요?', 'popularity_mainstream_discovery', 7),
    ('popularity_2', '책을 고를 때 사람들의 후기나 인기 순위는 얼마나 중요한가요?', 'popularity_mainstream_discovery', 8),
    ('popularity_3', '책 표지 뒤에 어떤 추천 문구가 쓰여 있을 때 더 집어 들고 싶나요?', 'popularity_mainstream_discovery', 9),
    ('difficulty_1', '책을 고를 때 글자 수나 두께는 어땠으면 좋겠나요?', 'difficulty_light_deep', 10),
    ('difficulty_2', '책을 읽다가 어려운 단어나 복잡한 내용이 나오면 어떤가요?', 'difficulty_light_deep', 11),
    ('difficulty_3', '어떤 책을 읽고 났을 때 스스로 가장 뿌듯함을 느끼나요?', 'difficulty_light_deep', 12)
)
insert into quiz.questions (quiz_version_id, code, prompt, question_type, display_order, dimension_code)
select quiz_version.id, question_data.code, question_data.prompt, 'single_select', question_data.display_order, question_data.dimension_code
from quiz.quiz_versions as quiz_version
join question_data on true
where quiz_version.version = 'first-stage-v1';

with option_data(question_code, code, label, display_order) as (
  values
    ('purpose_1', 'a1', '새롭고 신기한 지식을 알게 될 때가 가장 즐겁다.', 1),
    ('purpose_1', 'a2', '지식을 배우는 것도, 이야기를 읽는 것도 둘 다 좋다.', 2),
    ('purpose_1', 'a3', '이야기 속 주인공의 감정에 폭 빠지는 것이 가장 즐겁다.', 3),
    ('purpose_2', 'a1', '알아두면 똑똑해지는 정보나 백과사전 같은 책', 1),
    ('purpose_2', 'a2', '정보와 재밌는 이야기가 골고루 섞인 책', 2),
    ('purpose_2', 'a3', '주인공의 이야기가 흥미진진하고 감동적인 소설책', 3),
    ('purpose_3', 'a1', '''몰랐던 새로운 사실을 많이 알게 되었다!''', 1),
    ('purpose_3', 'a2', '''몰랐던 것도 알게 되고 이야기도 재미있었다!''', 2),
    ('purpose_3', 'a3', '''주인공의 마음이 느껴져서 마음에 깊은 여운이 남는다!''', 3),
    ('language_1', 'a1', '한국, 일본처럼 익숙하고 친근한 동양 이름과 배경', 1),
    ('language_1', 'a2', '동양이든 서양이든 배경은 상관없다.', 2),
    ('language_1', 'a3', '미국, 유럽처럼 이국적이고 새로운 서양 이름과 배경', 3),
    ('language_2', 'a1', '우리나라와 이웃 나라들의 친숙한 동양 역사 이야기', 1),
    ('language_2', 'a2', '전 세계 여러 나라들의 다양한 이야기', 2),
    ('language_2', 'a3', '그리스 신화나 서양 나라들의 화려한 서양 역사 이야기', 3),
    ('language_3', 'a1', '따뜻하고 정겨운 동양적인 느낌', 1),
    ('language_3', 'a2', '어느 쪽이든 내용만 재미있으면 상관없다.', 2),
    ('language_3', 'a3', '마법이나 서양 기사가 나올 것 같은 서구적인 느낌', 3),
    ('popularity_1', 'a1', '베스트셀러처럼 사람들이 제일 많이 읽는 유명한 책', 1),
    ('popularity_1', 'a2', '유명한 책도 좋고 잘 안 알려진 책도 둘 다 본다.', 2),
    ('popularity_1', 'a3', '남들은 잘 모르지만 나만 알고 싶은 신인 작가의 책', 3),
    ('popularity_2', 'a1', '인기가 많고 사람들의 칭찬이 많아야 믿고 고른다.', 1),
    ('popularity_2', 'a2', '참고는 하지만 꼭 인기 순위대로 고르진 않는다.', 2),
    ('popularity_2', 'a3', '남들의 평가보다는 내가 처음 끌리는 신선한 책을 고른다.', 3),
    ('popularity_3', 'a1', '''전 세계 100만 부 판매! 검증된 1위 베스트셀러!''', 1),
    ('popularity_3', 'a2', '''누구나 부담 없이 재밌게 읽을 수 있는 추천 도서!''', 2),
    ('popularity_3', 'a3', '''지금껏 본 적 없는 새로운 신인 작가의 특별한 이야기!''', 3),
    ('difficulty_1', 'a1', '그림이 많고 두께가 얇아 쉽게 읽을 수 있는 책', 1),
    ('difficulty_1', 'a2', '너무 얇지도 두껍지도 않은 적당한 두께의 책', 2),
    ('difficulty_1', 'a3', '글자가 많고 두꺼워서 오래오래 깊게 읽는 책', 3),
    ('difficulty_2', 'a1', '너무 어려워서 쉬운 다른 책을 읽고 싶어진다.', 1),
    ('difficulty_2', 'a2', '조금 힘들지만 끝까지 참고 읽어본다.', 2),
    ('difficulty_2', 'a3', '더 지적 호기심이 생기고 탐험하는 기분이 들어 흥미롭다.', 3),
    ('difficulty_3', 'a1', '막힘없이 술술 읽어서 한 번에 끝까지 완독했을 때', 1),
    ('difficulty_3', 'a2', '적당한 난이도의 책을 차근차근 다 읽었을 때', 2),
    ('difficulty_3', 'a3', '생각을 많이 해야 하는 두껍고 깊이 있는 책을 다 읽었을 때', 3)
)
insert into quiz.question_options (question_id, code, label, value, display_order)
select question.id, option_data.code, option_data.label, jsonb_build_object('score', case option_data.code when 'a1' then -1 when 'a2' then 0 else 1 end), option_data.display_order
from quiz.questions as question
join quiz.quiz_versions as quiz_version on quiz_version.id = question.quiz_version_id
join option_data on option_data.question_code = question.code
where quiz_version.version = 'first-stage-v1';

insert into quiz.scoring_rule_sets (quiz_version_id, version, status, definition, published_at)
select id, 'first-stage-rules-v1', 'active', '{"normalization":"axis_average"}'::jsonb, now()
from quiz.quiz_versions
where version = 'first-stage-v1';

insert into quiz.scoring_rules (rule_set_id, question_option_id, dimension_code, operation, weight)
select
  rule_set.id,
  option.id,
  question.dimension_code,
  'add',
  (option.value ->> 'score')::numeric
from quiz.scoring_rule_sets as rule_set
join quiz.quiz_versions as quiz_version on quiz_version.id = rule_set.quiz_version_id
join quiz.questions as question on question.quiz_version_id = quiz_version.id
join quiz.question_options as option on option.question_id = question.id
where rule_set.version = 'first-stage-rules-v1';