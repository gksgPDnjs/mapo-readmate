insert into provenance.sources (
  code,
  name,
  source_kind,
  base_url,
  terms_url,
  catalog_priority,
  rights_policy
)
values (
  'open_library',
  'Open Library 검색 API',
  'search_api',
  'https://openlibrary.org',
  'https://openlibrary.org/developers/api',
  6,
  'metadata_only'
)
on conflict (code) do nothing;