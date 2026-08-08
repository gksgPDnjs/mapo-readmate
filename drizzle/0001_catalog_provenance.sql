create schema if not exists provenance;
create schema if not exists curation;

create table provenance.sources (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  source_kind text not null check (source_kind in ('national_bibliography', 'library_network', 'youth_curation', 'search_api', 'retail_api')),
  base_url text not null,
  terms_url text,
  catalog_priority smallint,
  availability_priority smallint,
  youth_signal_priority smallint,
  curation_priority smallint,
  rights_policy text not null check (rights_policy in ('metadata_only', 'attributed_display', 'approved_asset_required')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (
    catalog_priority is null or catalog_priority > 0
  )
);

create table provenance.ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references provenance.sources(id) on delete restrict,
  job_type text not null check (job_type in ('search', 'isbn_lookup', 'catalog_sync', 'availability_sync', 'usage_signal_sync', 'curation_sync')),
  trigger_type text not null check (trigger_type in ('manual', 'scheduled', 'backfill', 'webhook')),
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled', 'partial')),
  cursor_before text,
  cursor_after text,
  records_seen integer not null default 0 check (records_seen >= 0),
  records_created integer not null default 0 check (records_created >= 0),
  records_changed integer not null default 0 check (records_changed >= 0),
  error_count integer not null default 0 check (error_count >= 0),
  config_snapshot jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  check (finished_at is null or started_at is null or finished_at >= started_at)
);

create index ingestion_runs_source_status_idx on provenance.ingestion_runs (source_id, status, created_at desc);

create table provenance.source_records (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references provenance.sources(id) on delete restrict,
  ingestion_run_id uuid references provenance.ingestion_runs(id) on delete set null,
  external_id text not null,
  entity_kind text not null check (entity_kind in ('work', 'edition', 'curation', 'availability', 'usage_signal')),
  work_id uuid references catalog.works(id) on delete restrict,
  edition_id uuid references catalog.editions(id) on delete restrict,
  raw_payload jsonb not null,
  payload_sha256 text not null,
  fetched_at timestamptz not null default now(),
  source_updated_at timestamptz,
  http_status smallint check (http_status between 100 and 599),
  usage_status text not null default 'pending' check (usage_status in ('pending', 'accepted', 'rejected', 'stale')),
  check (work_id is null or edition_id is null),
  unique (source_id, external_id, payload_sha256)
);

create index source_records_entity_idx on provenance.source_records (entity_kind, work_id, edition_id);
create index source_records_fetched_idx on provenance.source_records (source_id, fetched_at desc);

create table provenance.field_observations (
  id uuid primary key default gen_random_uuid(),
  source_record_id uuid not null references provenance.source_records(id) on delete cascade,
  entity_kind text not null check (entity_kind in ('work', 'edition')),
  entity_id uuid not null,
  field_name text not null,
  observed_value jsonb not null,
  normalized_value jsonb,
  confidence numeric(4, 3) not null check (confidence between 0 and 1),
  accepted_at timestamptz,
  accepted_by uuid references identity.app_users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index field_observations_entity_idx on provenance.field_observations (entity_kind, entity_id, field_name);

create table provenance.asset_rights (
  id uuid primary key default gen_random_uuid(),
  source_record_id uuid not null references provenance.source_records(id) on delete cascade,
  asset_type text not null check (asset_type in ('cover', 'description', 'excerpt')),
  asset_url text not null,
  license_status text not null check (license_status in ('unknown', 'approved', 'expired', 'prohibited')),
  attribution_text text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (source_record_id, asset_type, asset_url)
);

create table provenance.ingestion_errors (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references provenance.ingestion_runs(id) on delete cascade,
  source_record_id uuid references provenance.source_records(id) on delete set null,
  stage text not null check (stage in ('request', 'decode', 'validate', 'normalize', 'persist')),
  error_code text not null,
  message text not null,
  retryable boolean not null,
  attempt smallint not null default 1 check (attempt > 0),
  context jsonb not null default '{}'::jsonb,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table provenance.ingestion_checkpoints (
  source_id uuid not null references provenance.sources(id) on delete restrict,
  job_type text not null,
  cursor text,
  updated_at timestamptz not null default now(),
  last_successful_run_id uuid references provenance.ingestion_runs(id) on delete set null,
  primary key (source_id, job_type)
);

create table catalog.contributors (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  normalized_name text not null,
  sort_name text,
  bio text,
  language_code text,
  merged_into_id uuid references catalog.contributors(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (merged_into_id is null or merged_into_id <> id)
);

create index contributors_name_trgm_idx on catalog.contributors using gin (normalized_name gin_trgm_ops);

create table catalog.contributor_aliases (
  id uuid primary key default gen_random_uuid(),
  contributor_id uuid not null references catalog.contributors(id) on delete cascade,
  alias text not null,
  normalized_alias text not null,
  language_code text,
  unique (contributor_id, normalized_alias)
);

create table catalog.work_contributors (
  work_id uuid not null references catalog.works(id) on delete cascade,
  contributor_id uuid not null references catalog.contributors(id) on delete restrict,
  role_code text not null check (role_code in ('author', 'translator', 'illustrator', 'editor', 'adapter', 'narrator', 'compiler', 'other')),
  credit_order smallint not null default 0 check (credit_order >= 0),
  credited_as text,
  primary key (work_id, contributor_id, role_code)
);

create table catalog.edition_contributors (
  edition_id uuid not null references catalog.editions(id) on delete cascade,
  contributor_id uuid not null references catalog.contributors(id) on delete restrict,
  role_code text not null check (role_code in ('author', 'translator', 'illustrator', 'editor', 'adapter', 'narrator', 'compiler', 'other')),
  credit_order smallint not null default 0 check (credit_order >= 0),
  credited_as text,
  primary key (edition_id, contributor_id, role_code)
);

create table catalog.edition_identifiers (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references catalog.editions(id) on delete cascade,
  identifier_type text not null check (identifier_type in ('isbn10', 'isbn13', 'source_id')),
  normalized_value text not null,
  validation_status text not null check (validation_status in ('valid', 'invalid', 'unverified')),
  source_record_id uuid references provenance.source_records(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (identifier_type, normalized_value),
  unique (edition_id, identifier_type, normalized_value)
);

create table catalog.isbn_registry (
  isbn13 text primary key,
  isbn10 text,
  canonical_edition_id uuid references catalog.editions(id) on delete restrict,
  validation_status text not null check (validation_status in ('valid', 'invalid', 'unverified')),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table catalog.library_availability_observations (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references catalog.editions(id) on delete cascade,
  source_record_id uuid not null references provenance.source_records(id) on delete cascade,
  library_code text not null,
  region_code text,
  availability_status text not null check (availability_status in ('available', 'unavailable', 'unknown')),
  observed_at timestamptz not null,
  unique (edition_id, library_code, observed_at)
);

create index availability_edition_observed_idx on catalog.library_availability_observations (edition_id, observed_at desc);

create table catalog.audience_popularity_signals (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references catalog.works(id) on delete cascade,
  source_record_id uuid not null references provenance.source_records(id) on delete cascade,
  audience_band text not null,
  region_code text,
  metric_code text not null check (metric_code in ('loan_count', 'loan_rank', 'loan_trend', 'co_loan_count')),
  metric_value numeric not null,
  observed_from date,
  observed_to date,
  observed_at timestamptz not null,
  unique (work_id, source_record_id, audience_band, metric_code, observed_at)
);

create schema if not exists curation;

create table curation.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  organization_type text not null check (organization_type in ('public_library', 'school_library', 'national_institution', 'publisher', 'nonprofit', 'other')),
  website_url text,
  verification_status text not null default 'pending' check (verification_status in ('pending', 'verified', 'rejected')),
  created_at timestamptz not null default now()
);

create table curation.curators (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references curation.organizations(id) on delete restrict,
  display_name text not null,
  role_title text,
  verification_status text not null default 'pending' check (verification_status in ('pending', 'verified', 'rejected'))
);

create table curation.curations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references curation.organizations(id) on delete restrict,
  curator_id uuid references curation.curators(id) on delete restrict,
  title text not null,
  description text,
  source_url text,
  source_record_id uuid references provenance.source_records(id) on delete restrict,
  published_on date,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  check (organization_id is not null or curator_id is not null)
);

create table curation.curation_items (
  curation_id uuid not null references curation.curations(id) on delete cascade,
  work_id uuid references catalog.works(id) on delete restrict,
  edition_id uuid references catalog.editions(id) on delete restrict,
  ordinal smallint not null check (ordinal > 0),
  curator_note text,
  source_record_id uuid references provenance.source_records(id) on delete restrict,
  primary key (curation_id, ordinal),
  check ((work_id is null) <> (edition_id is null))
);

create table operations.data_quality_issues (
  id uuid primary key default gen_random_uuid(),
  entity_kind text not null,
  entity_id uuid not null,
  rule_code text not null,
  severity text not null check (severity in ('info', 'warning', 'error', 'critical')),
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved', 'ignored')),
  evidence jsonb not null default '{}'::jsonb,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz
);

create unique index quality_open_issue_idx
  on operations.data_quality_issues (entity_kind, entity_id, rule_code)
  where status in ('open', 'acknowledged');

insert into provenance.sources (
  code,
  name,
  source_kind,
  base_url,
  terms_url,
  catalog_priority,
  availability_priority,
  youth_signal_priority,
  curation_priority,
  rights_policy
)
values
  ('national_library_isbn', '국립중앙도서관 ISBN 서지정보', 'national_bibliography', 'https://www.nl.go.kr', 'https://www.nl.go.kr/NL/contents/N31101030500.do', 1, null, null, 2, 'metadata_only'),
  ('data4library', '도서관정보나루', 'library_network', 'https://data4library.kr', 'https://data4library.kr', null, 1, 1, null, 'metadata_only'),
  ('nlcy_librarian', '국립어린이청소년도서관·사서 추천', 'youth_curation', 'https://www.nlcy.go.kr', 'https://www.nlcy.go.kr', null, null, null, 1, 'attributed_display'),
  ('kakao_book', '카카오 도서 검색 API', 'search_api', 'https://dapi.kakao.com', 'https://developers.kakao.com/docs/latest/ko/daum-search/dev-guide', 3, null, null, null, 'approved_asset_required'),
  ('aladin', '알라딘 API', 'retail_api', 'https://www.aladin.co.kr', 'https://blog.aladin.co.kr/openapi', 4, null, null, null, 'approved_asset_required'),
  ('google_books', 'Google Books API', 'search_api', 'https://www.googleapis.com/books', 'https://developers.google.com/books/terms', 5, null, null, null, 'approved_asset_required')
on conflict (code) do nothing;