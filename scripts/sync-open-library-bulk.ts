import { existsSync } from "node:fs";
import postgres from "postgres";
import { sha256 } from "../src/book-catalog/providers/normalization.js";
import { OpenLibraryProvider } from "../src/book-catalog/providers/open-library.provider.js";

type BulkArguments = {
  query: string;
  limit: number;
};

function parseArguments(argumentList: string[]): BulkArguments {
  const values = new Map<string, string>();
  for (let index = 0; index < argumentList.length; index += 2) {
    const flag = argumentList[index];
    const value = argumentList[index + 1];
    if (!flag?.startsWith("--") || !value) {
      throw new Error("Usage: npm run catalog:sync:openlibrary -- [--query fiction] [--limit 500]");
    }
    values.set(flag, value);
  }
  const limit = Number(values.get("--limit") ?? "500");
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    throw new Error("--limit must be an integer from 1 to 500.");
  }
  return { query: values.get("--query") ?? "fiction", limit };
}

if (existsSync(".env")) {
  process.loadEnvFile();
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

const options = parseArguments(process.argv.slice(2));
const provider = new OpenLibraryProvider();
const candidates = [];
for (let offset = 0; candidates.length < options.limit; offset += 100) {
  const page = await provider.searchPage(options.query, offset, Math.min(100, options.limit - candidates.length));
  if (page.length === 0) {
    break;
  }
  candidates.push(...page);
}
const records = [...new Map(candidates.map((candidate) => [candidate.externalId, candidate])).values()].slice(0, options.limit);
if (records.length === 0) {
  throw new Error("Open Library returned no book candidates.");
}

const client = postgres(databaseUrl, { max: 1 });
try {
  await client.begin(async (transaction) => {
    const source = await transaction<{ id: string }[]>`
      select id from provenance.sources where code = 'open_library' and active = true
    `;
    if (source.length !== 1) {
      throw new Error("The open_library source is missing. Run db:migrate first.");
    }
    const run = await transaction<{ id: string }[]>`
      insert into provenance.ingestion_runs (source_id, job_type, trigger_type, status, config_snapshot, started_at)
      values (${source[0].id}, 'catalog_sync', 'manual', 'running', ${transaction.json(options)}, now())
      returning id
    `;
    let createdCount = 0;
    let changedCount = 0;
    for (const record of records) {
      const existingSourceRecord = await transaction<{ work_id: string | null; edition_id: string | null }[]>`
        select work_id, edition_id
        from provenance.source_records
        where source_id = ${source[0].id} and external_id = ${record.externalId}
        order by fetched_at desc
        limit 1
      `;
      const existingEdition = record.isbn13
        ? await transaction<{ id: string; work_id: string }[]>`select id, work_id from catalog.editions where isbn13 = ${record.isbn13}`
        : [];
      const workId = existingSourceRecord[0]?.work_id ?? existingEdition[0]?.work_id ?? (await transaction<{ id: string }[]>`
        insert into catalog.works (canonical_title, description, catalog_status)
        values (${record.title}, null, 'review')
        returning id
      `)[0].id;
      const editionId = existingSourceRecord[0]?.edition_id ?? existingEdition[0]?.id ?? (await transaction<{ id: string }[]>`
        insert into catalog.editions (work_id, title, isbn13, publisher_name, published_on, language_code, catalog_status)
        values (${workId}, ${record.title}, ${record.isbn13}, ${record.publisher}, ${record.publishedOn}, 'ko', 'review')
        returning id
      `)[0].id;
      const isExisting = Boolean(existingSourceRecord[0] || existingEdition[0]);
      createdCount += isExisting ? 0 : 1;
      changedCount += isExisting ? 1 : 0;
      const sourceRecord = await transaction<{ id: string }[]>`
        insert into provenance.source_records (
          source_id, ingestion_run_id, external_id, entity_kind, work_id, edition_id, raw_payload, payload_sha256, http_status, usage_status
        ) values (
          ${source[0].id}, ${run[0].id}, ${record.externalId}, 'edition', ${workId}, ${editionId}, ${JSON.stringify(record.raw)}::jsonb, ${sha256(record.raw)}, 200, 'accepted'
        )
        on conflict (source_id, external_id, payload_sha256)
        do update set fetched_at = now(), ingestion_run_id = excluded.ingestion_run_id, usage_status = 'accepted'
        returning id
      `;
      if (record.author) {
        const contributor = await transaction<{ id: string }[]>`
          select id from catalog.contributors where normalized_name = ${record.author} order by created_at limit 1
        `;
        const contributorId = contributor[0]?.id ?? (await transaction<{ id: string }[]>`
          insert into catalog.contributors (display_name, normalized_name) values (${record.author}, ${record.author}) returning id
        `)[0].id;
        await transaction`
          insert into catalog.work_contributors (work_id, contributor_id, role_code)
          values (${workId}, ${contributorId}, 'author') on conflict do nothing
        `;
      }
      if (record.isbn13) {
        await transaction`
          insert into catalog.edition_identifiers (edition_id, identifier_type, normalized_value, validation_status, source_record_id)
          values (${editionId}, 'isbn13', ${record.isbn13}, 'valid', ${sourceRecord[0].id})
          on conflict (identifier_type, normalized_value)
          do update set edition_id = excluded.edition_id, source_record_id = excluded.source_record_id
        `;
      }
    }
    await transaction`
      update provenance.ingestion_runs
      set status = 'succeeded', finished_at = now(), records_seen = ${records.length}, records_created = ${createdCount}, records_changed = ${changedCount}
      where id = ${run[0].id}
    `;
  });
  console.log(`Imported ${records.length} Open Library book candidate(s) as review records.`);
} finally {
  await client.end();
}