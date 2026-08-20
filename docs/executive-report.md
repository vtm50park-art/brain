# Executive Report 표준 양식

서지윤 실장이 업무 완료 시 작성해 본부장께 올리는 종결보고서다.

- 저장 위치: `09_COMPANY_BRAIN/07_Executive_Reports/` (`1ojLnw7fY6ee4_pjx_LZ1oG89Atax-Ab1`)
- 파일명: `YYYY-MM-DD_[프로젝트]_종결보고_[짧은제목]`
- 근거: 김서윤 비서실장 운영결정(2026-08-20) §6

## 필수 항목 (전부 채운다)

| # | 항목 | 내용 |
|---|---|---|
| 1 | 근거문서 | 실행 근거가 된 확정문서 파일명 · Drive 링크 |
| 2 | 프로젝트 | 프로젝트/캠페인 명 |
| 3 | 실행목표 | 확정문서가 규정한 목표 |
| 4 | 완료기준별 PASS/FAIL | acceptance criteria 항목마다 PASS 또는 FAIL. 미검증은 PASS 아님 |
| 5 | 최종 URL · Drive · Deployment | 실제 접속 가능한 URL, Drive 링크, 배포 위치 |
| 6 | 실행요약 | 무엇을 했는가. 과정이 아니라 결과 중심 |
| 7 | 직원 · 도구 | 배정한 AI 직원, 실제로 사용한 MCP/도구 |
| 8 | 미완료 · BLOCKED | 못 한 것과 사유. reasonCode 포함 |
| 9 | HUMAN_GATE | 본부장 판단이 필요한 사항 |
| 10 | FINAL VERDICT | 종결 판정 (아래 표 참조) |

## FINAL VERDICT 값

| 값 | 조건 |
|---|---|
| `COMPLETE` | 완료기준 전 항목 PASS. 배포가 조건이면 URL 접속까지 검증됨 |
| `PARTIAL` | 일부 PASS. 남은 항목과 사유를 8번에 명시 |
| `BLOCKED` | 실행 불가. 사유와 해제 조건을 8번에 명시 |
| `HUMAN_GATE` | 본부장 결정 대기 |

**테스트되지 않은 상태를 PASS 로 적지 않는다.**
**코드 작성만으로 `COMPLETE` 를 쓰지 않는다.** (`docs/dev-execution.md` 참조)

## 양식

```markdown
# [프로젝트] 종결보고 — [짧은제목]

작성: 서지윤 실장 (Claude Code Orchestrator)
일자: YYYY-MM-DD

## 1. 근거문서
- 파일명:
- Drive 링크:

## 2. 프로젝트

## 3. 실행목표

## 4. 완료기준별 판정
| # | acceptance criteria | 판정 | 근거 |
|---|---|---|---|
| 1 |  | PASS / FAIL |  |

## 5. 최종 산출물
- URL:
- Drive:
- Deployment:

## 6. 실행요약

## 7. 직원 · 도구
- AI 직원:
- 사용 도구:

## 8. 미완료 · BLOCKED

## 9. HUMAN_GATE

## 10. FINAL VERDICT
COMPLETE / PARTIAL / BLOCKED / HUMAN_GATE
```
