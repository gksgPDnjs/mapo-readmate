import { existsSync } from "node:fs";
import { readFileSync } from "node:fs";

if (existsSync(".env")) {
  process.loadEnvFile();
}

const apiBase = process.env.RECOMMENDATION_API_URL ?? "http://localhost:3001";

type TraitType = { type_code: string; title: string };
const traitTypes = JSON.parse(readFileSync("survey/type_description_v2.json", "utf-8")) as TraitType[];

// 극단값(±100)을 기준으로 각 축 글자를 실제 추천에 쓰이는 feature 코드로 변환한다.
// (server.ts의 firstStageFeatureCodes와 동일한 임계값 로직)
const axisFeatureMap: Record<string, string> = {
  E: "D_HUMAN",
  I: "G_NOVEL",
  O: "O_KR",
  W: "O_EN",
  F: "POP_MAINSTREAM",
  N: "POP_NICHE",
  S: "DIFF_EASY",
  H: "DIFF_DEEP",
};

let failing = 0;
for (const type of traitTypes) {
  const letters = type.type_code.split("");
  const preferredFeatureCodes = letters.map((letter) => axisFeatureMap[letter]);
  const response = await fetch(`${apiBase}/api/recommendations/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preferredFeatureCodes, avoidedFeatureCodes: [], limit: 3 }),
  });
  const payload = (await response.json()) as { recommendations?: Array<{ title: string }> };
  const count = payload.recommendations?.length ?? 0;
  const status = count >= 3 ? "OK  " : "GAP ";
  if (count < 3) failing += 1;
  console.log(`${status} ${type.type_code} (${type.title}): ${count}권 — ${payload.recommendations?.map((r) => r.title).join(", ") ?? ""}`);
}

if (failing > 0) {
  console.log(`\n${failing}개 타입이 3권 미만입니다. 해당 축 조합에 맞는 책을 보강하세요.`);
  process.exit(1);
} else {
  console.log("\n16개 타입 모두 3권 이상 커버됩니다.");
}
