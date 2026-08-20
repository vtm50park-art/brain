# 라우팅 표 — requiredActions → 실행 도구

`claim` 이 돌려주는 `requiredActions` 와 `directive` 의 실제 의도를 함께 보고 고른다.
`toolPlan.entries[].toolKey` 는 OS 가 제안한 힌트다. 더 나은 수단이 있으면 그걸 쓰고,
실제로 쓴 것을 `result.toolUsed` 에 정직하게 적는다.

## ASSET_GENERATE_IMAGE

| 지시 성격 | 1순위 | 대안 |
|---|---|---|
| 단발 이미지 · 컨셉 시안 | `openart_generate_image` | `Higgsfield generate_image` |
| 배치(여러 장 독립 생성) | `Higgsfield generate_image_batch` + `jobs_wait` | — |
| 캐릭터 시트 · 턴어라운드 | Higgsfield `get_workflow_instructions{workflow:"character-sheet"}` 선행 | — |
| 상품 상세페이지 컷 | 스킬 `ecommerce-detail-page` | — |
| 로고·브랜드 그래픽 | 스킬 `design` (캔버스) | Canva `generate-design` |
| 편집(업스케일/누끼/확장/리프레임) | Higgsfield 전용 툴 (`upscale_image` / `remove_background` / `outpaint_image` / `reframe`) | 재생성 금지 |

## ASSET_GENERATE_VIDEO

| 지시 성격 | 1순위 |
|---|---|
| 나레이션 해설 영상(한국어) | 스킬 `vox-motion-graphics-kr` |
| 나레이션 해설 영상(영문/일반) | 스킬 `choteamjang-motion-graphics-factory` |
| 로고·제품 프로모 모션 | 스킬 `higgsfield-motion-design` |
| 쇼핑 숏츠(상품 URL 기반) | 스킬 `sync-shopshorts-higgs` |
| 샷리스트/프롬프트 설계만 | 스킬 `seedance-director-pro` |
| 단발 클립 | `Higgsfield generate_video` | 
| 이미지→영상 | `kling_ai image_to_video` |

**영상은 길다.** 생성 대기 중 `vtm_session_heartbeat` 로 lease 를 갱신한다.

## DOCUMENT_CREATE / DOCUMENT_UPDATE

| 산출 형식 | 도구 |
|---|---|
| Word (.docx) | 스킬 `docx` |
| 슬라이드 (.pptx) | 스킬 `pptx` |
| 스프레드시트 (.xlsx/.csv) | 스킬 `xlsx` |
| PDF | 스킬 `pdf` |
| 차트·대시보드 포함 | 스킬 `dataviz` 선행 |
| 웹 문서 · 공유용 리포트 | Artifact 발행 (`artifact-design` 선행) |
| 구글 문서 | `Google Drive create_file` |

## ASSET_UPLOAD / 산출물 영구화

모든 산출물은 제출 전에 **Google Drive 영구 사본**을 만든다.
`vtm_session_result.storage` 에 `driveFileId` · `driveWebViewUrl` · `checksumSha256` 등을 채운다.
생성 서비스가 준 URL은 만료된다 — 그것만 `artifactRef` 로 남기지 않는다.

## RESOURCE_READ

읽기 전용 조사. WebSearch / WebFetch / 각 MCP 의 조회 툴. 산출물은 보통
`TEXT_REPORT` 또는 `STRUCTURED_ANALYSIS`.

## artifactType 선택

| 만든 것 | artifactType |
|---|---|
| 글·보고서 | `TEXT_REPORT` |
| 구조화 분석·비교표 | `STRUCTURED_ANALYSIS` |
| 콘텐츠 기획안·대본 | `CONTENT_BRIEF` |
| 문서 파일 | `DOCUMENT_REF` |
| 이미지 | `IMAGE_REF` |
| 영상 | `VIDEO_REF` |
| 데이터셋·시트 | `DATA_REF` |
