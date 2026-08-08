# 외부 도서 API Source Record 및 Provenance 설계

## 원칙

외부 응답은 불변 원본으로 보관하고, 정규화 카탈로그 값과 필드별 출처를 분리한다. API 응답 하나가 진실의 단일 기준이 되지 않는다.

## 테이블

| 테이블 | 핵심 열 | 제약 |
| --- | --- | --- |
| `provenance.sources` | `id`, `code`, `name`, `base_url`, `terms_url`, `rights_policy`, `active` | `code` 유니크 |
| `provenance.source_records` | `id`, `source_id`, `external_id`, `entity_kind`, `raw_payload`, `payload_sha256`, `fetched_at`, `source_updated_at`, `http_status`, `usage_status` | `(source_id, external_id, payload_sha256)` 유니크 |
| `provenance.field_observations` | `id`, `source_record_id`, `entity_kind`, `entity_id`, `field_name`, `observed_value`, `normalized_value`, `confidence`, `accepted_at` | 원본 레코드 FK |
| `provenance.asset_rights` | `id`, `source_record_id`, `asset_type`, `asset_url`, `license_status`, `expires_at`, `attribution_text` | 자산별 권리 상태 |

## 적용 정책

- `raw_payload`는 원본 그대로 보관하고 민감한 API 토큰은 적재 전에 제거한다.
- `field_observations.accepted_at`가 있는 관측만 정규화 값의 근거가 된다.
- 표지·소개글은 `asset_rights.license_status = 'approved'`일 때만 사용자 화면에 노출한다.
- 같은 응답 체크섬은 중복 저장하지 않고 마지막 확인 시각만 갱신한다.