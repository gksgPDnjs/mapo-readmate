alter table recommendation.preference_profile_snapshots
  add column trait_code text;

alter table recommendation.preference_profile_snapshots
  add constraint preference_profile_snapshots_trait_code_check
  check (trait_code is null or trait_code ~ '^[A-Z]{4}$');
