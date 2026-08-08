create table recommendation.public_result_codes (
  session_id uuid primary key references recommendation.anonymous_sessions(id) on delete cascade,
  public_code text not null unique,
  created_at timestamptz not null default now(),
  check (public_code ~ '^[A-Z0-9]{10}$')
);

insert into recommendation.engine_versions (
  version,
  status,
  config,
  code_revision,
  catalog_cutoff_at,
  published_at
)
values (
  'first-stage-demo-v1',
  'active',
  '{"selection":"feature-proxy","roles":["read_now","stretch","discovery"]}'::jsonb,
  'database-foundation',
  now(),
  now()
)
on conflict (version) do nothing;
