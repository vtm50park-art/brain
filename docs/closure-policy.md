# 종결 판정 기준

모든 claim 은 반드시 `result` 또는 `block` 중 하나로 끝난다. 제3의 선택지는 없다.

## result — 산출물이 실제로 존재할 때만

- 실제로 만든 것이 있고, Drive 영구 사본이 있고, `acceptanceCriteria` 를 충족한다.
- `summary` 는 무엇을 만들었는지 한 문단. 과정 서술이 아니라 결과 서술.
- `evidenceRefs` 는 실행 증거 라인 (생성 job id, 소스 URL 등). **자격증명 금지.**
- `toolUsed` 는 실제로 호출한 toolKey. `toolPlan` 이 제안한 것이 아니라 쓴 것.

## block — 두 가지 상태

### HUMAN_GATE — 사람이 결정하면 진행 가능

사장님 판단이 필요할 뿐, 기술적으로는 막히지 않은 경우.

| 상황 | reasonCode |
|---|---|
| `toolPlan.executable=false` / `PERMISSION_DENIED` — 배정 직원에게 권한이 없으나 오케스트레이터는 실행 가능 | `EMPLOYEE_PERMISSION_GAP` |
| 지시가 모호해 해석에 따라 결과가 갈림 | `DIRECTIVE_AMBIGUOUS` |
| 대량 크레딧 소모가 예상됨 | `SPEND_APPROVAL_REQUIRED` |
| 외부 발행·발송 등 되돌리기 어려운 행위 | `IRREVERSIBLE_ACTION` |

**권한 거부 처리 원칙 (확정):** OS 의 직원별 권한 모델을 무력화하지 않는다.
오케스트레이터가 그 도구를 갖고 있더라도 임의 실행하지 않고, HUMAN_GATE 로 올려
"이 일은 실행 가능하나 배정 직원 `<employeeName>` 에게 권한이 없다. 권한 부여 또는
재배정이 필요하다" 를 `reason` 에 명시한다. 조용히 우회하는 것도, 그냥 버리는 것도 아니다.

### BLOCKED — 사람이 결정해도 지금은 못 함

| 상황 | reasonCode |
|---|---|
| 필요한 MCP 가 연결되지 않음 / 인증 만료 | `TOOL_UNAVAILABLE` |
| 크레딧·쿼터 소진 | `QUOTA_EXHAUSTED` |
| 입력 자산(원본 이미지·URL 등) 부재 | `INPUT_MISSING` |
| 외부 서비스 반복 실패 | `UPSTREAM_FAILURE` |
| 지시 내용이 안전·정책상 수행 불가 | `POLICY_REFUSED` |

`reason` 은 다음 사람이 읽고 바로 조치할 수 있게 쓴다.
"실패함" 은 이유가 아니다. 무엇이 왜 막혔고 무엇을 하면 풀리는지 적는다.

## 부분 완료

일부만 됐으면 **된 것을 result 로 제출하고**, 남은 부분은 `summary` 에 명시한다.
전부 아니면 전무로 버리지 않는다.
