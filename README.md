# mapo-readmate

## Database Development

PostgreSQL과 Drizzle 기반으로 무료 4축 추천과 유료 9축 정밀 추천을 지원하는 초기 스키마를 제공합니다.

```bash
npm install
npm test
DATABASE_URL='postgresql://...' npm run db:migrate
```

`drizzle/0000_initial_schema.sql`은 카탈로그, 퀴즈, 익명 세션, 추천 실행, 계정, 플랜·권한·결제 웹훅 테이블을 생성합니다. `premium` 정밀 매칭은 데이터베이스 트리거가 활성 `premium_recommendation` 권한과 `refined_9` 축 집합을 확인합니다.

환경 변수 형식은 `.env.example`을 참고합니다. 실제 결제 수단의 카드·계좌 정보는 데이터베이스에 저장하지 않습니다.
 
