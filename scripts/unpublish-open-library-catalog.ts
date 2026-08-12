import { existsSync } from "node:fs";
import postgres from "postgres";

if (existsSync(".env")) {
  process.loadEnvFile();
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

// Open Library MVP 벌크 수집분(500권)은 description·세부 feature가 거의 없는
// 미검수 후보라서 실제 추천 후보 풀에서 제외한다(publish 이전 상태로 되돌림).
// 큐레이션된 도서(scripts/seed-development-catalog.ts)는 provenance 기록이 없어 영향받지 않는다.
const client = postgres(databaseUrl, { max: 1 });

try {
  const workIds = await client<{ workId: string }[]>`
    select distinct record.work_id as "workId"
    from provenance.source_records as record
    join provenance.sources as source on source.id = record.source_id
    where source.code = 'open_library' and record.work_id is not null
  `;

  if (workIds.length === 0) {
    console.log("Open Library 소스 레코드가 없습니다. 변경 사항 없음.");
  } else {
    const ids = workIds.map((row) => row.workId);
    await client`update catalog.works set catalog_status = 'draft' where id = any(${ids})`;
    await client`update catalog.editions set catalog_status = 'draft' where work_id = any(${ids})`;
    console.log(`${ids.length}권을 draft 상태로 전환했습니다(추천 후보에서 제외).`);
  }
} finally {
  await client.end();
}
