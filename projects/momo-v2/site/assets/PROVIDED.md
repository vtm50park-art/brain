# 제공 입력 — 수정 금지

이 폴더(`assets/`)와 `../data/` 는 서지윤 실장이 통합 단계에서 제공한 입력이다. 구현자는 읽기만 한다.

| 경로 | 출처 |
|---|---|
| `fonts/` | Pretendard Variable dynamic subset (SIL OFL 1.1, 라이선스 전문은 `fonts/pretendard.css` 머리말) |
| `img/momo-suit-900.webp` · `momo-suit-sq.webp` · `momo-sweater-760.webp` · `momo-sweater-face.webp` | 모모형 화보 (본부장 사용 승인, 2026-10-07) |
| `img/momo-pick-900.webp` | 모모형추천 이미지. 서지윤 결정 B6('6만명' 비표시)에 따라 이미지 속 '네이버 6만명 삼탈모 카페 운영자' 문구 영역만 투명 처리 |
| `../data/clinics.json` | 병원 89건 (원본 대조 규칙은 `../../V2_BUILD_SPEC.md` §7) |
| `../data/map.json` | 공개 행정경계 GeoJSON(southkorea-maps, kostat 2013) → SVG path 변환본. W·H, prov[code,name,d,bb], seoul[name,d,bb], gg[name,d,bb], anchor. bb = [x1,y1,x2,y2] |

> 2026-10-07 통합 검수: `img/momo.jpg`(흰 가운 착용 컷)는 의사 오인 연출 금지 원칙 위반으로 제공 입력에서 제거했다.
