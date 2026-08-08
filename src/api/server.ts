import { createHash, randomBytes } from "node:crypto";
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

type ActiveFirstStageQuestion = {
  id: string;
  code: string;
  prompt: string;
  dimensionCode: string;
  options: Array<{ id: string; code: string; label: string; score: number }>;
};

type FirstStageResponseInput = { questionId?: string; optionId?: string };

const firstStageDimensionLabels = {
  purpose_knowledge_story: { left: "지식", neutral: "균형", right: "이야기", leftCode: "K", neutralCode: "B", rightCode: "S" },
  language_east_west: { left: "동양 배경", neutral: "문화권 무관", right: "서양 배경", leftCode: "E", neutralCode: "G", rightCode: "W" },
  popularity_mainstream_discovery: { left: "검증된 인기작", neutral: "혼합", right: "새로운 발견", leftCode: "P", neutralCode: "M", rightCode: "N" },
  difficulty_light_deep: { left: "가볍게", neutral: "중간", right: "깊이 있게", leftCode: "L", neutralCode: "M", rightCode: "D" },
} as const;

function firstStageTrait(scores: Record<string, number>) {
  const axes = Object.entries(firstStageDimensionLabels).map(([dimensionCode, labels]) => {
    const score = scores[dimensionCode] ?? 0;
    const direction = score > 15 ? "right" : score < -15 ? "left" : "neutral";
    return {
      code: dimensionCode,
      score,
      label: labels[direction],
      letter: labels[`${direction}Code`],
      opposite: direction === "left" ? labels.right : labels.left,
      value: direction === "right" ? Math.round((score + 100) / 2) : Math.round((100 - score) / 2),
    };
  });
  const strongestAxis = [...axes].sort((left, right) => Math.abs(right.score) - Math.abs(left.score))[0];

  return {
    code: axes.map((axis) => axis.letter).join(""),
    name: Math.abs(strongestAxis.score) <= 15 ? "균형 잡힌 독서형" : `${strongestAxis.label} 독서형`,
    axes,
  };
}

function firstStageFeatureCodes(scores: Record<string, number>) {
  const codes = new Set<string>();
  const purpose = scores.purpose_knowledge_story ?? 0;
  const language = scores.language_east_west ?? 0;
  const difficulty = scores.difficulty_light_deep ?? 0;

  codes.add(purpose >= 0 ? "G_NOVEL" : "D_HUMAN");
  if (language < -15) codes.add("O_KR");
  if (language > 15) codes.add("O_EN");
  codes.add(difficulty < -15 ? "DIFF_EASY" : difficulty > 15 ? "DIFF_DEEP" : "DIFF_MEDIUM");
  return [...codes];
}

function requireDatabase(reply: { code(statusCode: number): { send(payload: unknown): unknown } }) {
  if (client) return client;
  reply.code(503).send({ error: "database_unavailable" });
  return null;
}

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

app.get("/api/quiz/active", async (_request, reply) => {
  const database = requireDatabase(reply);
  if (!database) return;

  const questions = await database<ActiveFirstStageQuestion[]>`
    select question.id, question.code, question.prompt, question.dimension_code as "dimensionCode",
      jsonb_agg(jsonb_build_object('id', option.id, 'code', option.code, 'label', option.label,
        'score', (option.value ->> 'score')::int) order by option.display_order) as options
    from quiz.questions as question
    join quiz.quiz_versions as version on version.id = question.quiz_version_id
    join quiz.question_options as option on option.question_id = question.id
    where version.version = 'first-stage-v1' and version.status = 'active' and question.status = 'active'
    group by question.id
    order by min(question.display_order)
  `;
  return { version: "first-stage-v1", questions };
});

app.post("/api/sessions", async (_request, reply) => {
  const database = requireDatabase(reply);
  if (!database) return;
  const session = await database.begin(async (transaction) => {
    const versions = await transaction<{ id: string; dimensionSetId: string }[]>`
      select id, dimension_set_id as "dimensionSetId" from quiz.quiz_versions
      where version = 'first-stage-v1' and status = 'active'
    `;
    if (versions.length !== 1) return null;
    const sessions = await transaction<{ id: string }[]>`
      insert into recommendation.anonymous_sessions (client_token_hash, expires_at)
      values (${createHash("sha256").update(randomBytes(32)).digest("hex")}, now() + interval '30 days')
      returning id
    `;
    const attempts = await transaction<{ id: string }[]>`
      insert into recommendation.quiz_attempts (session_id, quiz_version_id, experience_mode, access_tier, dimension_set_id)
      values (${sessions[0].id}, ${versions[0].id}, 'quick', 'free', ${versions[0].dimensionSetId}) returning id
    `;
    return { id: sessions[0].id, attemptId: attempts[0].id };
  });
  if (!session) return reply.code(503).send({ error: "active_quiz_unavailable" });
  return reply.code(201).send(session);
});

app.put("/api/sessions/:id/responses", async (request, reply) => {
  const database = requireDatabase(reply);
  if (!database) return;
  const { id: sessionId } = request.params as { id: string };
  const { questionId, optionId } = (request.body ?? {}) as FirstStageResponseInput;
  if (!questionId || !optionId) return reply.code(400).send({ error: "invalid_response" });
  const updated = await database.begin(async (transaction) => {
    const attempts = await transaction<{ id: string }[]>`
      select attempt.id from recommendation.quiz_attempts as attempt
      join quiz.questions as question on question.quiz_version_id = attempt.quiz_version_id
      join quiz.question_options as option on option.question_id = question.id
      where attempt.session_id = ${sessionId} and attempt.status = 'in_progress'
        and question.id = ${questionId} and option.id = ${optionId}
    `;
    if (attempts.length !== 1) return false;
    await transaction`
      update recommendation.quiz_responses set superseded_at = now()
      where attempt_id = ${attempts[0].id} and question_id = ${questionId} and superseded_at is null
    `;
    const orders = await transaction<{ nextOrder: number }[]>`
      select coalesce(max(response_order), 0)::int + 1 as "nextOrder"
      from recommendation.quiz_responses where attempt_id = ${attempts[0].id} and question_id = ${questionId}
    `;
    await transaction`
      insert into recommendation.quiz_responses (attempt_id, question_id, selected_option_ids, response_order)
      values (${attempts[0].id}, ${questionId}, jsonb_build_array(${optionId}::text), ${orders[0].nextOrder})
    `;
    return true;
  });
  if (!updated) return reply.code(404).send({ error: "session_or_option_not_found" });
  return reply.code(204).send();
});

app.post("/api/sessions/:id/complete", async (request, reply) => {
  const database = requireDatabase(reply);
  if (!database) return;
  const { id: sessionId } = request.params as { id: string };
  const result = await database.begin(async (transaction) => {
    const attempts = await transaction<{ id: string; dimensionSetId: string; ruleSetId: string }[]>`
      select attempt.id, attempt.dimension_set_id as "dimensionSetId", rule_set.id as "ruleSetId"
      from recommendation.quiz_attempts as attempt
      join quiz.scoring_rule_sets as rule_set on rule_set.quiz_version_id = attempt.quiz_version_id and rule_set.status = 'active'
      where attempt.session_id = ${sessionId} and attempt.status = 'in_progress'
    `;
    if (attempts.length !== 1) return { error: "session_not_in_progress" as const };
    const responses = await transaction<{ dimensionCode: string; score: number }[]>`
      select question.dimension_code as "dimensionCode", (option.value ->> 'score')::int as score
      from recommendation.quiz_responses as response
      join quiz.questions as question on question.id = response.question_id
      join lateral jsonb_array_elements_text(response.selected_option_ids) as selected(option_id) on true
      join quiz.question_options as option on option.id::text = selected.option_id
      where response.attempt_id = ${attempts[0].id} and response.superseded_at is null
      order by question.display_order
    `;
    if (responses.length !== 12) return { error: "incomplete_responses" as const };
    const totals = Object.fromEntries(Object.keys(firstStageDimensionLabels).map((code) => [code, { total: 0, count: 0 }]));
    for (const response of responses) {
      const dimension = totals[response.dimensionCode as keyof typeof totals];
      if (!dimension) return { error: "invalid_dimension" as const };
      dimension.total += response.score;
      dimension.count += 1;
    }
    const scores = Object.fromEntries(Object.entries(totals).map(([code, total]) => [code, Math.round((total.total / total.count) * 100)]));
    const trait = firstStageTrait(scores);
    const recommendationResult = await findRecommendations(transaction, {
      preferredFeatureCodes: firstStageFeatureCodes(scores), avoidedFeatureCodes: [], limit: 3,
    });
    if (recommendationResult.recommendations.length !== 3) return { error: "insufficient_candidates" as const };
    const snapshots = await transaction<{ id: string }[]>`
      insert into recommendation.preference_profile_snapshots (
        session_id, quiz_attempt_id, rule_set_id, access_tier, dimension_set_id, sequence, dimension_scores, confidence_scores
      ) values (
        ${sessionId}, ${attempts[0].id}, ${attempts[0].ruleSetId}, 'free', ${attempts[0].dimensionSetId}, 1,
        ${transaction.json(scores)}, ${transaction.json(Object.fromEntries(Object.keys(scores).map((code) => [code, 1])))}
      ) returning id
    `;
    const engines = await transaction<{ id: string }[]>`
      select id from recommendation.engine_versions where version = 'first-stage-demo-v1' and status = 'active'
    `;
    if (engines.length !== 1) return { error: "demo_engine_unavailable" as const };
    const runs = await transaction<{ id: string }[]>`
      insert into recommendation.recommendation_runs (
        session_id, quiz_attempt_id, profile_snapshot_id, engine_version_id, access_tier, dimension_set_id,
        requested_item_count, status, completed_at, candidate_count
      ) values (
        ${sessionId}, ${attempts[0].id}, ${snapshots[0].id}, ${engines[0].id}, 'free', ${attempts[0].dimensionSetId},
        3, 'completed', now(), ${recommendationResult.recommendations.length}
      ) returning id
    `;
    const roles = ["read_now", "stretch", "discovery"] as const;
    for (const [index, recommendation] of recommendationResult.recommendations.entries()) {
      const items = await transaction<{ id: string }[]>`
        insert into recommendation.recommendation_items (
          run_id, work_id, edition_id, role, display_order, total_score, fit_label, first_action, trade_offs
        ) values (
          ${runs[0].id}, ${recommendation.workId}, ${recommendation.editionId}, ${roles[index]}, ${index + 1},
          ${recommendation.score}, ${index === 0 ? "strong" : "good"}, '도서 소개를 읽고 첫 장을 열어보세요.', '[]'::jsonb
        ) returning id
      `;
      await transaction`
        insert into recommendation.explanation_renderings (item_id, template_version, body, generator_type, input_checksum)
        values (${items[0].id}, 'first-stage-v1', ${recommendation.explanation}, ${recommendation.explanationSource},
          ${createHash("sha256").update(`${sessionId}:${recommendation.workId}`).digest("hex")})
      `;
    }
    const publicCode = randomBytes(5).toString("hex").toUpperCase();
    await transaction`
      insert into recommendation.public_result_codes (session_id, public_code) values (${sessionId}, ${publicCode})
      on conflict (session_id) do update set public_code = excluded.public_code
    `;
    await transaction`update recommendation.quiz_attempts set status = 'completed', completed_at = now() where id = ${attempts[0].id}`;
    return {
      publicCode,
      trait,
      recommendations: recommendationResult.recommendations.map((recommendation, index) => ({
        role: roles[index],
        ...recommendation,
      })),
    };
  });
  if ("error" in result) return reply.code(422).send(result);
  return result;
});

app.get("/api/results/:publicCode", async (request, reply) => {
  const database = requireDatabase(reply);
  if (!database) return;
  const { publicCode } = request.params as { publicCode: string };
  const rows = await database<{
    publicCode: string; dimensionScores: Record<string, number>; role: "read_now" | "stretch" | "discovery";
    title: string; author: string | null; description: string | null; totalScore: number; explanation: string | null;
  }[]>`
    select result_code.public_code as "publicCode", profile.dimension_scores as "dimensionScores", item.role,
      work.canonical_title as title, string_agg(distinct contributor.display_name, ', ') as author, work.description,
      item.total_score::float as "totalScore", rendering.body as explanation
    from recommendation.public_result_codes as result_code
    join recommendation.recommendation_runs as run on run.session_id = result_code.session_id and run.status = 'completed'
    join recommendation.preference_profile_snapshots as profile on profile.id = run.profile_snapshot_id
    join recommendation.recommendation_items as item on item.run_id = run.id
    join catalog.works as work on work.id = item.work_id
    left join catalog.work_contributors as credit on credit.work_id = work.id and credit.role_code = 'author'
    left join catalog.contributors as contributor on contributor.id = credit.contributor_id
    left join recommendation.explanation_renderings as rendering on rendering.item_id = item.id
    where result_code.public_code = ${publicCode.toUpperCase()}
    group by result_code.public_code, profile.dimension_scores, item.id, work.id, rendering.body
    order by item.display_order
  `;
  if (rows.length === 0) return reply.code(404).send({ error: "result_not_found" });
  return {
    publicCode: rows[0].publicCode,
    trait: firstStageTrait(rows[0].dimensionScores),
    recommendations: rows.map(({ role, title, author, description, totalScore, explanation }) => ({ role, title, author, description, totalScore, explanation })),
  };
});

app.post("/api/feedback", async (request, reply) => {
  const database = requireDatabase(reply);
  if (!database) return;
  const body = (request.body ?? {}) as { sessionId?: string; eventType?: string; metadata?: Record<string, unknown> };
  const allowedEventTypes = new Set(["item_viewed", "liked", "disliked", "started_reading", "detail_opened", "result_not_helpful"]);
  if (!body.sessionId || !body.eventType || !allowedEventTypes.has(body.eventType)) {
    return reply.code(400).send({ error: "invalid_feedback" });
  }
  const sessions = await database<{ id: string }[]>`
    select id from recommendation.anonymous_sessions where id = ${body.sessionId} and status = 'active'
  `;
  if (sessions.length !== 1) return reply.code(404).send({ error: "session_not_found" });
  await database`
    insert into recommendation.feedback_events (session_id, event_type, metadata)
    values (${body.sessionId}, ${body.eventType}, ${database.json((body.metadata ?? {}) as unknown as postgres.JSONValue)})
  `;
  return reply.code(201).send({ recorded: true });
});

app.get("/api/admin/demo-stats", async (_request, reply) => {
  const database = requireDatabase(reply);
  if (!database) return;
  const [stats] = await database<{
    sessions: number;
    completedSessions: number;
    responses: number;
    recommendationRuns: number;
    recommendationItems: number;
    feedbackEvents: number;
  }[]>`
    select
      (select count(*)::int from recommendation.anonymous_sessions) as sessions,
      (select count(*)::int from recommendation.quiz_attempts where status = 'completed') as "completedSessions",
      (select count(*)::int from recommendation.quiz_responses where superseded_at is null) as responses,
      (select count(*)::int from recommendation.recommendation_runs where status = 'completed') as "recommendationRuns",
      (select count(*)::int from recommendation.recommendation_items) as "recommendationItems",
      (select count(*)::int from recommendation.feedback_events) as "feedbackEvents"
  `;
  return { checkedAt: new Date().toISOString(), ...stats };
});

app.post("/api/recommendations/preview", async (request, reply) => {
  if (!client) {
    return reply.code(503).send({ error: "database_unavailable" });
  }

  const recommendationRequest = parseRecommendationRequest(request.body);
  if (!recommendationRequest) {
    return reply.code(400).send({ error: "invalid_recommendation_request" });
  }

  const recommendationResult = await findRecommendations(client, recommendationRequest);
  const inputChecksum = createHash("sha256").update(JSON.stringify(recommendationRequest)).digest("hex");
  return { inputChecksum, ...recommendationResult };
});

app.addHook("onClose", async () => {
  await client?.end();
});

const port = Number(process.env.API_PORT ?? 3001);
await app.listen({ port, host: "0.0.0.0" });