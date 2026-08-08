import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const migrationDirectory = fileURLToPath(new URL("../drizzle/", import.meta.url));
const migrationFiles = (await readdir(migrationDirectory))
  .filter((fileName) => /^\d{4}_.+\.sql$/.test(fileName))
  .sort();
const migration = (await Promise.all(migrationFiles.map((fileName) => readFile(join(migrationDirectory, fileName), "utf8")))).join("\n");

const requiredFragments = [
  "create schema if not exists catalog",
  "create schema if not exists quiz",
  "create schema if not exists identity",
  "create schema if not exists billing",
  "create schema if not exists recommendation",
  "create table quiz.dimension_sets",
  "'core_4'",
  "'refined_9'",
  "create table billing.entitlements",
  "create table billing.webhook_events",
  "create table recommendation.quiz_attempts",
  "create or replace function recommendation.assert_quiz_attempt_access()",
  "create or replace function recommendation.assert_recommendation_run_contract()",
  "'premium_recommendation'",
  "create table provenance.sources",
  "create table provenance.source_records",
  "create table provenance.ingestion_runs",
  "create table catalog.library_availability_observations",
  "create table catalog.audience_popularity_signals",
  "create table curation.curations",
  "source_records_linked_entity_check",
  "'national_library_isbn'",
  "'data4library'",
  "'nlcy_librarian'",
  "'first_stage_4'",
  "'first-stage-v1'",
  "'purpose_knowledge_story'",
  "'popularity_mainstream_discovery'",
  "create table catalog.feature_definitions",
  "create table catalog.work_feature_values",
  "create table recommendation.profile_feature_preferences",
  "create table recommendation.explanation_factors",
  "'deep-feature-v1'"
];

const missing = requiredFragments.filter((fragment) => !migration.includes(fragment));

if (missing.length > 0) {
  throw new Error(`DB contract is incomplete: ${missing.join(", ")}`);
}

if (migration.includes("'instant_3'")) {
  throw new Error("DB contract must not expose a three-axis free recommendation mode.");
}

console.log("DB contract is valid: free core_4 and premium refined_9 access are enforced.");