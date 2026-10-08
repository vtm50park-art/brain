# Claude 권한 선제 구성 — brain 저장소 (적용 대기)

- 근거: 본부장 지시(2026-10-08) CLAUDE INTERACTIVE PERMISSION AUTONOMY CONTRACT.
- 목적: 승인된 Work Order 범위의 정상 작업(읽기·편집·테스트·빌드·git commit·승인 브랜치 push·gh api·Preview 배포/readback)이
  Allow / Always allow 팝업에서 멈추지 않게 한다.
- 보존하는 Human Gate(deny): Production 승격·롤백, 환경변수(secret) 조회·변경, force push · main/master push · 브랜치 삭제,
  hard reset · clean, DELETE API, 저장소 생성·fork·PR merge, 도메인 구매, 프로젝트 설정 변경·일시정지·삭제, 트리거 삭제.
- 유료 생성 도구(이미지·영상·음성)는 allow 에 넣지 않았다 — 크레딧 ceiling 은 설정 파일로 표현할 수 없어 확인을 남긴다.

## 적용 방법 (본부장 1회)

서지윤 세션이 `.claude/settings.json` 을 직접 쓰는 것은 Claude Code 자동 모드 분류기가 "자기 권한 수정"으로
차단한다(2회 실측). 그래서 이 파일은 비활성 경로에 둔다. 적용은 이 파일을 `.claude/settings.json` 으로 옮기면 된다.

- GitHub 웹: `docs/permission-autonomy/settings.proposed.json` → 연필(Edit) → 파일 경로를 `.claude/settings.json` 으로 바꿔 커밋.

## 직원 실행 레일(GitHub Actions)

직원 레일은 `claude -p --permission-mode dontAsk` 로 돈다. 허용 목록 밖 도구는 즉시 거부되고 사람에게 묻지 않으므로
권한 대기(PERMISSION_WAIT_TIME)는 구조적으로 0 이다. 실측: DEV-5A(#835)·DEV-5B(#837) `Permission enforcement: dontAsk (no bypass)`.
