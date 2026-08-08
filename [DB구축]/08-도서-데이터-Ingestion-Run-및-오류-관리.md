# 도서 데이터 Ingestion Run 및 오류 관리 설계

## 테이블

| 테이블 | 핵심 열 | 제약 |
| --- | --- | --- |
| `provenance.ingestion_runs` | `id`, `source_id`, `job_type`, `trigger_type`, `status`, `started_at`, `finished_at`, `cursor_before`, `cursor_after`, `records_seen`, `records_created`, `records_changed`, `error_count`, `config_snapshot` | 상태 전이 기록 |
| `provenance.ingestion_errors` | `id`, `run_id`, `source_record_id`, `stage`, `error_code`, `message`, `retryable`, `attempt`, `context`, `resolved_at` | `run_id` FK |
| `provenance.ingestion_checkpoints` | `source_id`, `job_type`, `cursor`, `updated_at`, `last_successful_run_id` | 복합 PK |
| `operations.data_quality_issues` | `id`, `entity_kind`, `entity_id`, `rule_code`, `severity`, `status`, `evidence`, `detected_at`, `resolved_at` | 열린 동일 이슈는 유니크 |

## 실행 정책

- `queued -> running -> succeeded|failed|cancelled|partial`만 허용한다.
- 네트워크·429·5xx 오류만 지수 백오프로 재시도한다. 스키마·권한·체크섬 오류는 재시도하지 않는다.
- 체크포인트는 레코드가 정규화되고 트랜잭션이 커밋된 뒤에만 전진한다.
- 실패한 수집은 이전에 공개된 카탈로그를 되돌리지 않는다. 운영자에게 누락·오래된 데이터 경고를 만든다.