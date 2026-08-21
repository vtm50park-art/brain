# 필수 후속 고도화 등록부

본부장이 "후속 필수"로 지정한 항목만 남긴다. 아이디어·희망사항은 여기 오지 않는다.
각 항목은 별도 Work Order SSOT 없이는 실행하지 않는다 — 등록은 실행 승인이 아니다.

---

## B. Cross-Repository Work Order Rail

**등록일** 2026-08-20
**등록 근거** 본부장 지시 — Telegram Push v1A 처리 중 확정
**상태** 등록됨 · 서윤 비서실장 SSOT 대기
**우선순위** 필수 (교차 저장소 업무가 반복될 때마다 서지윤 수동 실행이 필요해진다)

### 왜 필요한가 — 실측된 결함

Work Order 가 대상 저장소를 지정해도 파이프라인이 그것을 읽지 않는다.

```
scripts/pipeline/queue-wake-dispatch.mjs:531
  const REPO_NAME = REPO.split("/")[1] ?? REPO;   // REPO = $GITHUB_REPOSITORY
```

대상 저장소가 Work Order 가 아니라 **control-plane 저장소 자기 자신**에서 나온다.
여기에 더해:

- runtime binding 10개 전부 `repositoryScopes: ["vtm-os-next"]` — 예외 0건
- `vtm-ai-company` 는 vtm-os-next 코드베이스 전체에 0회 등장
- 다른 저장소를 checkout 하는 워크플로 0건

실제 사고: `#398` → `#399`. SSOT 가 대상 저장소를 `vtm50park-art/vtm-ai-company` 로
지정했으나 워커는 `vtm-os-next` 에서 실행됐고, 산출물이 지정된 저장소가 아닌 곳에
만들어졌다. 워커는 이를 정직하게 "미이행"으로 보고했다. 결국 v1A 는 서지윤 실장
직접 실행으로 처리했다 — 그것이 이 항목이 필요한 이유다.

### 요구사항 (본부장 지시 원문 기준)

1. `targetRepository` 를 Work Order / SSOT 에서 canonical 하게 파생한다.
2. `repositoryScope` 가 해당 저장소와 일치하는 runtime binding 을 선택한다.
3. 승인된 저장소만 checkout / commit / push 할 수 있다.
4. 저장소별 권한을 최소권한으로 분리한다.
5. `targetRepository` 불일치 시 **잘못된 저장소에서 실행하지 않고 fail-closed** 한다.
6. 교차 저장소 업무가 서지윤 실장 수동 실행 없이 Router → Worker 로 정상 수행된다.
7. HUMAN_GATE / permission / audit / lineage 를 **절대 약화하지 않는다.**

### 실행 전 확인해야 할 것

- runtime binding 에 새 저장소를 등록하려면 `bindingEvidence` 에 실제 실행 증거가
  필요하다. 증거 없는 등록은 `INACTIVE` fail-closed 가 규약이다 — 이 관례를 우회하지
  않는다.
- 워커 워크플로에 다른 저장소 checkout/push 자격을 부여하는 것은 권한 확대다.
  본부장 승인 없이 진행하지 않는다.

---

## C. Canonical Event → Telegram Automatic Bridge

**등록일** 2026-08-21
**등록 근거** 본부장 지시 — Telegram Push v1B 실증 직후 확정
**상태** 등록됨 · 서윤 비서실장 SSOT 대기
**우선순위** 필수 (이것이 없으면 Push 레일은 수동 호출로만 동작한다)

### 왜 필요한가 — 실측된 공백

v1B 로 `TEST_NOTIFICATION → canonical-push → manager-push → telegram-rail →
Telegram API` 경로가 실제로 이어짐을 증명했다. 그러나 **그 경로에 canonical
이벤트를 넣어주는 주체가 아직 사람(또는 smoke workflow)뿐이다.**

`vtm-ai-company` 저장소에는 canonical 이벤트 수신구가 없다. 인바운드 텔레그램
웹훅 2개와 헬스체크가 전부이고, `supabase/functions/vtm-workforce-result` 는
worker 자체 보고를 받는 자리라 §5상 푸시 근거가 될 수 없다.

### 목표

실제 VTM OS canonical 이벤트가 발생했을 때, 사람이나 smoke workflow 가 수동으로
호출하지 않아도 canonical-push 판정 경로로 자동 유입되게 한다.

### 필수 조건 (본부장 지시 원문 기준)

1. worker 자체 결과를 canonical 이벤트로 오인하지 않는다.
2. Review/PASS 이후의 진짜 canonical event 만 사용한다.
3. `HUMAN_GATE_REQUIRED` 는 정책대로 즉시 전달한다.
4. `PROJECT_COMPLETE` / `STAGE_COMPLETE` / `CRITICAL_BLOCKED` 조건을 유지한다.
5. 인증·permission·audit·dedup 을 유지한다.
6. 새 credential 을 임의 생성하지 않는다.
7. 교차 저장소 구조가 필요하면 **B. Cross-Repository Work Order Rail** 과 연계한다.
8. 실패 시 다른 독립 업무를 멈추지 않는다.

### 설계 전 반드시 해소할 것 (v1B 에서 실측된 사실)

- **dedup 저장소가 아직 없다.** `runCanonicalPush` 는 `seen` 저장소를 주입받을
  때만 중복을 막는다. 현재 실행 진입점은 주입하지 않으므로 dedup 이 no-op 이다.
  자동 유입을 붙이기 전에 durable 한 `seen` 저장소(예: Supabase 테이블)를
  결정해야 한다. 조건 5의 dedup 은 그 없이는 성립하지 않는다.
- **상속받은 `sendTelegramMessage` 는 HTTP 실패에 throw 하지 않는다.**
  `!response.ok` 이면 `console.error` 로 남기고 계속 진행한다. 따라서 401/403 도
  호출자에게는 성공처럼 보인다. 알림 레일에서 이것은 "실패한 푸시가 성공으로
  기록되는" 경로다. 기존 호출자 전부의 동작에 영향을 주므로 임의로 바꾸지 않았다
  — 자동 유입을 붙이기 전에 실패 전파 방식을 확정해야 한다.
- 새 수신 엔드포인트를 만들면 인증 credential 이 필요하다. 조건 6과 충돌하므로
  기존 인증 수단 재사용 범위를 먼저 정해야 한다.
