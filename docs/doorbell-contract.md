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
POST https://api.anthropic.com/api/claude_code/routines/<ROUTINE_ID>/fire
Authorization: Bearer <ROUTINE 전용 토큰>
```

- 발사는 **1회**. 실패해도 재시도하지 않는다(`RETRY = 0`).
- 실패 시 에러 원문만 서지윤에게 반환한다.
- 토큰은 **저장소·문서·로그에 절대 기록하지 않는다.** 서윤 쪽 비밀값으로만 보관한다.

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

Routine 전용 bearer 토큰은 **HTTP API / claude.ai Routines 화면에서 생성할 때만**
발급된다. 서지윤이 MCP 로 만든 Routine 은 토큰이 발급되지 않아
(`api_token_hint` 공란) 서윤이 HTTP 로 누를 수 없다.

실측:

| Routine | 생성 경로 | 전용 토큰 | HTTP 발사 |
|---|---|---|---|
| `CANARY-DRIVE-READ-ONLY` (9/18) | `http_api` | 있음 | 가능 |
| `CANARY-SEOJIYOON-RECEIPT-ONLY` (9/22) | `meta_mcp` | 없음 | 불가 |
| `PROTOTYPE(서지윤 사전검증)` (9/23) | `meta_mcp` | 없음 | 불가 |

따라서 본부장이 직접 1회만 하셔야 하는 일이 둘 있다.

1. `PROTOTYPE` 의 프롬프트 원문 그대로 Routine 을 **HTTP API 또는 Routines 화면에서**
   새로 만들어 전용 토큰을 발급한다.
2. 그 Routine ID 와 토큰을 서윤에게 전달한다. 서지윤에게는 필요하지 않다.

## 범위 밖 (이번 PHASE 에서 하지 않는다)

직원 배정 · 실제 업무 실행 · 검수 · Telegram 발송 · Queue Routine 활성화 ·
Production 승격 · CLAUDE.md 영구규칙 변경 · 승인필드의 Canon 승격 · `#715`
