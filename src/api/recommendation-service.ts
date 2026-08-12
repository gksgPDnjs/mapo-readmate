import postgres from "postgres";
import { createApimClient } from "../ai/apimClient.js";

export type RecommendationRequest = {
  preferredFeatureCodes: string[];
  avoidedFeatureCodes: string[];
  limit: number;
};

type CatalogCandidate = {
  workId: string;
  editionId: string;
  title: string;
  author: string | null;
  description: string | null;
  featureStrengths: Record<string, number>;
};

export type Recommendation = {
  workId: string;
  editionId: string;
  title: string;
  author: string | null;
  description: string | null;
  score: number;
  matchedFeatureCodes: string[];
  explanation: string;
  explanationSource: "template" | "apim";
};

export type RecommendationResult = {
  recommendations: Recommendation[];
  appliedPreferredFeatureCodes: string[];
  ignoredPreferredFeatureCodes: string[];
  appliedAvoidedFeatureCodes: string[];
  ignoredAvoidedFeatureCodes: string[];
};

const featureCodePattern = /^[A-Z][A-Z0-9_]{1,63}$/;

export const uniqueFeatureCodes = (codes: string[]) => [...new Set(codes.filter((code) => featureCodePattern.test(code)))];

async function renderExplanation(candidate: CatalogCandidate, matches: string[]): Promise<Pick<Recommendation, "explanation" | "explanationSource">> {
  const fallback = `선택한 특성 ${matches.join(", ")}과 잘 맞는 검수된 도서 후보입니다.`;
  const config = createApimClient();

  if (!config || matches.length === 0) {
    return { explanation: fallback, explanationSource: "template" };
  }

  try {
    const prompt = [
      "아래 검증된 정보만 사용해 한국어로 한 문장 추천 이유를 작성하세요.",
      "새 줄거리, 수상, 판매량, 독자 정보는 절대 추가하지 마세요. 문장 하나만 출력하세요.",
      `제목: ${candidate.title}`,
      `검증된 일치 특성: ${matches.join(", ")}`,
    ].join("\n");

    const response = await config.client.responses.create({
      model: config.model,
      input: prompt,
      max_output_tokens: 200,
    });
    const text = response.output_text?.trim();

    return text && text.length > 0 && text.length <= 280
      ? { explanation: text, explanationSource: "apim" }
      : { explanation: fallback, explanationSource: "template" };
  } catch {
    return { explanation: fallback, explanationSource: "template" };
  }
}

export async function findRecommendations(
  client: postgres.Sql | postgres.TransactionSql,
  request: RecommendationRequest,
): Promise<RecommendationResult> {
  const preferredFeatureCodes = uniqueFeatureCodes(request.preferredFeatureCodes);
  const avoidedFeatureCodes = uniqueFeatureCodes(request.avoidedFeatureCodes);
  const candidates = await client<CatalogCandidate[]>`
    select
      work.id as "workId",
      edition.id as "editionId",
      work.canonical_title as title,
      coalesce(string_agg(distinct contributor.display_name, ', '), '저자 정보 수집 중입니다.') as author,
      coalesce(work.description, '소개 정보 수집 중입니다.') as description,
      coalesce(
        jsonb_object_agg(feature.feature_code, feature.strength) filter (where feature.review_status = 'approved'),
        '{}'::jsonb
      ) as "featureStrengths"
    from catalog.works as work
    join catalog.editions as edition on edition.work_id = work.id
    left join catalog.work_contributors as work_contributor on work_contributor.work_id = work.id and work_contributor.role_code = 'author'
    left join catalog.contributors as contributor on contributor.id = work_contributor.contributor_id
    left join catalog.work_feature_values as feature on feature.work_id = work.id
    where work.catalog_status = 'published'
      and edition.catalog_status = 'published'
    group by work.id, edition.id
    order by work.updated_at desc
  `;

  const supportedFeatureCodes = new Set(candidates.flatMap((candidate) => Object.keys(candidate.featureStrengths)));
  const appliedPreferredFeatureCodes = preferredFeatureCodes.filter((code) => supportedFeatureCodes.has(code));
  const ignoredPreferredFeatureCodes = preferredFeatureCodes.filter((code) => !supportedFeatureCodes.has(code));
  const appliedAvoidedFeatureCodes = avoidedFeatureCodes.filter((code) => supportedFeatureCodes.has(code));
  const ignoredAvoidedFeatureCodes = avoidedFeatureCodes.filter((code) => !supportedFeatureCodes.has(code));
  const selectedWorkIds = new Set<string>();
  const ranked = candidates
    .map((candidate) => {
      const matchedFeatureCodes = appliedPreferredFeatureCodes.filter((code) => code in candidate.featureStrengths);
      const hasAvoidedFeature = appliedAvoidedFeatureCodes.some((code) => code in candidate.featureStrengths);
      const score = matchedFeatureCodes.reduce((total, code) => total + candidate.featureStrengths[code], 0);
      return { candidate, matchedFeatureCodes, hasAvoidedFeature, score };
    })
    .filter((candidate) => !candidate.hasAvoidedFeature && candidate.score > 0)
    .sort((left, right) => right.score - left.score || left.candidate.title.localeCompare(right.candidate.title, "ko"))
    .filter((candidate) => {
      if (selectedWorkIds.has(candidate.candidate.workId)) {
        return false;
      }
      selectedWorkIds.add(candidate.candidate.workId);
      return true;
    })
    .slice(0, request.limit);

  const recommendations = await Promise.all(ranked.map(async ({ candidate, matchedFeatureCodes, score }) => ({
    workId: candidate.workId,
    editionId: candidate.editionId,
    title: candidate.title,
    author: candidate.author,
    description: candidate.description,
    score,
    matchedFeatureCodes,
    ...(await renderExplanation(candidate, matchedFeatureCodes)),
  })));

  return {
    recommendations,
    appliedPreferredFeatureCodes,
    ignoredPreferredFeatureCodes,
    appliedAvoidedFeatureCodes,
    ignoredAvoidedFeatureCodes,
  };
}