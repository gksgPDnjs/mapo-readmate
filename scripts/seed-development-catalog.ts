import { existsSync } from "node:fs";
import postgres from "postgres";

type DevelopmentBook = {
  title: string;
  author: string;
  description: string;
  features: string[];
};

const developmentBooks: DevelopmentBook[] = [
  { title: "아몬드", author: "손원평", description: "감정과 관계를 배워 가는 성장 이야기입니다.", features: ["G_NOVEL", "O_KR", "M_CALM", "DIFF_MEDIUM", "TONE_POETIC", "END_REAL", "VIS_TEXT", "UTIL_EMPATHY", "POP_MAINSTREAM"] },
  { title: "불편한 편의점", author: "김호연", description: "동네 편의점을 중심으로 사람들의 관계를 다룬 소설입니다.", features: ["G_NOVEL", "O_KR", "M_HEALING", "DIFF_EASY", "TONE_CLEAR", "END_HAPPY", "VIS_TEXT", "UTIL_EMPATHY", "POP_MAINSTREAM"] },
  { title: "달러구트 꿈 백화점", author: "이미예", description: "꿈을 사고파는 공간을 배경으로 한 판타지 소설입니다.", features: ["G_FANTASY", "O_KR", "M_HEALING", "DIFF_EASY", "TONE_POETIC", "END_OPEN", "VIS_TEXT", "UTIL_EMPATHY", "POP_MAINSTREAM"] },
  { title: "긴긴밤", author: "루리", description: "서로 다른 존재가 함께 살아가는 여정을 그린 이야기입니다.", features: ["G_NOVEL", "O_KR", "M_CALM", "DIFF_MEDIUM", "TONE_POETIC", "END_OPEN", "VIS_ILLUST", "UTIL_EMPATHY", "POP_NICHE"] },
  { title: "체리새우: 비밀글입니다", author: "황영미", description: "학교와 친구 관계 속에서 자신의 목소리를 찾아가는 소설입니다.", features: ["G_NOVEL", "O_KR", "M_CALM", "DIFF_MEDIUM", "TONE_CLEAR", "END_REAL", "VIS_TEXT", "UTIL_EMPATHY", "POP_NICHE"] },
  { title: "지구 끝의 온실", author: "김초엽", description: "재난 이후의 세계와 사람들의 선택을 다룬 과학소설입니다.", features: ["G_NOVEL", "D_SCIENCE", "O_KR", "M_CALM", "DIFF_DEEP", "TONE_POETIC", "END_OPEN", "VIS_TEXT", "UTIL_PERSPECTIVE", "POP_NICHE"] },
  { title: "아주 작은 습관의 힘", author: "제임스 클리어", description: "작은 행동의 반복을 통해 습관을 설계하는 방법을 다룹니다.", features: ["G_SELF_DEV", "D_HUMAN", "O_EN", "DIFF_MEDIUM", "TONE_CLEAR", "VIS_TEXT", "UTIL_PRACTICAL", "POP_MAINSTREAM"] },
  { title: "팩트풀니스", author: "한스 로슬링", description: "데이터를 통해 세계를 바라보는 관점을 제안하는 교양서입니다.", features: ["D_HUMAN", "D_SCIENCE", "O_EU", "DIFF_DEEP", "TONE_CLEAR", "VIS_DIAGRAM", "UTIL_PERSPECTIVE", "POP_MAINSTREAM"] },
  { title: "나미야 잡화점의 기적", author: "히가시노 게이고", description: "편지를 매개로 서로의 삶에 닿는 이야기를 담은 소설입니다.", features: ["G_FANTASY", "O_JP", "M_HEALING", "DIFF_MEDIUM", "TONE_WITTY", "END_HAPPY", "VIS_TEXT", "UTIL_EMPATHY", "POP_MAINSTREAM"] },
  { title: "셜록 홈즈", author: "아서 코난 도일", description: "단서를 따라 사건의 해답을 찾는 추리 이야기 모음입니다.", features: ["G_MYSTERY", "O_EN", "M_THRILLING", "DIFF_MEDIUM", "TONE_CLEAR", "END_HAPPY", "VIS_TEXT", "UTIL_PERSPECTIVE", "POP_MAINSTREAM"] },
  { title: "완득이", author: "김려령", description: "다문화 가정의 소년이 복싱을 통해 세상과 마주하는 성장소설입니다.", features: ["G_NOVEL", "O_KR", "M_HEALING", "DIFF_EASY", "TONE_WITTY", "END_HAPPY", "VIS_TEXT", "UTIL_EMPATHY", "POP_MAINSTREAM"] },
  { title: "위저드 베이커리", author: "구병모", description: "마법 베이커리를 배경으로 상처와 치유를 다룬 청소년 판타지입니다.", features: ["G_FANTASY", "O_KR", "M_CALM", "DIFF_MEDIUM", "TONE_POETIC", "END_OPEN", "VIS_TEXT", "UTIL_EMPATHY", "POP_NICHE"] },
  { title: "시간을 파는 상점", author: "김선영", description: "시간을 사고파는 상점을 매개로 벌어지는 청소년 미스터리입니다.", features: ["G_MYSTERY", "O_KR", "M_CALM", "DIFF_EASY", "TONE_CLEAR", "END_HAPPY", "VIS_TEXT", "UTIL_PERSPECTIVE", "POP_NICHE"] },
  { title: "스노볼", author: "박소영", description: "얼어붙은 세계의 방송 스튜디오를 배경으로 한 청소년 SF입니다.", features: ["G_NOVEL", "D_SCIENCE", "O_KR", "M_THRILLING", "DIFF_MEDIUM", "TONE_CLEAR", "END_OPEN", "VIS_TEXT", "UTIL_PERSPECTIVE", "POP_NICHE"] },
  { title: "페인트", author: "이희영", description: "국가가 아이를 양육하는 미래 사회에서 '부모를 고르는' 설정의 청소년 SF입니다.", features: ["G_NOVEL", "D_SCIENCE", "O_KR", "M_CALM", "DIFF_MEDIUM", "TONE_CLEAR", "END_OPEN", "VIS_TEXT", "UTIL_PERSPECTIVE", "POP_MAINSTREAM"] },
  { title: "마당을 나온 암탉", author: "황선미", description: "알을 품고 싶어하는 암탉이 마당을 떠나 자유를 찾아가는 우화입니다.", features: ["G_FANTASY", "O_KR", "M_HEALING", "DIFF_EASY", "TONE_POETIC", "END_REAL", "VIS_ILLUST", "UTIL_EMPATHY", "POP_MAINSTREAM"] },
  { title: "데미안", author: "헤르만 헤세", description: "자기 자신에게 이르는 길을 찾아가는 독일 고전 성장소설입니다.", features: ["G_NOVEL", "D_HUMAN", "O_EU", "M_CALM", "DIFF_DEEP", "TONE_POETIC", "END_OPEN", "VIS_TEXT", "UTIL_PERSPECTIVE", "POP_MAINSTREAM"] },
  { title: "어린 왕자", author: "생텍쥐페리", description: "여러 별을 여행하며 진짜 소중한 것을 배우는 프랑스 고전 우화입니다.", features: ["G_FANTASY", "O_EU", "M_CALM", "DIFF_EASY", "TONE_POETIC", "END_OPEN", "VIS_ILLUST", "UTIL_PERSPECTIVE", "POP_MAINSTREAM"] },
  { title: "나니아 연대기: 사자, 마녀 그리고 옷장", author: "C.S. 루이스", description: "옷장을 통해 다른 세계로 넘어간 아이들의 모험을 그린 영국 고전 판타지입니다.", features: ["G_FANTASY", "O_EN", "M_THRILLING", "DIFF_MEDIUM", "TONE_CLEAR", "END_HAPPY", "VIS_TEXT", "UTIL_PERSPECTIVE", "POP_NICHE"] },
  { title: "해리포터와 마법사의 돌", author: "J.K. 롤링", description: "마법 학교에 입학한 소년의 모험을 그린 영국 판타지 소설입니다.", features: ["G_FANTASY", "O_EN", "M_THRILLING", "DIFF_MEDIUM", "TONE_WITTY", "END_HAPPY", "VIS_TEXT", "UTIL_EMPATHY", "POP_MAINSTREAM"] },
  { title: "오베라는 남자", author: "프레드릭 배크만", description: "까칠한 노인과 이웃들 사이에 생겨나는 관계를 유쾌하게 그린 스웨덴 소설입니다.", features: ["G_NOVEL", "O_EU", "M_HEALING", "DIFF_MEDIUM", "TONE_WITTY", "END_HAPPY", "VIS_TEXT", "UTIL_EMPATHY", "POP_NICHE"] },
  { title: "창문 넘어 도망친 100세 노인", author: "요나스 요나손", description: "100세 생일에 창문으로 도망친 노인의 기상천외한 모험을 그린 스웨덴 소설입니다.", features: ["G_NOVEL", "O_EU", "M_WITTY", "DIFF_MEDIUM", "TONE_WITTY", "END_HAPPY", "VIS_TEXT", "UTIL_PERSPECTIVE", "POP_MAINSTREAM"] },
  { title: "미움받을 용기", author: "기시미 이치로", description: "아들러 심리학을 대화체로 풀어낸 일본의 자기계발 교양서입니다.", features: ["G_SELF_DEV", "D_HUMAN", "O_JP", "DIFF_MEDIUM", "TONE_CLEAR", "VIS_TEXT", "UTIL_PRACTICAL", "POP_MAINSTREAM"] },
  { title: "나는 나로 살기로 했다", author: "김수현", description: "자존감과 나답게 사는 삶에 대해 다룬 한국 에세이입니다.", features: ["G_ESSAY", "D_HUMAN", "O_KR", "M_HEALING", "DIFF_EASY", "TONE_CLEAR", "VIS_ILLUST", "UTIL_EMPATHY", "POP_MAINSTREAM"] },
  { title: "언어의 온도", author: "이기주", description: "말과 글이 사람에게 남기는 온도에 대해 사색하는 한국 에세이입니다.", features: ["G_ESSAY", "D_HUMAN", "O_KR", "M_CALM", "DIFF_EASY", "TONE_POETIC", "VIS_TEXT", "UTIL_PERSPECTIVE", "POP_NICHE"] },
  { title: "하마터면 열심히 살 뻔했다", author: "하완", description: "힘을 빼고 사는 삶에 대한 유쾌한 성찰을 담은 한국 에세이입니다.", features: ["G_ESSAY", "D_HUMAN", "O_KR", "M_WITTY", "DIFF_EASY", "TONE_WITTY", "VIS_ILLUST", "UTIL_PRACTICAL", "POP_MAINSTREAM"] },
  { title: "사피엔스", author: "유발 하라리", description: "인류의 역사를 넓은 시야로 조망하는 이스라엘 저자의 교양서입니다.", features: ["D_HUMAN", "D_SCIENCE", "O_EU", "DIFF_DEEP", "TONE_CLEAR", "VIS_DIAGRAM", "UTIL_PERSPECTIVE", "POP_MAINSTREAM"] },
  { title: "코스모스", author: "칼 세이건", description: "우주와 과학의 경이로움을 다룬 미국의 고전 과학 교양서입니다.", features: ["D_SCIENCE", "O_EN", "DIFF_DEEP", "TONE_POETIC", "VIS_DIAGRAM", "UTIL_PERSPECTIVE", "POP_NICHE"] },
  { title: "침묵의 봄", author: "레이첼 카슨", description: "살충제가 자연에 미치는 위험을 알린 미국의 환경학 고전입니다.", features: ["D_SCIENCE", "O_EN", "DIFF_DEEP", "TONE_CLEAR", "VIS_TEXT", "UTIL_PERSPECTIVE", "POP_NICHE"] },
  { title: "정의란 무엇인가", author: "마이클 샌델", description: "하버드 강의를 바탕으로 정의와 도덕적 선택을 다룬 미국의 철학 교양서입니다.", features: ["D_HUMAN", "O_EN", "DIFF_DEEP", "TONE_CLEAR", "VIS_TEXT", "UTIL_PERSPECTIVE", "POP_MAINSTREAM"] },
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