# Dead Catalog Analysis

Synthetic profiles: 5,000 (deterministic seeded simulation using the current DB ranking rule).

| 지표 | 수량 |
| --- | --- |
| 추천 eligible works | 510 |
| books never candidate | 0 |
| books never top3 | 497 |
| no-candidate synthetic runs | 28 |

| Top3 exposure book | runs | share of profiles |
| --- | --- | --- |
| 긴긴밤 | 1965 | 39.3% |
| 나미야 잡화점의 기적 | 1762 | 35.2% |
| 달러구트 꿈 백화점 | 1696 | 33.9% |
| 셜록 홈즈 | 1415 | 28.3% |
| 지구 끝의 온실 | 1382 | 27.6% |
| 불편한 편의점 | 1291 | 25.8% |
| 팩트풀니스 | 1111 | 22.2% |
| 아주 작은 습관의 힘 | 1046 | 20.9% |
| 아몬드 | 907 | 18.1% |
| 체리새우: 비밀글입니다 | 431 | 8.6% |

모든 작품이 후보 조건은 통과한다. 다만 500권은 MVP 기본 특성(G_NOVEL, VIS_TEXT)만 보유하므로 세부 취향별 상위 노출은 아직 제한적이다.
