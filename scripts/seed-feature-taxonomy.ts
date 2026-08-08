import { parse } from "csv-parse/sync";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

type FeatureRow = {
  category: string;
  attribute_id: string;
  attribute_name_kr: string;
  description: string;
};

const categoryTaxonomy: Record<string, "genre" | "topic" | "tone" | "form" | "reading_trait"> = {
  genre: "genre",
  domain: "topic",
  mood: "tone",
  style_tone: "tone",
  visual_type: "form",
};

if (existsSync(".env")) {
  process.loadEnvFile();
}

const csvPath = fileURLToPath(new URL("../[DB구축]/book_feature_v1.csv", import.meta.url));
const contents = await readFile(csvPath, "utf8");
const features = parse(contents, { columns: true, skip_empty_lines: true, trim: true }) as FeatureRow[];

if (features.some((feature) => !feature.category || !feature.attribute_id || !feature.attribute_name_kr || !feature.description)) {
  throw new Error("book_feature_v1.csv has an incomplete feature row.");
}

if (process.argv.includes("--check")) {
  console.log(`Feature taxonomy is valid: ${features.length} definitions ready to seed.`);
  process.exit(0);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required. Run db:seed-features:check to validate the CSV without a database.");
}

const client = postgres(databaseUrl, { max: 1 });

try {
  await client.begin(async (transaction) => {
    for (const feature of features) {
      const taxonomy = categoryTaxonomy[feature.category] ?? "reading_trait";
      const slug = `feature-${feature.attribute_id.toLowerCase()}`;

      await transaction`
        insert into catalog.feature_definitions (code, category, label, description)
        values (${feature.attribute_id}, ${feature.category}, ${feature.attribute_name_kr}, ${feature.description})
        on conflict (code) do update
          set category = excluded.category,
              label = excluded.label,
              description = excluded.description,
              active = true
      `;
      await transaction`
        insert into catalog.tags (taxonomy, slug, label)
        values (${taxonomy}, ${slug}, ${feature.attribute_name_kr})
        on conflict (taxonomy, slug) do update
          set label = excluded.label,
              status = 'active'
      `;
    }
  });
  console.log(`Seeded ${features.length} catalog feature definitions.`);
} finally {
  await client.end();
}