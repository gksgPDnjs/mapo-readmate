import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

if (existsSync(".env")) {
  process.loadEnvFile();
}

const databaseUrl = process.env.DATABASE_URL;
const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");
if (!apiKey) throw new Error("GOOGLE_BOOKS_API_KEY가 .env에 없습니다. 먼저 키를 넣어주세요.");

const COVERS_DIR = join(process.cwd(), "frontend/public/covers");
const MANIFEST_PATH = join(process.cwd(), "frontend/src/data/bookCovers.json");
mkdirSync(COVERS_DIR, { recursive: true });
mkdirSync(join(process.cwd(), "frontend/src/data"), { recursive: true });

function slugify(title: string) {
  return title
    .replace(/[:：,·]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function pickBestImage(imageLinks: Record<string, string> | undefined) {
  if (!imageLinks) return null;
  const order = ["extraLarge", "large", "medium", "small", "thumbnail", "smallThumbnail"];
  for (const key of order) {
    if (imageLinks[key]) return imageLinks[key].replace(/^http:/, "https:");
  }
  return null;
}

function loadExistingManifest(): Record<string, string> {
  if (!existsSync(MANIFEST_PATH)) return {};
  try {
    return JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  } catch {
    return {};
  }
}

async function fetchJsonWithRetry(url: string, retries = 3): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await fetch(url);
    const data = await response.json();
    const message = data?.error?.message as string | undefined;
    const isTransient = message && /temporarily unavailable|rate limit|backend error/i.test(message);
    if (!isTransient) return data;
    if (attempt === retries) return data;
    await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
  }
}

const client = postgres(databaseUrl, { max: 1 });

try {
  const books = await client<{ title: string; author: string | null }[]>`
    select work.canonical_title as title, string_agg(distinct contributor.display_name, ', ') as author
    from catalog.works as work
    left join catalog.work_contributors as credit on credit.work_id = work.id and credit.role_code = 'author'
    left join catalog.contributors as contributor on contributor.id = credit.contributor_id
    where work.catalog_status = 'published'
    group by work.id
    order by work.canonical_title
  `;

  const manifest = loadExistingManifest();
  let newlySaved = 0;

  for (const book of books) {
    if (manifest[book.title]) continue;

    const query = book.author ? `intitle:${book.title} inauthor:${book.author}` : `intitle:${book.title}`;
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10&key=${apiKey}`;

    try {
      const searchData = (await fetchJsonWithRetry(url)) as {
        items?: Array<{ volumeInfo?: { imageLinks?: Record<string, string> } }>;
        error?: { message?: string };
      };

      if (searchData.error) {
        console.log(`건너뜀 (API 오류): ${book.title} - ${searchData.error.message}`);
        continue;
      }

      const withCover = searchData.items?.find((item) => item.volumeInfo?.imageLinks);
      const imageUrl = pickBestImage(withCover?.volumeInfo?.imageLinks);
      if (!imageUrl) {
        console.log(`건너뜀 (표지 없음): ${book.title}`);
        continue;
      }

      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        console.log(`건너뜀 (다운로드 실패): ${book.title}`);
        continue;
      }
      const buffer = Buffer.from(await imageResponse.arrayBuffer());
      const filename = `${slugify(book.title)}.jpg`;
      writeFileSync(join(COVERS_DIR, filename), buffer);
      manifest[book.title] = `/covers/${filename}`;
      newlySaved += 1;
      writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
      console.log(`저장됨: ${book.title} -> ${filename}`);
    } catch (error) {
      console.log(`건너뜀 (오류): ${book.title}`, error instanceof Error ? error.message : error);
    }

    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  console.log(`\n이번 실행: ${newlySaved}권 신규 저장 / 전체 매니페스트: ${Object.keys(manifest).length}/${books.length}권.`);
} finally {
  await client.end();
}
