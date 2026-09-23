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

### 1. GITHUB WRITE

서윤은 아래 **단일 경로**에만 지시서를 쓴다. 이 경로 밖 파일은 지시로 취급하지 않는다.

```
repo   vtm50park-art/brain
branch claude/design-review-gpt-claude-abos6s
path   08_READY_TO_EXECUTE/CURRENT_WORK_ORDER.md
```

### 2. GITHUB READBACK

쓴 직후 같은 경로를 **다시 읽어** 커밋이 올라갔음을 확인한다.
확인 실패 시 초인종을 누르지 않는다.

```
GET https://api.github.com/repos/vtm50park-art/brain/contents/08_READY_TO_EXECUTE/CURRENT_WORK_ORDER.md?ref=claude/design-review-gpt-claude-abos6s
```

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
