import { existsSync } from "node:fs";
import postgres from "postgres";

type DevelopmentBook = {
  title: string;
  author: string;
  description: string;
  features: string[];
};

const developmentBooks: DevelopmentBook[] = [
  { title: "아몬드", author: "손원평", description: "감정과 관계를 배워 가는 성장 이야기입니다.", features: ["G_NOVEL", "O_KR", "M_CALM", "DIFF_MEDIUM", "TONE_POETIC", "END_REAL", "VIS_TEXT", "UTIL_EMPATHY"] },
  { title: "불편한 편의점", author: "김호연", description: "동네 편의점을 중심으로 사람들의 관계를 다룬 소설입니다.", features: ["G_NOVEL", "O_KR", "M_HEALING", "DIFF_EASY", "TONE_CLEAR", "END_HAPPY", "VIS_TEXT", "UTIL_EMPATHY"] },
  { title: "달러구트 꿈 백화점", author: "이미예", description: "꿈을 사고파는 공간을 배경으로 한 판타지 소설입니다.", features: ["G_FANTASY", "O_KR", "M_HEALING", "DIFF_EASY", "TONE_POETIC", "END_OPEN", "VIS_TEXT", "UTIL_EMPATHY"] },
  { title: "긴긴밤", author: "루리", description: "서로 다른 존재가 함께 살아가는 여정을 그린 이야기입니다.", features: ["G_NOVEL", "O_KR", "M_CALM", "DIFF_MEDIUM", "TONE_POETIC", "END_OPEN", "VIS_ILLUST", "UTIL_EMPATHY"] },
  { title: "체리새우: 비밀글입니다", author: "황영미", description: "학교와 친구 관계 속에서 자신의 목소리를 찾아가는 소설입니다.", features: ["G_NOVEL", "O_KR", "M_CALM", "DIFF_MEDIUM", "TONE_CLEAR", "END_REAL", "VIS_TEXT", "UTIL_EMPATHY"] },
  { title: "지구 끝의 온실", author: "김초엽", description: "재난 이후의 세계와 사람들의 선택을 다룬 과학소설입니다.", features: ["G_NOVEL", "D_SCIENCE", "O_KR", "M_CALM", "DIFF_DEEP", "TONE_POETIC", "END_OPEN", "VIS_TEXT", "UTIL_PERSPECTIVE"] },
  { title: "아주 작은 습관의 힘", author: "제임스 클리어", description: "작은 행동의 반복을 통해 습관을 설계하는 방법을 다룹니다.", features: ["G_SELF_DEV", "D_HUMAN", "O_EN", "DIFF_MEDIUM", "TONE_CLEAR", "VIS_TEXT", "UTIL_PRACTICAL"] },
  { title: "팩트풀니스", author: "한스 로슬링", description: "데이터를 통해 세계를 바라보는 관점을 제안하는 교양서입니다.", features: ["D_HUMAN", "D_SCIENCE", "O_EU", "DIFF_DEEP", "TONE_CLEAR", "VIS_DIAGRAM", "UTIL_PERSPECTIVE"] },
  { title: "나미야 잡화점의 기적", author: "히가시노 게이고", description: "편지를 매개로 서로의 삶에 닿는 이야기를 담은 소설입니다.", features: ["G_FANTASY", "O_JP", "M_HEALING", "DIFF_MEDIUM", "TONE_WITTY", "END_HAPPY", "VIS_TEXT", "UTIL_EMPATHY"] },
  { title: "셜록 홈즈", author: "아서 코난 도일", description: "단서를 따라 사건의 해답을 찾는 추리 이야기 모음입니다.", features: ["G_MYSTERY", "O_EN", "M_THRILLING", "DIFF_MEDIUM", "TONE_CLEAR", "END_HAPPY", "VIS_TEXT", "UTIL_PERSPECTIVE"] },
];

if (existsSync(".env")) {
  process.loadEnvFile();
}

if (process.env.ALLOW_DEVELOPMENT_SEED !== "true") {
  throw new Error("Set ALLOW_DEVELOPMENT_SEED=true to seed development-only catalog records.");
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

const client = postgres(databaseUrl, { max: 1 });

try {
  await client.begin(async (transaction) => {
    const featureCount = await transaction<{ count: string }[]>`select count(*)::text as count from catalog.feature_definitions where active`;
    if (Number(featureCount[0].count) === 0) {
      throw new Error("Seed catalog feature definitions before development books.");
    }

    for (const book of developmentBooks) {
      const existingWork = await transaction<{ id: string }[]>`
        select id from catalog.works where canonical_title = ${book.title} order by created_at limit 1
      `;
      const workId = existingWork[0]?.id ?? (await transaction<{ id: string }[]>`
        insert into catalog.works (canonical_title, description, catalog_status)
        values (${book.title}, ${book.description}, 'published')
        returning id
      `)[0].id;
      const existingContributor = await transaction<{ id: string }[]>`
        select id from catalog.contributors where normalized_name = ${book.author} limit 1
      `;
      const contributorId = existingContributor[0]?.id ?? (await transaction<{ id: string }[]>`
        insert into catalog.contributors (display_name, normalized_name)
        values (${book.author}, ${book.author})
        returning id
      `)[0].id;

      await transaction`
        insert into catalog.work_contributors (work_id, contributor_id, role_code)
        values (${workId}, ${contributorId}, 'author')
        on conflict do nothing
      `;
      const existingEdition = await transaction<{ id: string }[]>`
        select id from catalog.editions where work_id = ${workId} and title = ${book.title} limit 1
      `;
      if (existingEdition.length === 0) {
        await transaction`
          insert into catalog.editions (work_id, title, catalog_status)
          values (${workId}, ${book.title}, 'published')
        `;
      }
      for (const featureCode of book.features) {
        await transaction`
          insert into catalog.work_feature_values (work_id, feature_code, strength, source_type, review_status, reviewed_at)
          values (${workId}, ${featureCode}, 1, 'editorial', 'approved', now())
          on conflict (work_id, feature_code) do update
            set strength = excluded.strength,
                source_type = excluded.source_type,
                review_status = excluded.review_status,
                reviewed_at = excluded.reviewed_at
        `;
      }
    }
  });
  console.log(`Seeded ${developmentBooks.length} development catalog books.`);
} finally {
  await client.end();
}