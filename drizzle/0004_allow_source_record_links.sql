alter table provenance.source_records
  drop constraint source_records_check;

alter table provenance.source_records
  add constraint source_records_linked_entity_check
  check (
    (entity_kind in ('work', 'edition') and (work_id is not null or edition_id is not null)) or
    entity_kind in ('curation', 'availability', 'usage_signal')
  );