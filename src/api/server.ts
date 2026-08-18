import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import postgres from "postgres";
import { findRecommendations, type RecommendationRequest } from "./recommendation-service.js";
import { determineTraitCodeByAi } from "./ai-trait.js";

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

// 실제 기획된 16가지 독서 성향 체계(survey/mbti_type_v2.csv, type_description_v2.json).
// dimension_code는 quiz.questions에 저장된 값과 정확히 일치해야 한다.
const firstStageDimensionLabels = {
  purpose_knowledge_story: { left: "지식 탐구형", right: "감정 몰입형", leftCode: "E", rightCode: "I" },
  language_east_west: { left: "동양 선호", right: "서양 선호", leftCode: "O", rightCode: "W" },
  popularity_mainstream_discovery: { left: "유명세 보장", right: "신인 발굴", leftCode: "F", rightCode: "N" },
  difficulty_light_deep: { left: "초보 독자", right: "고수 독자", leftCode: "S", rightCode: "H" },
} as const;

type TraitTypeInfo = { code: string; title: string; description: string; keywords: string[] };

function loadTraitTypes(): TraitTypeInfo[] {
  const raw = readFileSync(new URL("../../survey/type_description_v2.json", import.meta.url), "utf-8");
  const parsed = JSON.parse(raw) as Array<{ type_code: string; title: string; description: string; keyword: string[] }>;
  return parsed.map((entry) => ({ code: entry.type_code, title: entry.title, description: entry.description, keywords: entry.keyword }));
}

const TRAIT_TYPES = loadTraitTypes();
const VALID_TRAIT_CODES = new Set(TRAIT_TYPES.map((entry) => entry.code));
const TRAIT_TYPE_SUMMARY = TRAIT_TYPES.map((entry) => `${entry.code}: ${entry.title} - ${entry.description}`).join("\n");

// axes의 "우세한 쪽"은 반드시 code의 실제 글자를 따라야 한다 — 원점수 부호로 독립적으로
// 계산하면, AI가 규칙기반과 다른 코드를 골랐을 때 코드 글자와 막대그래프가 서로 모순된다.
function computeAxes(code: string, scores: Record<string, number>) {
  return Object.entries(firstStageDimensionLabels).map(([dimensionCode, labels], index) => {
    const score = scores[dimensionCode] ?? 0;
    const letter = code[index];
    const rightDominant = letter === labels.rightCode;
    return {
      code: dimensionCode,
      score,
      label: rightDominant ? labels.right : labels.left,
      letter,
      opposite: rightDominant ? labels.left : labels.right,
      value: rightDominant ? Math.round((score + 100) / 2) : Math.round((100 - score) / 2),
    };
  });
}

function ruleBasedCodeFromScores(scores: Record<string, number>) {
  return Object.entries(firstStageDimensionLabels)
    .map(([dimensionCode, labels]) => ((scores[dimensionCode] ?? 0) >= 0 ? labels.rightCode : labels.leftCode))
    .join("");
}

function buildTrait(code: string, axes: ReturnType<typeof computeAxes>) {
  const type = TRAIT_TYPES.find((entry) => entry.code === code) ?? TRAIT_TYPES[0];
  return {
    code,
    name: type.title,
    description: type.description,
    keywords: type.keywords.map((keyword) => `#${keyword}`),
    axes,
  };
}

function firstStageFeatureCodes(scores: Record<string, number>) {
  const codes = new Set<string>();
  const purpose = scores.purpose_knowledge_story ?? 0;
  const language = scores.language_east_west ?? 0;
  const popularity = scores.popularity_mainstream_discovery ?? 0;
  const difficulty = scores.difficulty_light_deep ?? 0;

  codes.add(purpose >= 0 ? "G_NOVEL" : "D_HUMAN");
  if (language < -15) codes.add("O_KR");
  if (language > 15) codes.add("O_EN");
  codes.add(popularity >= 0 ? "POP_NICHE" : "POP_MAINSTREAM");
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

async function resolveTraitCode(database: postgres.Sql, sessionId: string, ruleBasedCode: string): Promise<string> {
  const textedResponses = await database<{ dimensionCode: string; prompt: string; label: string }[]>`
    select question.dimension_code as "dimensionCode", question.prompt, option.label
    from recommendation.quiz_responses as response
    join recommendation.quiz_attempts as attempt on attempt.id = response.attempt_id
    join quiz.questions as question on question.id = response.question_id
    join lateral jsonb_array_elements_text(response.selected_option_ids) as selected(option_id) on true
    join quiz.question_options as option on option.id::text = selected.option_id
    where attempt.session_id = ${sessionId} and response.superseded_at is null
    order by question.display_order
  `;
  if (textedResponses.length !== 12) return ruleBasedCode;

  try {
    return await determineTraitCodeByAi(
      textedResponses.map((response) => ({ question: response.prompt, answer: response.label })),
      TRAIT_TYPE_SUMMARY,
      VALID_TRAIT_CODES,
    );
  } catch (error) {
    console.warn("AI 성향 판정 실패, 규칙 기반 결과로 대체합니다:", error);
    return ruleBasedCode;
  }
}

// 1차(12문항) 완료 시점엔 성향 카드만 계산한다 — 추천 도서는 2차(정밀 조건)까지 마쳐야
// 확정되므로 여기서 계산/저장하지 않는다(계산해봤자 2차 완료 시 항상 버려지고, publicCode도
// 2차 결과와 어긋나는 값이 발급되는 문제가 있었다). /api/sessions/:id/finalize 참고.
app.post("/api/sessions/:id/complete", async (request, reply) => {
  const database = requireDatabase(reply);
  if (!database) return;
  const { id: sessionId } = request.params as { id: string };

  const attempts = await database<{ id: string; dimensionSetId: string; ruleSetId: string }[]>`
    select attempt.id, attempt.dimension_set_id as "dimensionSetId", rule_set.id as "ruleSetId"
    from recommendation.quiz_attempts as attempt
    join quiz.scoring_rule_sets as rule_set on rule_set.quiz_version_id = attempt.quiz_version_id and rule_set.status = 'active'
    where attempt.session_id = ${sessionId} and attempt.status = 'in_progress'
  `;
  if (attempts.length !== 1) return reply.code(422).send({ error: "session_not_in_progress" });

  const responses = await database<{ dimensionCode: string; score: number }[]>`
    select question.dimension_code as "dimensionCode", (option.value ->> 'score')::int as score
    from recommendation.quiz_responses as response
    join quiz.questions as question on question.id = response.question_id
    join lateral jsonb_array_elements_text(response.selected_option_ids) as selected(option_id) on true
    join quiz.question_options as option on option.id::text = selected.option_id
    where response.attempt_id = ${attempts[0].id} and response.superseded_at is null
    order by question.display_order
  `;
  if (responses.length !== 12) return reply.code(422).send({ error: "incomplete_responses" });

  const totals = Object.fromEntries(Object.keys(firstStageDimensionLabels).map((code) => [code, { total: 0, count: 0 }]));
  for (const response of responses) {
    const dimension = totals[response.dimensionCode as keyof typeof totals];
    if (!dimension) return reply.code(422).send({ error: "invalid_dimension" });
    dimension.total += response.score;
    dimension.count += 1;
  }
  const scores = Object.fromEntries(Object.entries(totals).map(([code, total]) => [code, Math.round((total.total / total.count) * 100)]));
  const ruleBasedCode = ruleBasedCodeFromScores(scores);
  // AI 호출(느릴 수 있음)은 트랜잭션 밖에서 수행한다 — 커넥션을 오래 붙잡지 않기 위함.
  const traitCode = await resolveTraitCode(database, sessionId, ruleBasedCode);
  const axes = computeAxes(traitCode, scores);
  const trait = buildTrait(traitCode, axes);
  const preferredFeatureCodes = firstStageFeatureCodes(scores);

  const result = await database.begin(async (transaction) => {
    const stillInProgress = await transaction<{ id: string }[]>`
      select id from recommendation.quiz_attempts where id = ${attempts[0].id} and status = 'in_progress'
    `;
    if (stillInProgress.length !== 1) return { error: "session_not_in_progress" as const };
    await transaction`
      insert into recommendation.preference_profile_snapshots (
        session_id, quiz_attempt_id, rule_set_id, access_tier, dimension_set_id, sequence, dimension_scores, confidence_scores, trait_code
      ) values (
        ${sessionId}, ${attempts[0].id}, ${attempts[0].ruleSetId}, 'free', ${attempts[0].dimensionSetId}, 1,
        ${transaction.json(scores)}, ${transaction.json(Object.fromEntries(Object.keys(scores).map((code) => [code, 1])))}, ${traitCode}
      )
    `;
    await transaction`update recommendation.quiz_attempts set status = 'completed', completed_at = now() where id = ${attempts[0].id}`;
    return {};
  });
  if ("error" in result) return reply.code(422).send(result);

  return { trait, preferredFeatureCodes };
});

// 2차(정밀 조건) 완료 시점 — 1차+2차를 합친 최종 조건으로 추천 도서를 계산하고,
// 이때 딱 한 번 publicCode를 발급한다. 그래서 화면에서 본 결과와 QR로 저장한 결과가 항상 같다.
// 이미 완료된 세션이면(중복 제출 등) 새로 계산하지 않고 저장된 결과를 그대로 반환한다.
app.post("/api/sessions/:id/finalize", async (request, reply) => {
  const database = requireDatabase(reply);
  if (!database) return;
  const { id: sessionId } = request.params as { id: string };

  const recommendationRequest = parseRecommendationRequest(request.body);
  if (!recommendationRequest) {
    return reply.code(400).send({ error: "invalid_recommendation_request" });
  }

  const existing = await database<{ publicCode: string }[]>`
    select result_code.public_code as "publicCode"
    from recommendation.public_result_codes as result_code
    join recommendation.recommendation_runs as run on run.session_id = result_code.session_id and run.status = 'completed'
    where result_code.session_id = ${sessionId}
    limit 1
  `;
  if (existing.length === 1) {
    const rows = await database<{
      role: "read_now" | "stretch" | "discovery"; workId: string; editionId: string; title: string; author: string | null;
      description: string | null; totalScore: number; explanation: string | null;
    }[]>`
      select item.role, work.id as "workId", item.edition_id as "editionId", work.canonical_title as title,
        string_agg(distinct contributor.display_name, ', ') as author, work.description,
        item.total_score::float as "totalScore", rendering.body as explanation
      from recommendation.public_result_codes as result_code
      join recommendation.recommendation_runs as run on run.session_id = result_code.session_id and run.status = 'completed'
      join recommendation.recommendation_items as item on item.run_id = run.id
      join catalog.works as work on work.id = item.work_id
      left join catalog.work_contributors as credit on credit.work_id = work.id and credit.role_code = 'author'
      left join catalog.contributors as contributor on contributor.id = credit.contributor_id
      left join recommendation.explanation_renderings as rendering on rendering.item_id = item.id
      where result_code.session_id = ${sessionId}
      group by item.id, work.id, rendering.body
      order by item.display_order
    `;
    return {
      publicCode: existing[0].publicCode,
      recommendations: rows.map((row) => ({
        role: row.role, workId: row.workId, editionId: row.editionId, title: row.title, author: row.author,
        description: row.description, score: row.totalScore, explanation: row.explanation ?? "",
      })),
    };
  }

  const snapshots = await database<{ id: string; dimensionSetId: string }[]>`
    select id, dimension_set_id as "dimensionSetId"
    from recommendation.preference_profile_snapshots
    where session_id = ${sessionId}
    order by sequence desc
    limit 1
  `;
  const attempts = await database<{ id: string }[]>`
    select id from recommendation.quiz_attempts where session_id = ${sessionId} and status = 'completed' order by completed_at desc limit 1
  `;
  if (snapshots.length !== 1 || attempts.length !== 1) {
    return reply.code(422).send({ error: "first_stage_not_completed" });
  }

  // 추천 후보 검색 + 이유 생성 AI 호출(병렬)도 트랜잭션 밖에서 수행한다.
  const recommendationResult = await findRecommendations(database, { ...recommendationRequest, limit: 3 });
  if (recommendationResult.recommendations.length !== 3) return reply.code(422).send({ error: "insufficient_candidates" });

  const engines = await database<{ id: string }[]>`
    select id from recommendation.engine_versions where version = 'first-stage-demo-v1' and status = 'active'
  `;
  if (engines.length !== 1) return reply.code(422).send({ error: "demo_engine_unavailable" });

  const publicCode = randomBytes(5).toString("hex").toUpperCase();
  const roles = ["read_now", "stretch", "discovery"] as const;

  await database.begin(async (transaction) => {
    const runs = await transaction<{ id: string }[]>`
      insert into recommendation.recommendation_runs (
        session_id, quiz_attempt_id, profile_snapshot_id, engine_version_id, access_tier, dimension_set_id,
        requested_item_count, status, completed_at, candidate_count
      ) values (
        ${sessionId}, ${attempts[0].id}, ${snapshots[0].id}, ${engines[0].id}, 'free', ${snapshots[0].dimensionSetId},
        3, 'completed', now(), ${recommendationResult.recommendations.length}
      ) returning id
    `;
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
    await transaction`
      insert into recommendation.public_result_codes (session_id, public_code) values (${sessionId}, ${publicCode})
      on conflict (session_id) do update set public_code = excluded.public_code
    `;
  });

  return {
    publicCode,
    recommendations: recommendationResult.recommendations.map((recommendation, index) => ({
      role: roles[index],
      ...recommendation,
    })),
  };
});

app.get("/api/results/:publicCode", async (request, reply) => {
  const database = requireDatabase(reply);
  if (!database) return;
  const { publicCode } = request.params as { publicCode: string };
  const rows = await database<{
    publicCode: string; dimensionScores: Record<string, number>; traitCode: string | null; role: "read_now" | "stretch" | "discovery";
    title: string; author: string | null; description: string | null; totalScore: number; explanation: string | null;
  }[]>`
    select result_code.public_code as "publicCode", profile.dimension_scores as "dimensionScores", profile.trait_code as "traitCode", item.role,
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
    group by result_code.public_code, profile.dimension_scores, profile.trait_code, item.id, work.id, rendering.body
    order by item.display_order
  `;
  if (rows.length === 0) return reply.code(404).send({ error: "result_not_found" });
  const traitCode = rows[0].traitCode ?? ruleBasedCodeFromScores(rows[0].dimensionScores);
  return {
    publicCode: rows[0].publicCode,
    trait: buildTrait(traitCode, computeAxes(traitCode, rows[0].dimensionScores)),
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

// 배포 단순화를 위해 Fastify가 프론트 빌드 결과물도 같이 서빙한다(별도 정적 호스팅/CORS 불필요).
// 화면 라우팅은 해시(#setup, #test, #r/CODE) 기반이라 서버는 항상 index.html 하나만 내려주면 된다.
const distPath = fileURLToPath(new URL("../../frontend/dist", import.meta.url));
if (existsSync(distPath)) {
  await app.register(fastifyStatic, { root: distPath });
  app.setNotFoundHandler((request, reply) => {
    if (request.raw.url?.startsWith("/api") || request.raw.url === "/health") {
      return reply.code(404).send({ error: "not_found" });
    }
    return reply.sendFile("index.html");
  });
}

const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3001);
await app.listen({ port, host: "0.0.0.0" });