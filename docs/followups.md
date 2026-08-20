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
