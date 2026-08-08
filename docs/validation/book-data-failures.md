# Book Data Failures

| ID | Failure | Affected | Evidence |
| --- | --- | --- | --- |
| BQ-001 | ISBN13 missing | 510 works | artifacts/book-catalog-quality.csv |
| BQ-002 | cover missing | 510 editions | artifacts/book-catalog-quality.csv |
| BQ-003 | publisher/page_count missing | 510 / 510 editions | artifacts/book-catalog-quality.csv |
| BQ-004 | approved feature missing | 500 works | artifacts/book-catalog-quality.csv |

모든 영향을 받은 work_id와 edition_id는 [book-catalog-quality.csv](../../artifacts/book-catalog-quality.csv)에 행 단위로 기록했다.
