import postgres from "postgres";

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
  featureCodes: string[];
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
  explanationSource: "template" | "gemini";
};

const featureCodePattern = /^[A-Z][A-Z0-9_]{1,63}$/;

export const uniqueFeatureCodes = (codes: string[]) => [...new Set(codes.filter((code) => featureCodePattern.test(code)))];

async function renderExplanation(candidate: CatalogCandidate, matches: string[]): Promise<Pick<Recommendation, "explanation" | "explanationSource">> {
  const fallback = `선택한 특성 ${matches.join(", ")}과 잘 맞는 검수된 도서 후보입니다.`;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || matches.length === 0) {
    return { explanation: fallback, explanationSource: "template" };
  }

  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: [
              "아래 검증된 정보만 사용해 한국어로 한 문장 추천 이유를 작성하세요.",
              "새 줄거리, 수상, 판매량, 독자 정보는 절대 추가하지 마세요.",
              `제목: ${candidate.title}`,
              `검증된 일치 특성: ${matches.join(", ")}`,
            ].join("\n"),
          }],
        }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 120 },
      }),
      signal: AbortSignal.timeout(5_000),
    });
    const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    return response.ok && text && text.length <= 280
      ? { explanation: text, explanationSource: "gemini" }
      : { explanation: fallback, explanationSource: "template" };
  } catch {
    return { explanation: fallback, explanationSource: "template" };
  }
}

export async function findRecommendations(
  client: postgres.Sql,
  request: RecommendationRequest,
): Promise<Recommendation[]> {
  const preferredFeatureCodes = uniqueFeatureCodes(request.preferredFeatureCodes);
  const avoidedFeatureCodes = uniqueFeatureCodes(request.avoidedFeatureCodes);
  const candidates = await client<CatalogCandidate[]>`
    select
      work.id as "workId",
      edition.id as "editionId",
      work.canonical_title as title,
      string_agg(distinct contributor.display_name, ', ') as author,
      work.description,
      coalesce(array_agg(distinct feature.feature_code) filter (where feature.review_status = 'approved'), '{}'::text[]) as "featureCodes"
    from catalog.works as work
    join catalog.editions as edition on edition.work_id = work.id
    left join catalog.work_contributors as work_contributor on work_contributor.work_id = work.id and work_contributor.role_code = 'author'
    left join catalog.contributors as contributor on contributor.id = work_contributor.contributor_id
    left join catalog.work_feature_values as feature on feature.work_id = work.id
    where work.catalog_status = 'published'
      and edition.catalog_status = 'published'
    group by work.id, edition.id
    order by work.updated_at desc
    limit 100
  `;

  const ranked = candidates
    .map((candidate) => {
      const matchedFeatureCodes = preferredFeatureCodes.filter((code) => candidate.featureCodes.includes(code));
      const hasAvoidedFeature = avoidedFeatureCodes.some((code) => candidate.featureCodes.includes(code));
      return { candidate, matchedFeatureCodes, hasAvoidedFeature, score: matchedFeatureCodes.length };
    })
    .filter((candidate) => !candidate.hasAvoidedFeature && candidate.score > 0)
    .sort((left, right) => right.score - left.score || left.candidate.title.localeCompare(right.candidate.title, "ko"))
    .slice(0, request.limit);

  return Promise.all(ranked.map(async ({ candidate, matchedFeatureCodes, score }) => ({
    workId: candidate.workId,
    editionId: candidate.editionId,
    title: candidate.title,
    author: candidate.author,
    description: candidate.description,
    score,
    matchedFeatureCodes,
    ...(await renderExplanation(candidate, matchedFeatureCodes)),
  })));
}