create table catalog.feature_versions (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  definition jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'active', 'retired')),
  published_at timestamptz
);

create table catalog.feature_definitions (
  code text primary key,
  category text not null,
  label text not null,
  description text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table catalog.work_features (
  work_id uuid not null references catalog.works(id) on delete cascade,
  feature_version_id uuid not null references catalog.feature_versions(id) on delete restrict,
  narrative_score numeric(4, 3) check (narrative_score between 0 and 1),
  knowledge_score numeric(4, 3) check (knowledge_score between 0 and 1),
  pace_score numeric(4, 3) check (pace_score between 0 and 1),
  emotional_intensity numeric(4, 3) check (emotional_intensity between 0 and 1),
  difficulty_score numeric(4, 3) check (difficulty_score between 0 and 1),
  estimated_reading_minutes integer check (estimated_reading_minutes > 0),
  age_min smallint check (age_min >= 0),
  age_max smallint check (age_max >= age_min),
  embedding jsonb,
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected')),
  primary key (work_id, feature_version_id)
);

create table catalog.work_feature_values (
  work_id uuid not null references catalog.works(id) on delete cascade,
  feature_code text not null references catalog.feature_definitions(code) on delete restrict,
  strength numeric(4, 3) not null default 1 check (strength between 0 and 1),
  source_type text not null check (source_type in ('editorial', 'api_import', 'ai_suggestion')),
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  primary key (work_id, feature_code)
);

create index work_feature_values_feature_idx on catalog.work_feature_values (feature_code, review_status, work_id);

create table recommendation.profile_feature_preferences (
  profile_snapshot_id uuid not null references recommendation.preference_profile_snapshots(id) on delete cascade,
  feature_code text not null references catalog.feature_definitions(code) on delete restrict,
  preference text not null check (preference in ('prefer', 'avoid', 'neutral')),
  weight numeric(4, 3) not null default 1 check (weight between 0 and 1),
  source text not null check (source in ('deep_quiz', 'user_edit', 'inherited')),
  primary key (profile_snapshot_id, feature_code)
);

create table recommendation.explanation_factors (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references recommendation.recommendation_items(id) on delete cascade,
  factor_type text not null check (factor_type in ('purpose_match', 'feature_match', 'topic_match', 'time_fit', 'difficulty_fit', 'curation_evidence', 'youth_usage_evidence', 'availability', 'trade_off')),
  factor_key text not null,
  factor_value jsonb not null,
  polarity text not null check (polarity in ('positive', 'caveat')),
  display_priority smallint not null check (display_priority > 0),
  evidence_ref text not null,
  verified boolean not null default false,
  unique (item_id, display_priority)
);

create table recommendation.explanation_renderings (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references recommendation.recommendation_items(id) on delete cascade,
  locale text not null default 'ko-KR',
  template_version text not null,
  body text not null,
  generator_type text not null check (generator_type in ('template', 'gemini')),
  input_checksum text not null,
  review_status text not null default 'approved' check (review_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  unique (item_id, locale, input_checksum)
);

insert into catalog.feature_versions (version, definition, status, published_at)
values ('book-feature-v1', '{"source":"DB구축/book_feature_v1.csv"}'::jsonb, 'active', now());

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
  'deep-feature-v1',
  'deep',
  'premium',
  id,
  'active',
  8,
  8,
  5,
  '{"featureVersion":"book-feature-v1","responseFormat":"feature_preferences"}'::jsonb,
  now()
from quiz.dimension_sets
where code = 'refined_9';

with question_data(code, prompt, question_type, display_order) as (
  values
    ('genres', '어떤 장르의 책이 가장 끌리나요? 여러 개를 골라도 좋아요.', 'multi_select', 1),
    ('domains', '읽으며 만나고 싶은 주제는 무엇인가요? 여러 개를 골라도 좋아요.', 'multi_select', 2),
    ('moods', '지금 읽고 싶은 책의 분위기를 골라주세요.', 'multi_select', 3),
    ('style', '어떤 문체가 편하게 느껴지나요?', 'single_select', 4),
    ('ending', '이야기의 마무리는 어떤 쪽이 좋나요?', 'single_select', 5),
    ('visual', '어떤 책의 형태가 읽기 편한가요?', 'single_select', 6),
    ('utility', '책을 읽고 가장 얻고 싶은 것은 무엇인가요?', 'single_select', 7),
    ('avoid', '이번 추천에서 피하고 싶은 요소를 골라주세요. 여러 개를 골라도 좋아요.', 'multi_select', 8)
)
insert into quiz.questions (quiz_version_id, code, prompt, question_type, display_order)
select quiz_version.id, question_data.code, question_data.prompt, question_data.question_type, question_data.display_order
from quiz.quiz_versions as quiz_version
join question_data on true
where quiz_version.version = 'deep-feature-v1';

with option_data(question_code, code, label, feature_code, preference, display_order) as (
  values
    ('genres', 'fantasy', '판타지', 'G_FANTASY', 'prefer', 1),
    ('genres', 'essay', '에세이', 'G_ESSAY', 'prefer', 2),
    ('genres', 'mystery', '추리/스릴러', 'G_MYSTERY', 'prefer', 3),
    ('genres', 'novel', '현대소설', 'G_NOVEL', 'prefer', 4),
    ('genres', 'self_dev', '자기계발', 'G_SELF_DEV', 'prefer', 5),
    ('domains', 'human', '인문/사회', 'D_HUMAN', 'prefer', 1),
    ('domains', 'science', '과학/SF', 'D_SCIENCE', 'prefer', 2),
    ('domains', 'art', '예술/문화', 'D_ART', 'prefer', 3),
    ('moods', 'healing', '따뜻한/힐링', 'M_HEALING', 'prefer', 1),
    ('moods', 'thrilling', '흥미진진한', 'M_THRILLING', 'prefer', 2),
    ('moods', 'calm', '잔잔한/깊은', 'M_CALM', 'prefer', 3),
    ('moods', 'witty', '유쾌한/위트', 'M_WITTY', 'prefer', 4),
    ('style', 'poetic', '서정적/감성적', 'TONE_POETIC', 'prefer', 1),
    ('style', 'clear', '직관적/명쾌한', 'TONE_CLEAR', 'prefer', 2),
    ('style', 'witty', '위트/유머러스', 'TONE_WITTY', 'prefer', 3),
    ('ending', 'happy', '확실한 결말', 'END_HAPPY', 'prefer', 1),
    ('ending', 'open', '여운/열린결말', 'END_OPEN', 'prefer', 2),
    ('ending', 'real', '현실적 결말', 'END_REAL', 'prefer', 3),
    ('visual', 'text', '텍스트 중심', 'VIS_TEXT', 'prefer', 1),
    ('visual', 'illustration', '일러스트/삽화', 'VIS_ILLUST', 'prefer', 2),
    ('visual', 'diagram', '도표/인포그래픽', 'VIS_DIAGRAM', 'prefer', 3),
    ('utility', 'practical', '실생활 적용', 'UTIL_PRACTICAL', 'prefer', 1),
    ('utility', 'perspective', '세상을 보는 시각', 'UTIL_PERSPECTIVE', 'prefer', 2),
    ('utility', 'empathy', '감정적 위로', 'UTIL_EMPATHY', 'prefer', 3),
    ('avoid', 'dark', '우울함/슬픔', 'AVOID_DARK', 'avoid', 1),
    ('avoid', 'hard', '어려운 용어', 'AVOID_HARD', 'avoid', 2),
    ('avoid', 'cruel', '잔인함/공포', 'AVOID_CRUEL', 'avoid', 3),
    ('avoid', 'long', '지나치게 길고 완만한 전개', 'AVOID_LONG', 'avoid', 4)
)
insert into quiz.question_options (question_id, code, label, value, display_order)
select
  question.id,
  option_data.code,
  option_data.label,
  jsonb_build_object('featureCode', option_data.feature_code, 'preference', option_data.preference),
  option_data.display_order
from quiz.questions as question
join quiz.quiz_versions as quiz_version on quiz_version.id = question.quiz_version_id
join option_data on option_data.question_code = question.code
where quiz_version.version = 'deep-feature-v1';

insert into quiz.scoring_rule_sets (quiz_version_id, version, status, definition, published_at)
select id, 'deep-feature-rules-v1', 'active', '{"featurePreferences":"stored_separately"}'::jsonb, now()
from quiz.quiz_versions
where version = 'deep-feature-v1';