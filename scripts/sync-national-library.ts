import { createHash } from "node:crypto";
import postgres from "postgres";
import { NationalLibraryProvider } from "../src/book-catalog/providers/national-library.provider.js";

const certKey = process.env.NATIONAL_LIBRARY_CERT_KEY;
const databaseUrl = process.env.DATABASE_URL;

type SearchArguments = {
  isbn?: string;
  title?: string;
  page: number;
  pageSize: number;
};

type NationalLibraryRecord = Record<string, unknown>;

function parseArguments(argumentsList: string[]): SearchArguments {
  const argumentsMap = new Map<string, string>();

  for (let index = 0; index < argumentsList.length; index += 2) {
    const flag = argumentsList[index];
    const value = argumentsList[index + 1];
    if (!flag?.startsWith("--") || !value) {
      throw new Error("Usage: npm run catalog:sync:nl -- --isbn <ISBN> | --title <title> [--page 1] [--page-size 20]");
    }
    argumentsMap.set(flag, value);
  }

  const isbn = argumentsMap.get("--isbn");
  const title = argumentsMap.get("--title");
  if (!isbn && !title) {
    throw new Error("Provide exactly one search term: --isbn or --title.");
  }
  if (isbn && title) {
    throw new Error("Use either --isbn or --title, not both.");
  }

  const page = Number(argumentsMap.get("--page") ?? "1");
  const pageSize = Number(argumentsMap.get("--page-size") ?? "20");
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new Error("--page must be positive and --page-size must be an integer from 1 to 100.");
  }

  return { isbn, title, page, pageSize };
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeIsbn(value: unknown): string | null {
  const normalized = normalizeText(value)?.replace(/[^0-9X]/gi, "").toUpperCase();
  if (!normalized || (normalized.length !== 10 && normalized.length !== 13)) {
    return null;
  }
  return normalized;
}

function toIsbn13(isbn: string | null): string | null {
  if (!isbn) {
    return null;
  }
  return isbn.length === 13 ? isbn : null;
}

function extractRecords(payload: unknown): NationalLibraryRecord[] {
  const candidates: unknown[] = [];
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const entry of value) {
        visit(entry);
      }
      return;
    }
    if (!value || typeof value !== "object") {
      return;
    }
    const record = value as Record<string, unknown>;
    if (normalizeText(record.TITLE)) {
      candidates.push(record);
      return;
    }
    for (const child of Object.values(record)) {
      visit(child);
    }
  };

  visit(payload);
  return candidates.filter((candidate): candidate is NationalLibraryRecord => Boolean(candidate && typeof candidate === "object"));
}

function parsePublicationDate(value: unknown): string | null {
  const date = normalizeText(value)?.replace(/[^0-9]/g, "");
  if (!date || date.length < 8) {
    return null;
  }
  const yyyy = date.slice(0, 4);
  const mm = date.slice(4, 6);
  const dd = date.slice(6, 8);
  return `${yyyy}-${mm}-${dd}`;
}

function parsePageCount(value: unknown): number | null {
  const match = normalizeText(value)?.match(/\d+/);
  if (!match) {
    return null;
  }
  const pageCount = Number(match[0]);
  return Number.isSafeInteger(pageCount) && pageCount > 0 ? pageCount : null;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function toJsonValue(value: unknown): string {
  return JSON.stringify(value);
}

if (!certKey || !databaseUrl) {
  throw new Error("DATABASE_URL and NATIONAL_LIBRARY_CERT_KEY are required. See .env.example.");
}

const search = parseArguments(process.argv.slice(2));
const provider = new NationalLibraryProvider(certKey);
const records = await provider.search({ isbn13: search.isbn, title: search.title, page: search.page, pageSize: search.pageSize });
if (records.length === 0) {
  console.log("No bibliographic records found.");
  process.exit(0);
}

const sql = postgres(databaseUrl, { max: 1 });
try {
  await sql.begin(async (transaction) => {
    const source = await transaction<{ id: string }[]>`
      select id from provenance.sources where code = 'national_library_isbn' and active = true
    `;
    if (source.length !== 1) {
      throw new Error("The national_library_isbn source is missing. Run db:migrate first.");
    }

    const run = await transaction<{ id: string }[]>`
      insert into provenance.ingestion_runs (source_id, job_type, trigger_type, status, config_snapshot, started_at)
      values (${source[0].id}, 'search', 'manual', 'running', ${transaction.json(search)}, now())
      returning id
    `;

    let createdCount = 0;
    let changedCount = 0;
    for (const record of records) {
      const title = record.title;
      const isbn13 = record.isbn13;
      const externalId = record.externalId;
      const payloadHash = sha256(record.raw);

      const existingEdition = isbn13
        ? await transaction<{ id: string; work_id: string }[]>`
            select id, work_id from catalog.editions where isbn13 = ${isbn13}
          `
        : [];
      const workId = existingEdition[0]?.work_id ?? (await transaction<{ id: string }[]>`
        insert into catalog.works (canonical_title, original_language_code, catalog_status)
        values (${title}, 'ko', 'review')
        returning id
      `)[0].id;
      const editionId = existingEdition[0]?.id ?? (await transaction<{ id: string }[]>`
        insert into catalog.editions (
          work_id, title, isbn13, publisher_name, published_on, page_count, format, language_code, catalog_status
        )
        values (
          ${workId},
          ${title},
          ${isbn13},
          ${record.publisher},
          ${record.publishedOn},
          ${record.pageCount},
          ${record.format ?? 'paperback'},
          'ko',
          'review'
        )
        returning id
      `)[0].id;

      if (existingEdition.length === 0) {
        createdCount += 1;
      } else {
        changedCount += 1;
      }

      const sourceRecord = await transaction<{ id: string }[]>`
        insert into provenance.source_records (
          source_id, ingestion_run_id, external_id, entity_kind, work_id, edition_id, raw_payload, payload_sha256, http_status, usage_status
        )
        values (
          ${source[0].id}, ${run[0].id}, ${externalId}, 'edition', ${workId}, ${editionId}, ${toJsonValue(record.raw)}::jsonb, ${payloadHash}, 200, 'accepted'
        )
        on conflict (source_id, external_id, payload_sha256)
        do update set fetched_at = now(), ingestion_run_id = excluded.ingestion_run_id, usage_status = 'accepted'
        returning id
      `;

      const observations = [
        ["title", title],
        ["publisher_name", record.publisher],
        ["published_on", record.publishedOn],
        ["page_count", record.pageCount],
        ["isbn13", isbn13]
      ] as const;
      for (const [fieldName, value] of observations) {
        if (value === null) {
          continue;
        }
        await transaction`
          insert into provenance.field_observations (
            source_record_id, entity_kind, entity_id, field_name, observed_value, normalized_value, confidence, accepted_at
          )
          values (${sourceRecord[0].id}, 'edition', ${editionId}, ${fieldName}, ${transaction.json(value)}, ${transaction.json(value)}, 1, now())
        `;
      }

      if (isbn13) {
        await transaction`
          insert into catalog.edition_identifiers (edition_id, identifier_type, normalized_value, validation_status, source_record_id)
          values (${editionId}, 'isbn13', ${isbn13}, 'valid', ${sourceRecord[0].id})
          on conflict (identifier_type, normalized_value)
          do update set edition_id = excluded.edition_id, source_record_id = excluded.source_record_id
        `;
        await transaction`
          insert into catalog.isbn_registry (isbn13, canonical_edition_id, validation_status)
          values (${isbn13}, ${editionId}, 'valid')
          on conflict (isbn13)
          do update set canonical_edition_id = excluded.canonical_edition_id, last_seen_at = now()
        `;
      }
    }

    await transaction`
      update provenance.ingestion_runs
      set status = 'succeeded', finished_at = now(), records_seen = ${records.length}, records_created = ${createdCount}, records_changed = ${changedCount}
      where id = ${run[0].id}
    `;
  });
  console.log(`Imported ${records.length} National Library bibliographic record(s).`);
} finally {
  await sql.end();
}