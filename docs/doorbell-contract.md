# 서윤 → 서지윤 DOORBELL INPUT CONTRACT (CANARY 범위)

**확정일** 2026-09-23 · **근거** 본부장 범위 보정 지시(2026-09-23)
**상태** 초인종 발사 credential 미비 — HUMAN_GATE

이 문서는 **새 운영체계 설계가 아니다.** 9/18 · 9/22 에 이미 성공한 두 실증을
그대로 이어 붙이기 위해, 서윤이 호출할 입력 규격만 적는다.
승인체계 · Queue · 라우터 · CLAUDE.md 영구규칙은 건드리지 않는다.

ORIGINAL GOLDEN 의 Human 승인 의미는 **본부장 ↔ 서윤 대화에서 업무가 확정되는 것**
으로 그대로 보존된다. 이번 PHASE 가 제거하는 것은 그 승인이 아니라,
본부장이 짧은 트리거를 **복붙하던 한 동작** 하나뿐이다.

## 이미 증명된 두 조각

| 날짜 | Routine | 증명된 것 |
|---|---|---|
| 2026-09-18 | `CANARY-DRIVE-READ-ONLY` | HTTP `POST /fire` → 새 세션 → 저장소 파일 읽기 → STOP |
| 2026-09-22 | `CANARY-SEOJIYOON-RECEIPT-ONLY` | 새 세션의 서지윤 identity 복원 → 지시서 읽기 → `EXECUTION: HOLD` |

9/18 쪽은 HTTP 로 눌릴 수 있으나 내용이 단순 파일 읽기이고,
9/22 쪽은 내용이 맞으나 전용 토큰이 없어 HTTP 로 눌리지 않는다.
**이번에 필요한 것은 둘을 한 Routine 으로 합치는 것 하나다.**

## 서윤이 수행하는 3단계

> **SSOT 확정 (본부장 지시 2026-09-23).** 이 레일의 canonical detailed instruction
> SSOT 는 **GitHub Issue 하나**다. `08_READY_TO_EXECUTE/CURRENT_WORK_ORDER.md` 를
> instruction SSOT 로 쓰지 않는다. Issue 본문을 다른 파일·queue·payload 에
> **복제하지 않는다.**

### 1. SEOYUN WRITE — canonical GitHub Issue 생성·완성

서윤은 지시서를 **Issue 본문 한 곳에** 쓴다. 대상은 아래 화이트리스트 안이어야 한다.

```
owner  vtm50park-art
repo   vtm-os-next  또는  brain
```

Issue 본문에는 서지윤이 되읽을 **canonical 식별자 10개**가 있어야 한다.
`vtm-doorbell-canary/v1` 스키마이며, 아래 **영구 운영 계약** 절에 전체 목록과
실행권한 플래그가 있다.

> 정정 기록: 이 자리의 이전 판은 `workOrderId` · `issueRef` ·
> `directiveFingerprint` 3개를 요구했다. **그것은 legacy `#729` 스키마이며 서윤의
> canonical 스키마와 교집합이 0 이다.** 아래 10개가 정본이다.

지시서 본문을 저장소 파일·queue·fire payload 에 복사해 두지 않는다.
사본이 생기는 순간 어느 쪽이 정본인지 갈린다.

### 2. SEOYUN READBACK — 동일 Issue 본문 authoritative readback

초인종을 누르기 전에, **쓴 그 Issue 를 다시 읽어** 본문과 식별자 3개가
의도대로 올라갔는지 확인한다. 확인 실패 시 초인종을 누르지 않는다.

```
GET https://api.github.com/repos/vtm50park-art/<repo>/issues/<번호>
```

읽는 대상은 서지윤이 읽을 것과 **완전히 같은 Issue** 다. 다른 사본을 검증
대상으로 삼지 않는다.

### 3. DOORBELL — 정확히 1회

```
POST https://api.anthropic.com/v1/claude_code/routines/<ROUTINE_ID>/fire
Authorization: Bearer <ROUTINE 전용 토큰>
anthropic-beta: experimental-cc-routine-2026-04-01
anthropic-version: 2023-06-01
Content-Type: application/json
```

`<ROUTINE_ID>` 는 `trig_` 로 시작한다(`routine_` 아님).

세 헤더는 **전부 필수**다. `anthropic-beta` 가 없으면 `400 invalid_request_error`
로 거절된다. 경로도 `/v1/claude_code/...` 다 — `/api/claude_code/...` 는 오류였다.

### body — canonical issue pointer 하나만

`text` 필드에는 **canonical GitHub issue pointer 하나만** 담는다.
**상세 지시서 본문은 전달하지 않는다. GitHub issue 가 SSOT 다.**

허용 형태는 둘 중 하나뿐이다.

```
vtm50park-art/<repo>#<번호>
https://github.com/vtm50park-art/<repo>/issues/<번호>
```

```json
{"text": "vtm50park-art/vtm-os-next#733"}
```

pointer 를 둘 이상 담지 않는다. 지시 문장·설명·요약을 덧붙이지 않는다.

이유는 두 가지다. 첫째, 지시 원문이 issue 한 곳에만 있어야 SSOT 가 성립한다.
payload 에 본문을 복사해 넣으면 issue 와 payload 중 어느 쪽이 정본인지 갈린다.
둘째, `text` 는 토큰을 쥔 누구나 보낼 수 있고 문서상 `<routine-fire-payload>` 로
**untrusted 표시되어** 전달된다. 좌표 하나로 줄이면 유출 시에도 주입할 여지가
남지 않는다. Routine 프롬프트는 이 좌표를 **owner/repo 화이트리스트와 번호
규칙으로 검증**한 뒤에만 읽고, 어긋나면 `POINTER_VALID: REJECTED` 로 멈춘다.

- 발사는 **1회**. 실패해도 재시도하지 않는다(`RETRY = 0`).
- 실패 시 에러 원문만 서지윤에게 반환한다.
- 토큰은 **저장소·문서·로그·채팅에 절대 기록하지 않는다.** 서윤 쪽 secret 으로만 보관한다.
  이 문서에도 자리표시자만 둔다.

### 발사 전 점검 2개

1. **Routine 이 켜져 있어야 한다.** paused 상태에서 호출하면 `400
   invalid_request_error` 다. CANARY 직전까지는 의도적으로 disabled 로 둔다.
2. **커넥터는 최소권한만 남긴다.** web UI 에서 API trigger 를 추가하면 연결된
   커넥터가 기본으로 전부 포함된다. 이 CANARY 는 GitHub 지시서 SOURCE READ 만
   하므로 그에 필요한 것 외에는 제거한다.

### 주요 오류 응답

| HTTP | type | 원인 |
|---|---|---|
| 400 | `invalid_request_error` | `anthropic-beta` 헤더 누락 · Routine paused |
| 401 | `authentication_error` | 토큰 없음 또는 이 Routine 의 토큰이 아님 |
| 403 | `permission_error` | 계정·조직에 이 엔드포인트 접근권 없음 |
| 404 | `not_found_error` | Routine 없음 |
| 429 | `rate_limit_error` | 일일 Routine 실행 한도 도달 (`Retry-After` 참조) |

성공은 `200` 과 `claude_code_session_id` · `claude_code_session_url` 이다.

## 영구 운영 계약 (2026-09-25 개정 — 이 절이 현행이다)

근거: 본부장 승인(2026-09-25) — "완주 레일 연결을 승인한다" · "앞으로 계속 이 레일
사용할거니 한번만이 아니고 영구적 사용하게".

아래는 `vtm-os-next#745` → `#746` 완주 실측으로 검증된 현행 계약이다.
이 문서의 CANARY 전용 문구와 충돌하면 **이 절이 우선한다.**

### 초인종은 자동이다 — 서윤이 HTTP 를 부르지 않는다

**실측 정정.** 서윤이 토큰으로 `/fire` 를 호출할 필요가 없다.
`[VTM DOORBELL]` 로 시작하는 제목의 Issue 를 만들면
`.github/workflows/employee-runtime-v1.yml` 의 `github-doorbell` job 이
**Issue 생성 이벤트로 Routine 을 자동 발화한다.**

- 조건: 제목이 `[VTM DOORBELL]` 로 시작 · 작성자가 `vtm50park-art`
- 정책: `AT_MOST_ONCE` / `NO_AUTO_RETRY` / 모호하거나 실패하면 HOLD
- 마커를 발화 **전에** 기록하므로 같은 Issue 로 두 번 울리지 않는다
- payload 는 `POINTER_ONLY` — 지시서 본문을 싣지 않는다
- 증거: 그 Issue 에 `[VTM DOORBELL]` 댓글 2개(decision / outcome + sessionId)

즉 **서윤이 하는 일은 Issue 를 쓰는 것 하나다.** 초인종은 저장소가 누른다.

### Issue 본문 — canonical 식별자 10개

```
schemaVersion          vtm-doorbell-canary/v1
phase
instructionType
idempotencyKey         발화 중복 판정 키. 지시서마다 새로 만든다
issuedBy
destinationRoutineId   trig_01EqjTFp2nYiw4NyrbZsCJcd
repository             vtm50park-art/vtm-os-next
issueNumber            SELF
doorbellMergeCommit
requiredAction
```

### 실행권한 플래그 — 이것이 없으면 읽고 멈춘다

서지윤 Routine 의 **기본값은 HOLD** 다. 지시서가 아래를 명시할 때만 열린다.

```
workExecutionAllowed      YES 여야 실행이 열린다
employeeDispatchAllowed   YES 여야 직원 배차가 열린다
telegramAllowed           YES 여야 총괄과장 보고가 나간다
issueAckCommentAllowed    YES 여야 검수 판정 댓글을 남긴다
retryAllowed              항상 NO 로 취급한다
```

- `workExecutionAllowed` 와 `employeeDispatchAllowed` 가 **둘 다 YES** 일 때만 OPEN.
- 하나라도 YES 가 아니거나 읽히지 않으면 **HOLD** — 읽고 보고만 하고 멈춘다.
- 모호하면 OPEN 으로 해석하지 않는다. 모호함은 HOLD 다.
- `issueAckCommentAllowed` 가 YES 가 아니면 검수 판정을 남길 자리가 없으므로
  게이트를 HOLD 로 내린다.

**이 구조가 "본부장 승인 없이 실행 금지"를 코드가 아니라 지시서로 지킨다.**
서윤이 커밋한 것만으로는 실행되지 않는다. 승인이 문서 안에 있어야 한다.

### 업무 필드 — 배차까지 가려면 함께 적는다

```
employeeMasterKey      배정할 직원 키 (예: jung-haeun)
targetBranch           판단 기준 브랜치 (예: release/vtm-os-v1)
```

그리고 본문에 **실행 업무**와 **완료기준**을 적는다. 완료기준은 항목 단위로
검수 가능한 형태여야 한다 — 서지윤이 항목마다 `- [x]` / `- [ ]` 로 판정한다.
둘 중 하나라도 읽히지 않으면 서지윤은 추측하지 않고 HOLD 한다.

> ⚠️ **직원에게 다른 브랜치를 읽으라고 시키지 않는다.** 직원 런타임은
> `dontAsk` 모드라 Bash 가 거부되며, 직원은 자기 checkout 만 읽는다
> (실측 `#746`). `targetBranch` 는 기준을 선언하는 것이고, 동기 여부 확인은
> 서지윤이 검수에서 한다. 자세한 근거는 `docs/employee-rules.md` 다.

### 완주 경로 — 실측된 전 구간

```
서윤 Issue WRITE ([VTM DOORBELL] 제목)
  → github-doorbell job 자동 발화 (AT_MOST_ONCE)
  → 새 SEOJIYOON 세션 WAKE → identity 복원
  → pointer 검증 (whitelist · #715 거부)
  → 그 Issue 하나 SOURCE READ → 식별자 10개 readback
  → 실행권한 판독 → OPEN 이면 계속, 아니면 HOLD
  → Work Order Issue 발행 ([AI-EMPLOYEE-TASK])
  → Employee Runtime Rail V1 자동 기동 → 직원 실행 → 결과 댓글
  → 서지윤 검수 → [CHIEF_OF_STAFF VERDICT] 댓글
  → chief-review-gate.yml (mode=employee-verdict) 1회 발동
  → 총괄과장 Telegram 보고 + [NOTIFICATION EVIDENCE]
```

실측 근거: `#745`(지시서) → `#746`(Work Order) → Telegram messageId 320.
**HUMAN_RELAY = 0** — 초인종 이후 사람이 끼는 지점이 없었다.

## CANARY 성공 판정

| 항목 | 기대값 |
|---|---|
| `SEOYUN_GITHUB_WRITE` | PASS |
| `GITHUB_READBACK` | PASS |
| `DOORBELL_CALLER` | **SEOYUN** |
| `DOORBELL_COUNT` | 1 |
| `NEW_SEOJIYOON_SESSION` | PASS |
| `SEOJIYOON_IDENTITY_RESTORE` | PASS |
| `GITHUB_SOURCE_READ` | PASS |
| `EXECUTION` | 0 |
| `RETRY` | 0 |
| `HUMAN_RELAY` | 0 |

`DOORBELL_CALLER` 가 SEOYUN 이 아니면 이번 목표는 **FAIL / HOLD** 다.
서지윤이나 본부장이 누른 발사는 사전검증이며 CANARY 로 계산하지 않는다.

## 막힌 지점 — 본부장만 해제 가능

API trigger 토큰은 **claude.ai Routines 화면에서만** 발급된다. 공식 문서 원문:
"There is no public API for token management." CLI 역시 "cannot currently create
or revoke tokens" 다. 서지윤의 MCP 도구에도 토큰 파라미터가 없다.

**토큰은 기존 Routine 에 사후 발급된다.** "API triggers are added to an existing
routine" · "The URL and token are generated after the routine is saved, since they
depend on the routine ID." 따라서 **Routine 을 새로 만들지 않는다.**

> 정정 기록: 이 문서의 이전 판은 "HTTP API 또는 화면에서 **생성할 때만** 발급된다"
> 고 적고 Routine 재생성을 지시했다. 그것은 `created_via` 메타데이터 필드에서
> 끌어낸 추정이었고, 공식 문서 확인 결과 **틀렸다.** 재생성은 불필요하며,
> 본부장의 "새 Routine 생성 금지" 지시와도 충돌했다.

따라서 Human Gate 에서 하실 일은 1회, 기존 Routine 편집뿐이다.

1. 기존 Routine `trig_01EqjTFp2nYiw4NyrbZsCJcd` 를 편집 →
   Select a trigger → Add another trigger → **API** → Generate token.
   토큰은 1회만 표시되고 재조회 불가하므로 그 자리에서 secret 으로 옮긴다.
2. 같은 화면에서 커넥터를 **GitHub 지시서 SOURCE READ 에 필요한 최소권한만** 남긴다.
3. Routine ID 와 URL, 토큰을 서윤에게만 전달한다. 서지윤에게는 필요하지 않다.
4. Routine 활성화는 **CANARY 직전에** 한다. 그때까지 disabled 유지.

토큰 원문은 이 문서·저장소·채팅·로그 어디에도 기록하지 않는다.

## 범위 밖 (이번 PHASE 에서 하지 않는다)

직원 배정 · 실제 업무 실행 · 검수 · Telegram 발송 · Queue Routine 활성화 ·
Production 승격 · CLAUDE.md 영구규칙 변경 · 승인필드의 Canon 승격 · `#715`
