# Routine 프롬프트 (claude.ai Routines 화면에 그대로 붙여넣기)

```
VTM OS 업무 큐를 비운다.

/vtm-orchestrator 스킬을 실행하라. 스킬은 이 레포(vtm50park-art/brain)의
.claude/skills/vtm-orchestrator/SKILL.md 에 있고, 역할 경계와 절대 규칙은
CLAUDE.md, 라우팅은 docs/routing.md, 종결 기준은 docs/closure-policy.md 에 있다.

요약 프로토콜:
1. vtm_session_pending 으로 대기 업무 조회. 비어 있으면 아무 출력 없이 종료한다.
2. issueRef 큰 것(최신)부터, 한 세션에서 최대 3건.
3. vtm_session_claim 으로 lease 확보. claim 실패는 정상이니 조용히 다음 건으로.
4. 지시 원문은 claim 응답의 directiveRef가 가리키는 vtm50park-art/vtm-os-next 의
   같은 번호 issue 본문에 있다. claim 응답 자체에는 지시 원문이 없으므로
   mcp__github__issue_read 로 해당 issue를 읽어 DIRECTIVE 섹션을 확보하라.
   (vtm-os-next 가 세션에 없으면 add_repo 로 붙인다.)
5. docs/routing.md 로 도구·스킬을 골라 실행한다. 긴 작업 중에는
   vtm_session_heartbeat 로 lease 를 갱신한다.
6. 산출물은 Google Drive 의 VTM_HQ/07_VTM_OS_NEXT 폴더에 영구 저장한 뒤
   vtm_session_result 에 storage 블록과 함께 제출한다.
7. toolPlan.executable 이 false 이거나 PERMISSION_DENIED 면 실행하지 말고
   vtm_session_block 의 HUMAN_GATE 로 올린다. 내가 그 도구를 갖고 있어도
   OS 의 직원별 권한 모델을 우회하지 않는다.
8. claim 한 이상 result 나 block 없이 절대 끝내지 않는다. 침묵 종료 금지.
9. 한 사이클을 마치면, 이번 세션의 자체 점검이 3회 미만이면
   send_later { delay_minutes: 15 } 로 다음 점검을 예약한다. 3회를 채웠으면
   예약하지 않고 종료한다.

처리한 건이 있을 때만 한 줄씩 보고하라. 빈 큐면 보고하지 않는다.
```

## 필요한 커넥터

| 커넥터 | 용도 | 필수 |
|---|---|---|
| VTM_OS_SESSION | pending / claim / heartbeat / result / block | ✅ |
| Google Drive | 산출물 영구 저장 | ✅ |
| GitHub | 지시 원문(issue 본문) 읽기 | ✅ |
| Higgsfield · openart | 이미지 · 영상 생성 업무 | 해당 시 |
| Canva | 디자인 산출물 | 해당 시 |
