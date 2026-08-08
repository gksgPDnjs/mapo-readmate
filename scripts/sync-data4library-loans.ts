import postgres from "postgres";
import { Data4LibraryProvider } from "../src/book-catalog/providers/data4library.provider.js";
import { sha256 } from "../src/book-catalog/providers/normalization.js";

const apiKey = process.env.DATA4LIBRARY_API_KEY;
const databaseUrl = process.env.DATABASE_URL;

type SyncArguments = {
  startDate: string;
  endDate: string;
  fromAge: number;
  toAge: number;
  page: number;
  pageSize: number;
  region?: string;
};

function parseArguments(argumentList: string[]): SyncArguments {
  const values = new Map<string, string>();
  for (let index = 0; index < argumentList.length; index += 2) {
    const flag = argumentList[index];
    const value = argumentList[index + 1];
    if (!flag?.startsWith("--") || !value) {
      throw new Error("Usage: npm run catalog:sync:data4library -- --start-date YYYY-MM-DD --end-date YYYY-MM-DD [--from-age 13 --to-age 19 --page 1 --page-size 20 --region 11]");
    }
    values.set(flag, value);
  }

  const startDate = values.get("--start-date");
  const endDate = values.get("--end-date");
  if (!startDate || !endDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    throw new Error("--start-date and --end-date are required in YYYY-MM-DD format.");
  }

  const fromAge = Number(values.get("--from-age") ?? "13");
  const toAge = Number(values.get("--to-age") ?? "19");
  const page = Number(values.get("--page") ?? "1");
  const pageSize = Number(values.get("--page-size") ?? "20");
  if (![fromAge, toAge, page, pageSize].every(Number.isInteger) || fromAge < 0 || toAge < fromAge || page < 1 || pageSize < 1 || pageSize > 100) {
    throw new Error("Invalid age or page range. Use ages 0+ and a page size from 1 to 100.");
  }

  return { startDate, endDate, fromAge, toAge, page, pageSize, region: values.get("--region") };
}

if (!apiKey || !databaseUrl) {
  throw new Error("DATABASE_URL and DATA4LIBRARY_API_KEY are required. See .env.example.");
}

const options = parseArguments(process.argv.slice(2));
const provider = new Data4LibraryProvider(apiKey);
const records = await provider.listPopularLoans(options);
if (records.length === 0) {
  console.log("No Data4Library loan records found.");
  process.exit(0);
}

const client = postgres(databaseUrl, { max: 1 });
try {
  await client.begin(async (transaction) => {
    const source = await transaction<{ id: string }[]>`
      select id from provenance.sources where code = 'data4library' and active = true
    `;
    if (source.length !== 1) {
      throw new Error("The data4library source is missing. Run db:migrate first.");
    }
    const run = await transaction<{ id: string }[]>`
      insert into provenance.ingestion_runs (source_id, job_type, trigger_type, status, config_snapshot, started_at)
      values (${source[0].id}, 'usage_signal_sync', 'manual', 'running', ${transaction.json(options)}, now())
      returning id
    `;

    let created = 0;
    for (const record of records) {
      const title = record.title;
      const isbn = record.isbn13;
      const author = record.author;
      const payloadHash = sha256(record.raw);
      const externalId = record.externalId;
      const existingEdition = isbn
        ? await transaction<{ id: string; work_id: string }[]>`select id, work_id from catalog.editions where isbn13 = ${isbn}`
        : [];
      const existingWork = existingEdition[0] ? [] : await transaction<{ id: string }[]>`
        select id from catalog.works where canonical_title = ${title} and merged_into_id is null order by created_at limit 1
      `;
      const workId = existingEdition[0]?.work_id ?? existingWork[0]?.id ?? (await transaction<{ id: string }[]>`
        insert into catalog.works (canonical_title, catalog_status)
        values (${title}, 'review')
        returning id
      `)[0].id;
      const editionId = existingEdition[0]?.id ?? (await transaction<{ id: string }[]>`
        insert into catalog.editions (work_id, title, isbn13, publisher_name, published_on, language_code, catalog_status)
        values (${workId}, ${title}, ${isbn}, ${record.publisher}, ${record.publishedOn}, 'ko', 'review')
        returning id
      `)[0].id;

      const sourceRecord = await transaction<{ id: string }[]>`
        insert into provenance.source_records (
          source_id, ingestion_run_id, external_id, entity_kind, work_id, edition_id, raw_payload, payload_sha256, http_status, usage_status
        ) values (
          ${source[0].id}, ${run[0].id}, ${externalId}, 'usage_signal', ${workId}, ${editionId}, ${JSON.stringify(record.raw)}::jsonb, ${payloadHash}, 200, 'accepted'
        )
        on conflict (source_id, external_id, payload_sha256)
        do update set fetched_at = now(), ingestion_run_id = excluded.ingestion_run_id, usage_status = 'accepted'
        returning id
      `;

      const observedAt = new Date().toISOString();
      const loanCount = record.loanCount;
      const loanRank = record.loanRank;
      if (loanCount !== null) {
        await transaction`
          insert into catalog.audience_popularity_signals (
            work_id, source_record_id, audience_band, region_code, metric_code, metric_value, observed_from, observed_to, observed_at
          ) values (
            ${workId}, ${sourceRecord[0].id}, ${`age_${options.fromAge}_${options.toAge}`}, ${options.region ?? null}, 'loan_count', ${loanCount}, ${options.startDate}, ${options.endDate}, ${observedAt}
          )
        `;
      }
      if (loanRank !== null) {
        await transaction`
          insert into catalog.audience_popularity_signals (
            work_id, source_record_id, audience_band, region_code, metric_code, metric_value, observed_from, observed_to, observed_at
          ) values (
            ${workId}, ${sourceRecord[0].id}, ${`age_${options.fromAge}_${options.toAge}`}, ${options.region ?? null}, 'loan_rank', ${loanRank}, ${options.startDate}, ${options.endDate}, ${observedAt}
          )
        `;
      }
      if (author) {
        const contributor = await transaction<{ id: string }[]>`
          insert into catalog.contributors (display_name, normalized_name)
          values (${author}, ${author})
          on conflict do nothing
          returning id
        `;
        const contributorId = contributor[0]?.id ?? (await transaction<{ id: string }[]>`
          select id from catalog.contributors where normalized_name = ${author} order by created_at limit 1
        `)[0].id;
        await transaction`
          insert into catalog.work_contributors (work_id, contributor_id, role_code)
          values (${workId}, ${contributorId}, 'author')
          on conflict do nothing
        `;
      }
      if (isbn) {
        await transaction`
          insert into catalog.edition_identifiers (edition_id, identifier_type, normalized_value, validation_status, source_record_id)
          values (${editionId}, 'isbn13', ${isbn}, 'valid', ${sourceRecord[0].id})
          on conflict (identifier_type, normalized_value)
          do update set edition_id = excluded.edition_id, source_record_id = excluded.source_record_id
        `;
      }
      created += 1;
    }

    await transaction`
      update provenance.ingestion_runs
      set status = 'succeeded', finished_at = now(), records_seen = ${records.length}, records_created = ${created}
      where id = ${run[0].id}
    `;
  });
  console.log(`Imported ${records.length} Data4Library loan record(s) for ages ${options.fromAge}-${options.toAge}.`);
} finally {
  await client.end();
}