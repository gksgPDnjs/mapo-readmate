import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import Fastify from "fastify";
import postgres from "postgres";
import { findRecommendations, type RecommendationRequest } from "./recommendation-service.js";

if (existsSync(".env")) {
  process.loadEnvFile();
}

const databaseUrl = process.env.DATABASE_URL;
const client = databaseUrl ? postgres(databaseUrl, { max: 5 }) : null;
const app = Fastify({ logger: false });

function parseRecommendationRequest(body: unknown): RecommendationRequest | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const value = body as Record<string, unknown>;
  const preferredFeatureCodes = Array.isArray(value.preferredFeatureCodes) ? value.preferredFeatureCodes : [];
  const avoidedFeatureCodes = Array.isArray(value.avoidedFeatureCodes) ? value.avoidedFeatureCodes : [];
  const limit = typeof value.limit === "number" ? value.limit : 3;

  if (
    !preferredFeatureCodes.every((code) => typeof code === "string") ||
    !avoidedFeatureCodes.every((code) => typeof code === "string") ||
    !Number.isInteger(limit) || limit < 1 || limit > 5
  ) {
    return null;
  }

  return { preferredFeatureCodes, avoidedFeatureCodes, limit };
}

app.get("/health", async (_request, reply) => {
  if (!client) {
    return reply.code(503).send({ status: "unconfigured", database: "missing" });
  }

  try {
    await client`select 1`;
    return { status: "ok", database: "connected" };
  } catch {
    return reply.code(503).send({ status: "unavailable", database: "unreachable" });
  }
});

app.get("/api/catalog/diagnostics", async (_request, reply) => {
  if (!client) {
    return reply.code(503).send({ error: "database_unavailable" });
  }

  const [catalog, features, sources, books] = await Promise.all([
    client<{ works: number; publishedWorks: number; editions: number; publishedEditions: number }[]>`
      select
        (select count(*)::int from catalog.works) as works,
        (select count(*)::int from catalog.works where catalog_status = 'published') as "publishedWorks",
        (select count(*)::int from catalog.editions) as editions,
        (select count(*)::int from catalog.editions where catalog_status = 'published') as "publishedEditions"
    `,
    client<{ definitions: number; approvedValues: number }[]>`
      select
        (select count(*)::int from catalog.feature_definitions where active) as definitions,
        (select count(*)::int from catalog.work_feature_values where review_status = 'approved') as "approvedValues"
    `,
    client<{ code: string; name: string; active: boolean; recordCount: number }[]>`
      select
        source.code,
        source.name,
        source.active,
        count(record.id)::int as "recordCount"
      from provenance.sources as source
      left join provenance.source_records as record on record.source_id = source.id
      group by source.id
      order by source.catalog_priority nulls last, source.code
    `,
    client<{ title: string; author: string | null; description: string | null; catalogStatus: string }[]>`
      select
        work.canonical_title as title,
        string_agg(distinct contributor.display_name, ', ') as author,
        work.description,
        work.catalog_status as "catalogStatus"
      from catalog.works as work
      left join catalog.work_contributors as credit on credit.work_id = work.id and credit.role_code = 'author'
      left join catalog.contributors as contributor on contributor.id = credit.contributor_id
      group by work.id
      order by work.updated_at desc
      limit 6
    `,
  ]);

  return {
    checkedAt: new Date().toISOString(),
    catalog: catalog[0],
    features: features[0],
    sources,
    books,
  };
});

app.get("/api/deep-questions", async (_request, reply) => {
  if (!client) {
    return reply.code(503).send({ error: "database_unavailable" });
  }

  const questions = await client<{
    code: string;
    prompt: string;
    questionType: string;
    options: Array<{ code: string; label: string; value: Record<string, string> }>;
  }[]>`
    select
      question.code,
      question.prompt,
      question.question_type as "questionType",
      jsonb_agg(jsonb_build_object('code', option.code, 'label', option.label, 'value', option.value) order by option.display_order) as options
    from quiz.questions as question
    join quiz.quiz_versions as version on version.id = question.quiz_version_id
    join quiz.question_options as option on option.question_id = question.id
    where version.version = 'deep-feature-v1'
      and question.status = 'active'
    group by question.id
    order by min(question.display_order)
  `;

  return { version: "deep-feature-v1", questions };
});

app.post("/api/recommendations/preview", async (request, reply) => {
  if (!client) {
    return reply.code(503).send({ error: "database_unavailable" });
  }

  const recommendationRequest = parseRecommendationRequest(request.body);
  if (!recommendationRequest) {
    return reply.code(400).send({ error: "invalid_recommendation_request" });
  }

  const recommendations = await findRecommendations(client, recommendationRequest);
  const inputChecksum = createHash("sha256").update(JSON.stringify(recommendationRequest)).digest("hex");
  return { inputChecksum, recommendations };
});

app.addHook("onClose", async () => {
  await client?.end();
});

const port = Number(process.env.API_PORT ?? 3001);
await app.listen({ port, host: "0.0.0.0" });