# 배포 — 크론 가동에 필요한 마지막 한 단계

## 상태

| 항목 | 상태 |
|---|---|
| 오케스트레이터 스킬 · 라우팅 · 종결 기준 | ✅ 완료 |
| 프로토콜 왕복 검증 (claim→실행→result) | ✅ issue #367 로 실증 |
| 크론 Routine | ⚠️ **생성됐으나 비활성** — 커넥터 미연결 |

## 왜 비활성인가

`create_trigger` 로 만든 Routine 은 이 조직에서 **MCP 커넥터를 실을 수 없다**.
`connectors` 파라미터가 조직 정책상 차단돼 있다:

```
create_trigger: the connectors parameter is not available for this organization.
```

커넥터 없이 기동된 세션은 `vtm_session_pending` 조차 호출하지 못한다.
그래서 매시 빈손으로 실패하는 대신 꺼둔 상태다.

## 사장님이 하실 일 (한 번만)

claude.ai 의 **Routines** 화면에서 아래 중 하나:

**A. 기존 Routine 에 커넥터 붙이기**
`VTM 큐 오케스트레이터 (커넥터 연결 후 활성화 필요)` 를 열어
커넥터를 연결하고 활성화한다.

**B. 새로 만들기**
같은 화면에서 새 Routine 을 만들고 아래 값을 넣는다.

- 주기: 매시 (`0 * * * *`)
- 각 실행마다 새 세션 생성: 켬
- 커넥터: **VTM_OS_SESSION**(필수), Google Drive(필수), GitHub(필수),
  Higgsfield · openart · Canva(이미지·영상 업무용)
- 프롬프트: `docs/routine-prompt.md` 의 내용을 그대로 붙여넣는다

## 주기에 관한 참고

플랫폼 크론의 최소 간격은 **1시간**이다. 15분 주기는 크론만으로 안 된다.
그래서 기동된 세션이 `send_later` 로 15분 간격 자체 점검을 최대 3회 이어가
유효 주기를 15분으로 맞춘다 (스킬 §7).

## 커넥터가 붙기 전까지

수동으로 세션을 열어 `/vtm-orchestrator` 를 호출하면 동일하게 동작한다.
검증된 경로이며, 크론은 이 호출을 무인으로 대신할 뿐이다.
