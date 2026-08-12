alter table recommendation.explanation_renderings
  drop constraint explanation_renderings_generator_type_check;

alter table recommendation.explanation_renderings
  add constraint explanation_renderings_generator_type_check
  check (generator_type = any (array['template'::text, 'gemini'::text, 'apim'::text]));
