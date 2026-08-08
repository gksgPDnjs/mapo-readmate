create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create schema if not exists catalog;
create schema if not exists quiz;
create schema if not exists identity;
create schema if not exists billing;
create schema if not exists recommendation;
create schema if not exists operations;

create table catalog.works (
  id uuid primary key default gen_random_uuid(),
  canonical_title text not null,
  original_title text,
  original_language_code text,
  description text,
  catalog_status text not null default 'draft' check (catalog_status in ('draft', 'review', 'published', 'suppressed', 'merged')),
  merged_into_id uuid references catalog.works(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (merged_into_id is null or merged_into_id <> id)
);

create table catalog.editions (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references catalog.works(id) on delete restrict,
  title text not null,
  isbn13 text unique,
  publisher_name text,
  published_on date,
  page_count integer check (page_count is null or page_count > 0),
  format text not null default 'paperback',
  language_code text not null default 'ko',
  cover_url text,
  catalog_status text not null default 'draft' check (catalog_status in ('draft', 'review', 'published', 'suppressed', 'merged')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index editions_work_status_idx on catalog.editions (work_id, catalog_status);
create index works_title_trgm_idx on catalog.works using gin (canonical_title gin_trgm_ops);

create table catalog.tags (
  id uuid primary key default gen_random_uuid(),
  taxonomy text not null check (taxonomy in ('genre', 'topic', 'tone', 'audience', 'form', 'reading_trait')),
  slug text not null,
  label text not null,
  parent_id uuid references catalog.tags(id),
  status text not null default 'active' check (status in ('active', 'deprecated')),
  unique (taxonomy, slug)
);

create table catalog.work_tags (
  work_id uuid not null references catalog.works(id) on delete cascade,
  tag_id uuid not null references catalog.tags(id) on delete restrict,
  source_type text not null,
  confidence numeric(4, 3) not null default 1 check (confidence between 0 and 1),
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected')),
  primary key (work_id, tag_id)
);

create table quiz.dimension_sets (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  access_tier text not null check (access_tier in ('free', 'premium')),
  dimension_count smallint not null check (dimension_count between 1 and 10),
  status text not null default 'active' check (status in ('draft', 'active', 'retired')),
  created_at timestamptz not null default now()
);

create table quiz.profile_dimensions (
  code text primary key,
  left_label text not null,
  right_label text not null,
  dimension_kind text not null check (dimension_kind = 'preference'),
  active boolean not null default true
);

create table quiz.dimension_set_memberships (
  dimension_set_id uuid not null references quiz.dimension_sets(id) on delete restrict,
  dimension_code text not null references quiz.profile_dimensions(code) on delete restrict,
  display_order smallint not null check (display_order > 0),
  primary key (dimension_set_id, dimension_code),
  unique (dimension_set_id, display_order)
);

create table quiz.quiz_versions (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  experience_mode text not null check (experience_mode in ('quick', 'deep')),
  required_access_tier text not null check (required_access_tier in ('free', 'premium')),
  dimension_set_id uuid not null references quiz.dimension_sets(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft', 'active', 'retired')),
  min_question_count smallint not null check (min_question_count > 0),
  max_question_count smallint not null check (max_question_count >= min_question_count),
  recommendation_count smallint not null check (recommendation_count between 1 and 5),
  definition jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  retired_at timestamptz,
  check (
    (experience_mode = 'quick' and required_access_tier = 'free' and recommendation_count = 3) or
    (experience_mode = 'deep' and required_access_tier = 'premium' and recommendation_count = 5)
  )
);

create unique index quiz_one_active_version_per_mode_idx
  on quiz.quiz_versions (experience_mode) where status = 'active';

create table quiz.questions (
  id uuid primary key default gen_random_uuid(),
  quiz_version_id uuid not null references quiz.quiz_versions(id) on delete restrict,
  code text not null,
  prompt text not null,
  question_type text not null check (question_type in ('single_select', 'multi_select', 'pairwise', 'duration_select', 'boundary_select')),
  required boolean not null default true,
  display_order smallint not null check (display_order > 0),
  dimension_code text references quiz.profile_dimensions(code),
  status text not null default 'active' check (status in ('active', 'retired')),
  unique (quiz_version_id, code),
  unique (quiz_version_id, display_order)
);

create table quiz.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references quiz.questions(id) on delete restrict,
  code text not null,
  label text not null,
  value jsonb not null default '{}'::jsonb,
  display_order smallint not null check (display_order > 0),
  is_skip boolean not null default false,
  is_unknown boolean not null default false,
  unique (question_id, code),
  unique (question_id, display_order)
);

create table quiz.scoring_rule_sets (
  id uuid primary key default gen_random_uuid(),
  quiz_version_id uuid not null references quiz.quiz_versions(id) on delete restrict,
  version text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'retired')),
  definition jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  unique (quiz_version_id, version)
);

create unique index scoring_one_active_rule_set_idx
  on quiz.scoring_rule_sets (quiz_version_id) where status = 'active';

create table quiz.scoring_rules (
  id uuid primary key default gen_random_uuid(),
  rule_set_id uuid not null references quiz.scoring_rule_sets(id) on delete restrict,
  question_option_id uuid not null references quiz.question_options(id) on delete restrict,
  dimension_code text not null references quiz.profile_dimensions(code) on delete restrict,
  operation text not null check (operation in ('add', 'set', 'multiply')),
  weight numeric(5, 4) not null check (weight between -1 and 1),
  condition jsonb not null default '{}'::jsonb,
  unique (rule_set_id, question_option_id, dimension_code)
);

create table identity.app_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table billing.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  version integer not null check (version > 0),
  access_tier text not null check (access_tier in ('free', 'premium')),
  dimension_set_id uuid not null references quiz.dimension_sets(id) on delete restrict,
  recommendation_count smallint not null check (recommendation_count between 1 and 5),
  billing_interval text check (billing_interval in ('month', 'year')),
  status text not null default 'draft' check (status in ('draft', 'active', 'retired')),
  feature_policy jsonb not null default '{}'::jsonb,
  unique (code, version)
);

create table billing.subscriptions (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid not null references identity.app_users(id) on delete restrict,
  plan_id uuid not null references billing.plans(id) on delete restrict,
  provider_code text not null,
  provider_customer_ref text not null,
  provider_subscription_ref text not null,
  status text not null check (status in ('trialing', 'active', 'past_due', 'cancelled', 'expired')),
  current_period_ends_at timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_code, provider_subscription_ref)
);

create table billing.entitlements (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid not null references identity.app_users(id) on delete restrict,
  plan_id uuid not null references billing.plans(id) on delete restrict,
  capability_code text not null,
  status text not null check (status in ('active', 'revoked', 'expired')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  source_type text not null check (source_type in ('subscription', 'admin_grant', 'trial')),
  source_reference text,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

create unique index entitlements_one_active_capability_idx
  on billing.entitlements (app_user_id, capability_code)
  where status = 'active';

create table billing.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider_code text not null,
  provider_event_ref text not null,
  event_type text not null,
  payload_sha256 text not null,
  received_at timestamptz not null default now(),
  verified_at timestamptz,
  processed_at timestamptz,
  processing_status text not null default 'received' check (processing_status in ('received', 'verified', 'processed', 'rejected', 'failed')),
  unique (provider_code, provider_event_ref)
);

create table recommendation.anonymous_sessions (
  id uuid primary key default gen_random_uuid(),
  client_token_hash text not null unique,
  app_user_id uuid references identity.app_users(id) on delete set null,
  linked_at timestamptz,
  status text not null default 'active' check (status in ('active', 'expired', 'deleted')),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  deleted_at timestamptz,
  check ((app_user_id is null and linked_at is null) or (app_user_id is not null and linked_at is not null))
);

create index anonymous_sessions_expiry_idx on recommendation.anonymous_sessions (expires_at);

create table recommendation.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references recommendation.anonymous_sessions(id) on delete cascade,
  quiz_version_id uuid not null references quiz.quiz_versions(id) on delete restrict,
  experience_mode text not null check (experience_mode in ('quick', 'deep')),
  access_tier text not null check (access_tier in ('free', 'premium')),
  dimension_set_id uuid not null references quiz.dimension_sets(id) on delete restrict,
  entitlement_id uuid references billing.entitlements(id) on delete restrict,
  upgraded_from_attempt_id uuid references recommendation.quiz_attempts(id) on delete restrict,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  abandoned_at timestamptz,
  check (upgraded_from_attempt_id is null or upgraded_from_attempt_id <> id)
);

create table recommendation.quiz_responses (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references recommendation.quiz_attempts(id) on delete cascade,
  question_id uuid not null references quiz.questions(id) on delete restrict,
  selected_option_ids jsonb not null default '[]'::jsonb,
  response_order smallint not null check (response_order > 0),
  was_skipped boolean not null default false,
  answered_at timestamptz not null default now(),
  superseded_at timestamptz,
  unique (attempt_id, question_id, response_order)
);

create table recommendation.preference_profile_snapshots (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references recommendation.anonymous_sessions(id) on delete cascade,
  quiz_attempt_id uuid not null references recommendation.quiz_attempts(id) on delete restrict,
  rule_set_id uuid not null references quiz.scoring_rule_sets(id) on delete restrict,
  access_tier text not null check (access_tier in ('free', 'premium')),
  dimension_set_id uuid not null references quiz.dimension_sets(id) on delete restrict,
  entitlement_id uuid references billing.entitlements(id) on delete restrict,
  inherited_from_snapshot_id uuid references recommendation.preference_profile_snapshots(id) on delete restrict,
  sequence integer not null check (sequence > 0),
  purpose text,
  available_time_band text,
  dimension_scores jsonb not null,
  confidence_scores jsonb not null,
  created_at timestamptz not null default now(),
  unique (session_id, sequence)
);

create table recommendation.engine_versions (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  status text not null check (status in ('draft', 'active', 'retired')),
  config jsonb not null,
  code_revision text not null,
  catalog_cutoff_at timestamptz not null,
  published_at timestamptz
);

create table recommendation.recommendation_runs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references recommendation.anonymous_sessions(id) on delete cascade,
  quiz_attempt_id uuid not null references recommendation.quiz_attempts(id) on delete restrict,
  profile_snapshot_id uuid not null references recommendation.preference_profile_snapshots(id) on delete restrict,
  engine_version_id uuid not null references recommendation.engine_versions(id) on delete restrict,
  access_tier text not null check (access_tier in ('free', 'premium')),
  dimension_set_id uuid not null references quiz.dimension_sets(id) on delete restrict,
  entitlement_id uuid references billing.entitlements(id) on delete restrict,
  plan_version integer,
  requested_item_count smallint not null check (requested_item_count between 1 and 5),
  status text not null default 'requested' check (status in ('requested', 'completed', 'failed')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  candidate_count integer,
  filter_summary jsonb not null default '{}'::jsonb,
  failure_code text
);

create table recommendation.recommendation_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references recommendation.recommendation_runs(id) on delete cascade,
  work_id uuid not null references catalog.works(id) on delete restrict,
  edition_id uuid not null references catalog.editions(id) on delete restrict,
  role text not null check (role in ('read_now', 'stretch', 'discovery', 'topic_match', 'accessible_alternative')),
  display_order smallint not null check (display_order > 0),
  total_score numeric(8, 5) not null,
  fit_label text not null check (fit_label in ('strong', 'good', 'explore')),
  first_action text not null,
  trade_offs jsonb not null default '[]'::jsonb,
  unique (run_id, role),
  unique (run_id, display_order),
  unique (run_id, work_id)
);

create table recommendation.item_score_components (
  item_id uuid not null references recommendation.recommendation_items(id) on delete cascade,
  component_code text not null,
  raw_score numeric(8, 5) not null,
  weighted_score numeric(8, 5) not null,
  weight numeric(8, 5) not null,
  evidence jsonb not null default '{}'::jsonb,
  primary key (item_id, component_code)
);

create table recommendation.feedback_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references recommendation.anonymous_sessions(id) on delete cascade,
  quiz_attempt_id uuid references recommendation.quiz_attempts(id) on delete restrict,
  run_id uuid references recommendation.recommendation_runs(id) on delete restrict,
  item_id uuid references recommendation.recommendation_items(id) on delete restrict,
  event_type text not null check (event_type in ('assessment_started', 'assessment_completed', 'upgrade_offer_shown', 'mode_upgrade_started', 'mode_upgrade_completed', 'premium_checkout_started', 'premium_access_granted', 'premium_access_denied', 'item_viewed', 'detail_opened', 'liked', 'disliked', 'saved_for_later', 'access_path_opened', 'started_reading', 'continued_reading', 'self_reported_completion', 'stopped_reading', 'explanation_helpful', 'result_not_helpful')),
  from_mode text check (from_mode in ('quick', 'deep')),
  to_mode text check (to_mode in ('quick', 'deep')),
  reason_code text,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table operations.recommendation_eval_runs (
  id uuid primary key default gen_random_uuid(),
  engine_version_id uuid not null references recommendation.engine_versions(id) on delete restrict,
  dataset_version text not null,
  access_tier text not null check (access_tier in ('free', 'premium')),
  dimension_set_code text not null,
  status text not null check (status in ('queued', 'running', 'succeeded', 'failed')),
  started_at timestamptz,
  finished_at timestamptz,
  summary jsonb not null default '{}'::jsonb
);

create or replace function recommendation.assert_quiz_attempt_access()
returns trigger
language plpgsql
as $$
declare
  expected_tier text;
  expected_set uuid;
  session_user uuid;
begin
  select required_access_tier, dimension_set_id
    into expected_tier, expected_set
    from quiz.quiz_versions
    where id = new.quiz_version_id;

  if not found or new.access_tier <> expected_tier or new.dimension_set_id <> expected_set then
    raise exception 'Quiz attempt does not match its version access contract';
  end if;

  if new.access_tier = 'premium' then
    select app_user_id into session_user from recommendation.anonymous_sessions where id = new.session_id;
    if session_user is null or new.entitlement_id is null or not exists (
      select 1 from billing.entitlements
      where id = new.entitlement_id
        and app_user_id = session_user
        and capability_code = 'premium_recommendation'
        and status = 'active'
        and starts_at <= now()
        and (ends_at is null or ends_at > now())
    ) then
      raise exception 'Premium quiz attempts require an active premium_recommendation entitlement';
    end if;
  elsif new.entitlement_id is not null then
    raise exception 'Free quiz attempts cannot attach an entitlement';
  end if;

  return new;
end;
$$;

create trigger quiz_attempt_access_guard
before insert or update of session_id, quiz_version_id, access_tier, dimension_set_id, entitlement_id
on recommendation.quiz_attempts
for each row execute function recommendation.assert_quiz_attempt_access();

create or replace function recommendation.assert_recommendation_run_contract()
returns trigger
language plpgsql
as $$
declare
  attempt recommendation.quiz_attempts%rowtype;
  expected_count smallint;
begin
  select * into attempt from recommendation.quiz_attempts where id = new.quiz_attempt_id;
  select recommendation_count into expected_count from quiz.quiz_versions where id = attempt.quiz_version_id;

  if not found
    or new.session_id <> attempt.session_id
    or new.access_tier <> attempt.access_tier
    or new.dimension_set_id <> attempt.dimension_set_id
    or new.entitlement_id is distinct from attempt.entitlement_id
    or new.requested_item_count <> expected_count then
    raise exception 'Recommendation run does not match its quiz attempt contract';
  end if;

  return new;
end;
$$;

create trigger recommendation_run_contract_guard
before insert or update of session_id, quiz_attempt_id, access_tier, dimension_set_id, entitlement_id, requested_item_count
on recommendation.recommendation_runs
for each row execute function recommendation.assert_recommendation_run_contract();

insert into quiz.dimension_sets (code, access_tier, dimension_count, status)
values
  ('core_4', 'free', 4, 'active'),
  ('refined_9', 'premium', 9, 'active')
on conflict (code) do nothing;

insert into quiz.profile_dimensions (code, left_label, right_label, dimension_kind)
values
  ('story_knowledge', 'Story', 'Knowledge', 'preference'),
  ('reality_imagination', 'Reality', 'Imagination', 'preference'),
  ('emotion_insight', 'Emotion', 'Insight', 'preference'),
  ('light_deep', 'Light', 'Deep', 'preference'),
  ('familiar_novel', 'Familiar', 'Novel', 'preference'),
  ('rapid_contemplative', 'Rapid', 'Contemplative', 'preference'),
  ('character_idea', 'Character', 'Idea', 'preference'),
  ('personal_social', 'Personal', 'Social', 'preference'),
  ('comfort_challenge', 'Comfort', 'Challenge', 'preference')
on conflict (code) do nothing;

insert into quiz.dimension_set_memberships (dimension_set_id, dimension_code, display_order)
select dimension_set.id, dimensions.code, dimensions.display_order
from quiz.dimension_sets as dimension_set
join (
  values
    ('core_4', 'story_knowledge', 1),
    ('core_4', 'reality_imagination', 2),
    ('core_4', 'emotion_insight', 3),
    ('core_4', 'light_deep', 4),
    ('refined_9', 'story_knowledge', 1),
    ('refined_9', 'reality_imagination', 2),
    ('refined_9', 'emotion_insight', 3),
    ('refined_9', 'light_deep', 4),
    ('refined_9', 'familiar_novel', 5),
    ('refined_9', 'rapid_contemplative', 6),
    ('refined_9', 'character_idea', 7),
    ('refined_9', 'personal_social', 8),
    ('refined_9', 'comfort_challenge', 9)
) as dimensions(set_code, code, display_order) on dimensions.set_code = dimension_set.code
on conflict do nothing;

insert into billing.plans (code, version, access_tier, dimension_set_id, recommendation_count, billing_interval, status, feature_policy)
select 'premium', 1, 'premium', id, 5, 'month', 'active', '{"capabilities":["premium_recommendation"]}'::jsonb
from quiz.dimension_sets
where code = 'refined_9'
on conflict (code, version) do nothing;