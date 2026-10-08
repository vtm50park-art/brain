# CLAUDE VERCEL PREVIEW AUTONOMY CONTRACT

- 지위: VTM 운영 SSOT — Claude 직원 runtime 의 Vercel Preview Delivery Surface 권한 계약. 영구 규칙.
- 근거: 본부장 지시(2026-10-08) 「Vercel HUMAN_GATE 처리 방향 변경 — CONNECTOR AUTHORITY DEFECT」.
- 적용 범위: 서지윤 실장과 Claude 직원이 승인된 Work Order 의 사람이 볼 결과물(웹·랜딩·Preview)을 배포하는 모든 경우.
- 함께 읽는 계약: HUMAN-VIEWABLE RESULT LINK CONTRACT(`docs/executive-report.md`,
  vtm-os-next `governance/HUMAN_VIEWABLE_RESULT_LINK_CONTRACT.md` §7) — 결과물 링크는 산출물 전용 URL 이어야 한다.

## 1. 원칙

승인된 Work Order 범위 안에서 새 고객·프로젝트용 **Preview Delivery Surface 는 Claude 직원이 스스로 만든다.**
생성 → 배포 → readback → QA 를 사람 클릭 없이 완주한다. 개별 Preview Project 생성을 Human Gate 로 올리지 않는다.
무제한 관리자 권한은 아니다 — 아래 §3 은 계속 Human Gate 다.

## 2. AUTO-ALLOWED (Human Gate 없음)

| 행위 | 조건 |
|---|---|
| 신규 Preview Project 생성 | 승인된 VTM team(`vtm50park-9052s-projects`) 안. Git 연결 없음. 이름은 산출물 전용(예: `momo-pick-clinic-v2`) |
| 승인 team 내 project 조회 | 읽기 |
| Preview deployment 생성 | target 미지정(= preview). `target: production` 금지 |
| deployment 상태·로그·readback | 읽기 |
| 환경변수 없는 static preview 구성 | `vercel.json` 의 build/output/header 만. env·secret 없음 |
| 승인된 Work Order 산출물 배포 | 산출물 경로만(예: `projects/momo-v2/site/`) |
| Preview URL 확보·QA·readback | binding 확인 포함(RESULT LINK CONTRACT §7) |
| 신규 Preview Project 의 Preview 공개 설정 | 그 신규 프로젝트에 한해, 본부장이 로그인 없이 열 수 있도록 Vercel Authentication 을 끈 상태로 생성 |

## 3. HUMAN GATE 유지

- Production 승격 · Production deployment 생성 · rollback
- Production domain / alias 변경 (기존 Production 도메인)
- billing · subscription · 도메인 구매 · 새 유료 리소스
- team · member · role 변경
- secret · credential · 환경변수 조회 · 노출 · 변경
- 기존 Production Project 설정 변경 · 일시정지 · 삭제, destructive project deletion
- 승인되지 않은 외부 workspace/team 사용

## 4. 현재 권한 상태 (실측, 2026-10-08 · READ-ONLY 조사)

| 항목 | Claude Vercel connection 실측 |
|---|---|
| 인증 주체 | 사용자 토큰이 아님 — `GET /v2/user` → **404 User not found** |
| team | `vtm50park-9052s-projects`(`team_dqzrQaPEbCjIbpzNAfHgd30M`) 1개 조회됨. 팀 구성원은 OWNER 1명(본부장 계정)뿐 |
| 보이는 project | **3개만**: vtm-admin-core · vtm-paljaondo · vtm-paljaondo-admin |
| 안 보이는 project | `vtm-os-next` — 그 Preview 조회 시 403 "authorize the deployment's project and team" |
| project 생성 | `POST /v11/projects` → **403 "You don't have permission to create the project"** |
| integration 설정 조회 | `GET /v1/integrations/configurations` → 403 |

판정(2026-10-08 정정): 403 은 Vercel API 서버의 권한 판정이다(응답 `code=forbidden action=create resource=project`,
Vercel requestId 발급 — 로컬 승인 팝업 단계가 아님). 다만 **"Selected → All projects 로 바꾸면 해결된다"는 가설은 검증되지
않았다.** 본부장 검증(2026-10-08): 공식 Vercel MCP 는 `mcp.vercel.com` OAuth 방식이고, 공식 Tools reference
(`vercel.com/docs/agent-resources/vercel-mcp/tools`)에 신규 Project 생성 tool 이 없다. 따라서 이 connection 으로
프로젝트를 만드는 경로는 공식 지원 경로로 쓰지 않는다.

Tool identity 실측(이 세션):
- 도구 이름 공간 `mcp__Vercel__*`(claude.ai connector 이름 "Vercel"). 서버 URL·OAuth client 는 세션에서 조회 수단이 없다.
- 공식 Tools reference 에 있는 이름(`search_vercel_documentation`, `web_fetch_vercel_url`, `get_access_to_vercel_url`,
  `list_projects` 등)과 함께, reference 에 없는 REST 대응 도구(`create_project` 등 수백 개, 설명에 "CLI fallback",
  오류에 `operation: "POST /v11/projects"`)가 노출된다. 즉 이 서버는 Vercel REST 를 이 connection 의 토큰으로 대리 호출한다.
- `create_project` 는 공식 Tools reference 에 없는 도구다 — 공식 MCP 의 지원 기능으로 간주하지 않는다.

GPT 측 Vercel connection 의 권한은 Claude 쪽에서 조회할 수단이 없어 **실측하지 못했다**.

## 5. 1회 설정 — 공식 지원 경로 (Vercel REST API · CLI)

공식 문서로 확인된 프로젝트 생성 경로:
- REST `POST https://api.vercel.com/v11/projects?teamId=…` — `Authorization: Bearer <Vercel access token>`
  (docs: Projects › Create a new project / Managing projects "Create a project with cURL")
- CLI `vercel project add <name>` · 배포 `vercel deploy`(기본 preview, `--prod` 일 때만 production) (docs: CLI)
- 토큰 발급: CLI `vercel tokens add <name>` 또는 REST `POST /v3/user/tokens` — `teamId`, `expiresAt`, `projectId`(선택)
  지정 가능. projectId 로 묶은 토큰은 그 프로젝트 전용이라 **신규 프로젝트 생성에는 쓸 수 없다** → team 범위 토큰이 필요하다.

최소권한 안(본부장 1회):
1. team `vtm50park-9052s-projects` 범위, 만료일이 있는 Vercel access token 1개를 발급한다(이름 예: `vtm-preview-surface`).
2. 그 값을 GitHub `vtm50park-art/vtm-os-next` 저장소의 Actions secret(예: `VERCEL_PREVIEW_TOKEN`)으로만 저장한다.
   채팅·문서·로그에 붙여 넣지 않는다.
3. 이후 서지윤이 그 secret 을 쓰는 고정 워크플로(preview-surface)를 만든다. 워크플로 코드가 허용 동작을 강제한다:
   신규 프로젝트 생성(Git 연결 없음 · env 없음) · preview 배포(`--prod` 없음) · 상태 조회 · readback 만.
   production · alias/domain · env · 삭제 · billing 호출은 코드에 없고, 입력 검증으로 거부한다.

남는 위험(정직 기록): Vercel access token 은 발급자 역할(OWNER)의 권한을 가진다 — 동작 단위로 좁히는 토큰 범위는
문서에서 확인되지 않았다. 그래서 최소권한은 토큰이 아니라 **secret 격리 + 고정 워크플로의 허용 동작 목록**으로 지킨다.
Vercel App 설치(`vercel oauth-apps install --permission … --projects *`)의 권한 범위 중 프로젝트 생성을 허용하는 scope 가
있는지는 문서에서 확인하지 못했다 — 확인 전에는 쓰지 않는다.


### 5-2. 토큰 발급 경로 확정 (2026-10-08, Vercel CLI 63.0.2 소스 실측)

- 본부장 실측: `npx vercel tokens create "vtm-preview-surface" --scope vtm50park-9052s-projects` →
  "Cannot create tokens for this app." (Owner 계정, login PASS).
- 원인(CLI 공식 패키지 `vercel@63.0.2` `dist/commands-bulk.js` 원문): "Creating a new token requires a classic personal
  access token. Sessions from "vercel login" use OAuth and cannot call the create-token API." ·
  "The Vercel API only allows creating personal tokens when the CLI is authenticated with a classic personal access token
  (dashboard: Account → Settings → Tokens). OAuth login cannot mint new tokens." · 서버 판정 문구
  "Only user authentication tokens can be used to create new tokens."
- 결론: `vercel login`(OAuth) 세션 앱에는 토큰 발급 권한을 부여하는 설정이 구조적으로 없다. Vercel 공식 경로는
  대시보드 토큰 화면 `https://vercel.com/account/tokens` (CLI 소스 상수 `VERCEL_ACCOUNT_TOKENS_URL`)에서 Owner 가 직접 발급하는 것이다.
  발급한 토큰은 팀 `vtm50park-9052s-projects` 범위로, GitHub Actions secret `VERCEL_PREVIEW_TOKEN` 에만 저장한다.

## 6. 실행 규칙 (설정 후)

1. 프로젝트 생성(§5 고정 워크플로): `framework: null`, Git 연결 없음, Vercel Authentication 끔, 이름은 산출물 전용.
2. 배포: 산출물 정적 파일만. `projectSettings` 대신 `vercel.json` 으로 build/output 지정. `target` 미지정(preview).
3. readback: 레일이 직접 열어 2xx + 산출물 고유 문구(binding) 확인. index·css·js·data·이미지 각각 200.
4. 결과 보고: 판정 댓글 `- Result URL:` + `- Artifact binding:` → employee-verdict 레일 → 총괄과장 Telegram.
5. 증거: deployment id · target(preview) · readyState · readback HTTP · binding 결과를 판정 댓글에 남긴다. 자격증명 금지.

## 7. Acceptance (이 계약의 실측 기준)

- Claude 직원이 신규 synthetic Preview Project 를 직접 생성 — Human click 0
- Preview deploy · readback PASS
- Production mutation 0 · billing mutation 0 · destructive action 0
- 모모형 V2 전용 프로젝트(`momo-pick-clinic-v2`)도 같은 레일로 직접 생성
- 실제 URL 을 총괄과장이 Telegram 으로 보고
