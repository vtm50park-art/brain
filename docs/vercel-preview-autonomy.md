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

판정: Claude 의 Vercel connection 은 **선택한 일부 프로젝트로 제한된 Vercel App 설치 권한**으로 동작한다
(Vercel 문서: App 설치는 권한 범위와 함께 `--projects <IDs>` 또는 `*`(전체)로 프로젝트를 제한할 수 있다).
신규 프로젝트는 미리 선택해 둘 수 없으므로, 프로젝트가 제한된 설치에서는 생성 자체가 403 이다.

GPT 측 Vercel connection 의 권한은 Claude 쪽에서 조회할 수단이 없어 **실측하지 못했다**(ChatGPT 커넥터 설정은
Claude connector · 저장소 · Drive 어디에도 기록이 없다). 비교는 Claude 측 실측값만으로 한다.

## 5. 1회 설정 (ONE-TIME CONNECTOR AUTHORITY SETUP)

이 설정은 team OWNER(본부장)만 할 수 있다. 1회로 끝나고, 이후 개별 프로젝트마다 다시 요청하지 않는다.

1. Claude 의 Vercel 연결(claude.ai → Settings → Connectors → Vercel)을 다시 승인하면서,
   team `vtm50park-9052s-projects` 의 프로젝트 접근을 **All projects(전체)** 로 선택한다.
   (또는 Vercel 대시보드 → Team Settings → Integrations/Apps 에서 Claude 설치의 Project Access 를 All Projects 로 변경)
2. 연결은 세션 시작 시 읽히므로, 변경 후 403 이 계속되면 새 세션에서 이어간다.

최소권한 메모: Vercel 은 "새 프로젝트 생성만" 을 따로 주는 프로젝트 단위 범위가 없다 — 생성에는 전체 프로젝트 접근이
필요하다. 그래서 기존 Production 프로젝트 보호는 Vercel 권한이 아니라 아래 두 장치로 지킨다.
- 이 계약 §3 (Human Gate 목록)
- brain `docs/permission-autonomy/settings.proposed.json` 의 deny 규칙: `request_promote` · `request_rollback` ·
  rolling release · env 조회/생성/수정 · `update_project` · `pause_project` · 도메인 구매 · 프로젝트 삭제 링크

## 6. 실행 규칙 (설정 후)

1. 프로젝트 생성: `framework: null`, Git 연결 없음, Vercel Authentication 끔, 이름은 산출물 전용.
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
