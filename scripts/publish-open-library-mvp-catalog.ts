import { existsSync } from "node:fs";
import postgres from "postgres";

const defaultFeatureCodes = ["G_NOVEL", "VIS_TEXT"];

if (existsSync(".env")) {
  process.loadEnvFile();
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

const client = postgres(databaseUrl, { max: 1 });

try {
  const result = await client.begin(async (transaction) => {
    const source = await transaction<{ id: string }[]>`
      select id from provenance.sources where code = 'open_library' and active = true
    `;
    if (source.length !== 1) {
      throw new Error("The open_library source is missing. Run db:migrate first.");
    }

    const availableFeatures = await transaction<{ code: string }[]>`
      select code from catalog.feature_definitions where active and code = any(${defaultFeatureCodes})
    `;
    if (availableFeatures.length !== defaultFeatureCodes.length) {
      throw new Error("Seed active G_NOVEL and VIS_TEXT feature definitions before publishing the MVP catalog.");
    }

    const publishedWorks = await transaction<{ count: string }[]>`
      update catalog.works as work
      set catalog_status = 'published', updated_at = now()
      where work.catalog_status in ('review', 'published')
        and exists (
          select 1 from provenance.source_records as record
          where record.source_id = ${source[0].id} and record.work_id = work.id
        )
      returning work.id
    `;
    const publishedEditions = await transaction<{ count: string }[]>`
      update catalog.editions as edition
      set catalog_status = 'published', updated_at = now()
      where edition.catalog_status in ('review', 'published')
        and exists (
          select 1 from provenance.source_records as record
          where record.source_id = ${source[0].id} and record.edition_id = edition.id
        )
      returning edition.id
    `;
    const featureValues = await transaction<{ work_id: string }[]>`
      insert into catalog.work_feature_values (work_id, feature_code, strength, source_type, review_status, reviewed_at)
      select distinct record.work_id, feature.code, 0.5, 'api_import', 'approved', now()
      from provenance.source_records as record
      join catalog.feature_definitions as feature on feature.code = any(${defaultFeatureCodes}) and feature.active
      where record.source_id = ${source[0].id}
        and record.work_id is not null
      on conflict (work_id, feature_code) do nothing
      returning work_id
    `;

    return {
      works: publishedWorks.length,
      editions: publishedEditions.length,
      featureValues: featureValues.length,
    };
  });
  console.log(`Published ${result.works} Open Library works, ${result.editions} editions, and added ${result.featureValues} MVP feature values.`);
} finally {
  await client.end();
}