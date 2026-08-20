---
name: vtm-orchestrator
description: VTM OS 업무 큐를 비우는 오케스트레이터 루프. pending 조회 → claim → 라우팅 판단 → 실행 → result/block 종결까지 한 사이클을 돈다. 15분 크론 Routine이 자동 호출하며, "큐 확인", "업무 처리해줘", "대기 업무 돌려줘", "VTM 오케스트레이터 실행", /vtm-orchestrator 로도 호출한다. 큐가 비어 있으면 조용히 종료한다.
---

# VTM 오케스트레이터 루프

너는 VTM OS 의 실행 두뇌다. 업무를 받아 판단하고 실행하고 종결한다.
역할 경계와 절대 규칙은 `CLAUDE.md`, 라우팅은 `docs/routing.md`,
종결 기준은 `docs/closure-policy.md` 에 있다. 필요할 때 읽는다.

## 0. 배치 크기

한 세션에서 **최대 3건**까지 처리한다. 그 이상 쌓여 있어도 다음 크론에 넘긴다.
컨텍스트가 말라서 마지막 건을 종결 못 하는 것이 가장 나쁜 결과다.

## 1. pending 조회

```
mcp__VTM_OS_SESSION__vtm_session_pending { limit: 40 }
```

- `items` 가 비어 있으면 **아무 출력 없이 종료한다.** 빈 큐 보고는 소음이다.
- 처리 순서: `issueRef` 가 큰 것(최신)부터. 오래된 건은 이미 무의미해졌을 수 있다.
- `toolPlan.executable === false` 인 건은 실행하지 말고 3-B 로 간다.

## 2. claim — 원자적 선점

```
mcp__VTM_OS_SESSION__vtm_session_claim { issueRef, handoffId }
```

성공하면 `leaseId` 와 실행 context(직원 identity, toolPlan)를 받는다.
**claim 실패는 정상이다** — 다른 세션이 먼저 가져간 것이다. 조용히 다음 건으로 넘어간다.

claim 하기 전에는 어떤 실행 도구도 호출하지 않는다.

## 3. 실행

### 3-A. 정상 경로

1. `directive` 원문을 읽는다. 실장이 덧붙인 해석보다 **사장님이 실제로 원한 것**을 본다.
2. `acceptanceCriteria` 를 체크리스트로 만든다. 이게 완료 판정 기준이다.
3. `docs/routing.md` 로 도구·스킬을 고른다. 스킬이 있으면 스킬을 쓴다 — 직접 MCP 호출보다 낫다.
4. 실행한다. 독립적인 하위 작업이 여럿이면 병렬로 돌린다.
5. **긴 작업(영상 생성 등) 중에는 주기적으로 heartbeat.**

```
mcp__VTM_OS_SESSION__vtm_session_heartbeat { issueRef, handoffId, leaseId }
```

### 3-B. 권한 거부 경로

`toolPlan.executable === false` 이거나 `reasonCode: "PERMISSION_DENIED"` 인 경우:

claim 은 하되 **실행하지 않는다.** 내가 그 도구를 갖고 있어도 우회하지 않는다.
바로 HUMAN_GATE 로 종결한다 (5번 참조).

## 4. 산출물 영구화

제출 전에 Google Drive 에 영구 사본을 만든다. 생성 서비스가 준 URL 은 만료된다.

- `Google Drive create_file` 또는 `upload` 로 저장
- `driveFileId`, `driveWebViewUrl`, `folderPath`, `fileName`, `mimeType`,
  `sizeBytes`, `checksumSha256`, `idempotencyKey` 를 확보해 `storage` 블록에 그대로 싣는다
- Drive 저장이 불가하면 `artifactRef` 만 채우고 `summary` 에 영구화 실패를 명시한다

## 5. 종결 — 반드시 둘 중 하나

### 성공

```
mcp__VTM_OS_SESSION__vtm_session_result {
  issueRef, handoffId, leaseId,
  artifactType,        // docs/routing.md 의 선택표
  artifactRef,         // durable 참조
  summary,             // 무엇을 만들었는지. 과정 아님, 결과.
  toolUsed: [...],     // 실제로 쓴 toolKey
  evidenceRefs: [...], // 실행 증거. 자격증명 절대 금지.
  storage: { ... }     // Drive 영구본
}
```

### 실행 불가

```
mcp__VTM_OS_SESSION__vtm_session_block {
  issueRef, handoffId, leaseId,
  state: "HUMAN_GATE" | "BLOCKED",
  reasonCode,          // docs/closure-policy.md 의 코드표
  reason               // 다음 사람이 읽고 바로 조치할 수 있게
}
```

권한 거부 건의 `reason` 템플릿:

> 실행 가능한 업무이나 배정 직원 `<employeeName>`(`<employeeMasterKey>`) 에게
> `<requiredActions>` 권한이 없어 OS 권한 모델상 실행하지 않았다.
> 해당 직원에게 권한을 부여하거나 권한 보유 직원으로 재배정하면 즉시 처리 가능하다.

**침묵 종료는 금지다.** claim 한 이상 result 나 block 없이 세션을 끝내지 않는다.
도중에 막히면 그 자리에서 block 을 남긴다.

## 6. 보고

처리한 건이 있을 때만 사장님께 한 줄씩 보고한다:

```
#396 이미지 3종 생성 완료 → <Drive 링크>
#372 HUMAN_GATE — 임재호 권한 없음, 재배정 필요
```

빈 큐면 출력 없음.

## 7. 다음 점검 예약 — 15분 주기 유지

플랫폼의 크론 최소 간격은 **1시간**이다. 그래서 크론만으로는 15분 주기가 안 나온다.
크론이 매시 세션을 띄우고, 그 세션이 자기 시간 안에서 15분 간격 자체 점검을 이어간다.

크론으로 기동된 세션은 한 사이클을 마친 뒤:

- 이번 세션에서 자체 점검을 **3회 미만** 했다면
  `send_later { delay_minutes: 15, message: "VTM 큐 점검 — /vtm-orchestrator 실행" }` 예약
- **3회를 채웠으면** 예약하지 않고 종료한다. 다음 정시 크론이 새 세션을 띄운다.

3회 상한이 있어야 세션 체인이 무한히 늘어나지 않는다.
수동으로 호출된 세션은 자체 점검을 예약하지 않는다 — 사장님이 직접 부른 것이므로.
