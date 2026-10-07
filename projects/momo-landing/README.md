# 모모형 추천 · 전국 탈모 진료 전문의 리스트 (랜딩페이지)

회장님 요청 랜딩페이지 원본 소스. 현재 배포본과 동일한 파일이다.

- 고정 링크: https://momo-pick-clinic.vercel.app (프리뷰 배포에 연결한 별칭, 프로덕션 아님)
- 배포 위치: Vercel `vtm-admin-core` 프로젝트 프리뷰 (본부장 승인 범위: 프리뷰만)
- 기준 배포: `dpl_7oqbN8joZrYtf3crSZ5RiUMJo8uE` (2026-10-07)

## 구조

| 경로 | 내용 |
|---|---|
| `src/index.html` | 페이지 본문 (후킹 → 문제 제기 → 비교 → 해결책 → 병원 안내) |
| `src/styles.css` | 기본 스타일 |
| `src/v4.css` | v4 이후 추가 스타일 (화보, VS 위치, 배경 밝기, 도장 효과, 툴바 숨김) |
| `src/app.js` | 회전 헤드라인, 콜라주, 지도 → 리스트 드릴다운, 검색 |
| `src/data/clinics.json` | 병원 89곳 (xlsx 88 + docx 1) |
| `build.mjs` | Vercel 빌드: Pretendard 자체 호스팅, 지도 GeoJSON → SVG, Dropshot 이미지 내려받기·WebP 변환 |
| `assets-backup/` | 배포에 쓰인 화보·공유 이미지 사본 (빌드는 Dropshot CDN에서 받음) |
| `tools/` | 공유 미리보기 이미지(1200×630) 생성 템플릿 |

## 빌드

```
npm install
node build.mjs            # 이미지·지도는 네트워크에서 받음
LOCAL_BUILD=1 node build.mjs   # 네트워크 차단 환경: 이미지 자리 표시용으로 대체
```

출력은 `public/`. `vercel.json` 이 framework 없음 · `npm run build` · `public` 출력으로 고정한다.

## 수정 후 반영

새 배포를 만든 뒤 고정 링크 별칭 `momo-pick-clinic.vercel.app` 을 새 배포로 다시 연결한다.
배포 URL 자체는 바뀌므로 회장님께는 고정 링크만 전달한다.

## 남은 결정 사항

- 공식 런칭용 전용 Vercel 프로젝트 (현재 vtm-admin-core 를 빌려 씀)
- 화보·공유 이미지가 Dropshot 공개 CDN 에 있음 → 런칭 시 전용 호스팅으로 이전
- 의료광고 표현, TV 영상 속 특정 원장 노출, 병원 데이터 불일치 건 (Executive Report 참조)
