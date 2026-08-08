import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

if (existsSync(".env")) {
  process.loadEnvFile();
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required. Copy .env.example and provide a PostgreSQL connection string.");
}

const migrationDirectory = fileURLToPath(new URL("../../drizzle/", import.meta.url));
const migrationFiles = (await readdir(migrationDirectory))
  .filter((fileName) => /^\d{4}_.+\.sql$/.test(fileName))
  .sort();
const client = postgres(databaseUrl, { max: 1 });

try {
  await client`create schema if not exists operations`;
  await client`
    create table if not exists operations.schema_migrations (
      name text primary key,
      checksum text not null,
      applied_at timestamptz not null default now()
    )
  `;

  for (const migrationFile of migrationFiles) {
    const migrationName = migrationFile.replace(/\.sql$/, "");
    const migrationSql = await readFile(join(migrationDirectory, migrationFile), "utf8");
    const checksum = createHash("sha256").update(migrationSql).digest("hex");
    const applied = await client<{ checksum: string }[]>`
      select checksum from operations.schema_migrations where name = ${migrationName}
    `;

    if (applied.length > 0) {
      if (applied[0].checksum !== checksum) {
        throw new Error(`${migrationName} was changed after it was applied. Create a new migration instead.`);
      }
      console.log(`${migrationName} is already applied.`);
      continue;
    }

    await client.begin(async (transaction) => {
      await transaction`select pg_advisory_xact_lock(hashtext('mapo-readmate-schema'))`;
      await transaction.unsafe(migrationSql);
      await transaction`
        insert into operations.schema_migrations (name, checksum)
        values (${migrationName}, ${checksum})
      `;
    });
    console.log(`Applied ${migrationName}.`);
  }
} finally {
  await client.end();
}