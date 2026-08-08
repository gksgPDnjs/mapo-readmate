# Dead Catalog Analysis

Synthetic profiles: 5,000 (deterministic seeded simulation using the current DB ranking rule).

| 지표 | 수량 |
| --- | --- |
| 추천 eligible works | 10 |
| books never candidate | 500 |
| books never top3 | 500 |
| no-candidate synthetic runs | 28 |

| Top3 exposure book | runs | share of profiles |
| --- | --- | --- |
| 긴긴밤 | 2148 | 43.0% |
| 나미야 잡화점의 기적 | 1904 | 38.1% |
| 달러구트 꿈 백화점 | 1792 | 35.8% |
| 불편한 편의점 | 1457 | 29.1% |
| 셜록 홈즈 | 1457 | 29.1% |
| 지구 끝의 온실 | 1395 | 27.9% |
| 팩트풀니스 | 1113 | 22.3% |
| 아주 작은 습관의 힘 | 1061 | 21.2% |
| 아몬드 | 979 | 19.6% |
| 체리새우: 비밀글입니다 | 432 | 8.6% |

원인: review 상태이거나 승인 특성이 없는 500권은 현재 추천 SQL의 후보 조건에서 의도적으로 제외된다. 이들은 데이터 결함이 아니라 검수 파이프라인 미완료로 인한 dead catalog다.
