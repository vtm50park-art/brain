# 모모형 병원 랜딩페이지 V2 — site

정적 사이트(HTML + CSS + 바닐라 JS ES module). 빌드 도구·npm 의존성 없음.
구현 정본은 `../V2_BUILD_SPEC.md` 이며 충돌 시 그 문서가 우선한다.

## 진행 단계

| 단계 | 범위 | 상태 |
|---|---|---|
| DEV-2A | `index.html` 7개 섹션 + footer + 모바일 고정 CTA, 토큰·기본·섹션·모션 CSS, 카피 정본, 히어로, 측정 훅, 데이터·문구·정적 제약 테스트 | 완료 |
| DEV-3A | `js/lib/{normalize,alias,search,sort,state,hash,keynav,paginate}.js` 와 각 테스트, DEV-2A REWORK 3건(R1·R2 Navy 배경 글자색, R3 `momo.jpg` 참조 교체) | 완료 |
| DEV-3B | `js/map.js` · `css/map.css` — 지도 SVG·칩·범례·확대·툴팁 배선 | 완료 |
| DEV-3C | `js/list.js` — 검색 입력·조건 요약 바·리스트 카드 배선, 해시 동기화, 측정 훅 | 완료 |
| DEV-4B REWORK | `js/lib/labels.js` 신설 — 지역명을 배지 기준으로 충돌 회피 배치(교차 0). 복귀 동선은 fixed 플로팅 버튼 대신 1단 레이아웃 그룹 헤더 버튼 | 이 커밋 |

`hospital-map` 섹션은 DEV-2A 에서 제목·부제·고지·이미지·검색 입력·칩 자리·지도 자리·요약 바 자리·리스트 자리·주의문까지 **정적 마크업만** 두었고, DEV-3A 가 그 동작의 **계산 부분만** DOM 없이 순수 모듈로 구현했다. DEV-3B·DEV-3C 는 그 순수 모듈을 DOM 에 배선한다.

### 지도와 리스트가 상태를 나누는 방식 (DEV-3C)

상태 `{sido, sub, q, visible}` 는 `js/map.js` 안의 reducer 하나가 정본이다. `js/list.js` 는 상태 사본을 두지 않고

- 검색 입력·'더 보기'·조건 해제를 `applyAction()` 으로 지도에 보내고,
- `document` 의 `momo:state` CustomEvent 를 구독해 다시 그리고,
- 검색 결과를 `setSearchResults()` 로 지도에 넘겨 칩·배지 숫자를 **결과 기준**으로 갱신한다(§6-3).

URL 해시(`#map=&sub=&q=`)도 리스트가 맡는다 — 시·도·구·시는 `pushState`, 검색어는 250ms 디바운스 `replaceState` 다.

### DEV-2A REWORK (이 커밋에서 수정)

| # | 결함 | 수정 |
|---|---|---|
| R1 | 히어로 H1 이 Navy 배경과 같은 글자색이라 보이지 않는다 | `css/sections.css` 에서 `#hero` 의 제목·본문 색을 `--white`·`--mint` 로 override. 원인은 `base.css` 의 `h1,h2,h3 { color: var(--navy) }` 상속이고, `.section--navy` 는 클래스라 `.caption` 과 특정도가 겹쳐 이기지 못했다 |
| R2 | 마무리 섹션 제목이 같은 결함 | `#closing` 에 같은 override |
| R3 | `index.html` 이 제공 입력에서 제외된 `assets/img/momo.jpg` 를 참조한다 | `assets/img/momo-sweater-face.webp` 로 교체(정본 §4 S7 서명 사진) |

`static.test.mjs` 에 **계산으로** 대비를 검사하는 테스트를 더했다 — Navy 배경 섹션(`#hero`·`#closing`·`.footer`·`.section--navy`)의 모든 `color` 선언을 `var()` 끝까지 해석해 WCAG 공식으로 대비비를 구하고 4.5:1 미달이면 실패한다.

## 구조

```
index.html              7개 섹션(hero, story, risk, role, solution, hospital-map, closing) + footer + 모바일 고정 CTA
css/tokens.css          색·타이포·간격·모션 토큰 (HEX 하드코딩 금지)
css/base.css            리셋·타이포 기본·CTA·공통 유틸
css/sections.css        섹션 레이아웃·반응형(1440/1024/820/390/360/320)
css/motion.css          모션 등재표(상단 주석) + reduced-motion 대체
js/copy.js              화면 문구 정본 (§4 전체 + §6-5 지도 구간)
js/main.js              엔트리 — CTA 4곳 배선, 모바일 고정 CTA, 섹션 진입. DEV-2B 지도 배선 지점 표시
js/hero.js              회전 고민 문구(5초 체류·300ms·일시정지·reduced-motion 정적 목록), 영상 facade
js/lib/track.js         측정 훅 `momo:track` CustomEvent (허용 파라미터만 통과, 개인정보 0)
js/lib/normalize.js     NFC·소문자·공백·하이픈 제거 + 초성 변환, 하이라이트용 원문 인덱스 대응표
js/lib/alias.js         시·도 약칭 별칭표 17개 (약칭 ↔ prov code ↔ 정식명·별칭)
js/lib/search.js        질의 해석(초성·1글자 규칙), 시·도·구·시 AND 필터, 하이라이트 원문 오프셋
js/lib/sort.js          고정 정렬 — 시·도 수 → 구·시 수 → 이름(Intl.Collator ko) → id
js/lib/state.js         `{sido, sub, q, visible}` 순수 reducer (재선택 해제·sub 초기화·visible 리셋)
js/lib/hash.js          `#map=<code>&sub=&q=` 직렬화·파싱 (무효값 무시)
js/lib/keynav.js        bb 중심 기준 방향키 최근접 이동, Home·End
js/lib/paginate.js      PAGE_SIZE 20, 남은 수, 시·도 그룹 묶음
js/lib/labels.js        지역명 배치 — 배지 기준 아래·위·오른쪽·왼쪽 후보, 배지 원·지역명 상자 교차 0
tests/                  node --test 용 검증
assets/ · data/         제공 입력 — 수정하지 않는다
```

## 로컬 실행

정적 서버로 `site/` 를 루트로 서빙한다(ES module·fetch 때문에 `file://` 로는 열 수 없다).

```bash
# 저장소 루트에서
npx --yes http-server projects/momo-v2/site -p 4321 -c-1
# 또는 python
python3 -m http.server 4321 --directory projects/momo-v2/site
```

`http://localhost:4321/` 접속. 초기 로드 시 외부 요청은 0건이고, 영상은 클릭한 뒤에만 `youtube-nocookie.com` 을 부른다.

## 테스트

저장소 루트에서 실행한다(셸이 `*` 를 펼친다 — 따옴표로 감싸지 않는다).

```bash
node --test projects/momo-v2/site/tests/*.test.mjs
```

| 파일 | 검증 |
|---|---|
| `data.test.mjs` | golden sha256 → N1~N5 적용 결과와 `clinics.json` 필드 단위 대조, 89건·시도별 건수, id·병원명+주소 유일, tel 규칙(N3b 포함) |
| `map.test.mjs` | prov 17·code 유일, seoul 25, gg 31, `bb` 4숫자, 파일 ≤ 80KB |
| `cross.test.mjs` | clinics 시도 ⊂ prov, 서울·경기 시군구 ⊂ seoul/gg |
| `copy.test.mjs` | §4·§6-5 정본 문구, index.html 과 대조, §2-3 금지어 0건, '전문의' 허용 위치, 지도 구간 X8·'상담' 0건 |
| `static.test.mjs` | 외부 URL 허용목록, `innerHTML` 계열 0건, 의존성·외부 지도 API 0, noindex, img 속성, 섹션 id 7개, `js/lib` 8개 모듈 존재·import 무결, DEV-3B·3C 산출물 존재와 `js/map.js`+`js/list.js` 합계 ≤ 64KB, **Navy 배경 텍스트 대비 ≥ 4.5:1 계산 검사** |
| `search.test.mjs` | 공백·하이픈 무시, 초성(질의가 전부 초성일 때만), 1글자 부분일치만, 시·도 별칭 17개, 시·도·구·시 AND, 0건, 하이라이트 원문 오프셋 |
| `sort.test.mjs` | 시·도 수 → 구·시 수 → 이름(ko) → id, 입력 배열 불변 |
| `state.test.mjs` | reducer 전이, 같은 시·도·구·시 재선택 해제, 시·도 변경 시 sub 초기화·visible 리셋, 무효값·불변 |
| `hash.test.mjs` | `#map=&sub=&q=` 직렬화·파싱 왕복(17개 시·도 전부), 무효값 무시 |
| `keynav.test.mjs` | bb 중심 기준 방향키 최근접, 같은 줄 우선, Home·End, 실제 `map.json` prov 로 교차 검증 |
| `paginate.test.mjs` | PAGE_SIZE 20, 남은 수, 더 보기 포커스 인덱스, 시·도 그룹 묶음 |

## 구현 시 지켜야 하는 것

- 문구는 `js/copy.js` 한 곳에서만 정의한다. `index.html` 의 정적 텍스트도 같은 값이어야 하고 `copy.test.mjs` 가 대조한다.
- DOM 생성은 `createElement`/`textContent` 로만 한다(`innerHTML` 계열 금지).
- 색·크기는 `css/tokens.css` 변수만 쓴다.
- CTA 4곳(hero · solution · 모바일 고정 · closing)은 문구를 통일하고 `#hospital-map` 으로 `scrollIntoView` 한다. **해시는 지도 상태 전용이라 CTA 가 `location.hash` 를 바꾸지 않는다.**
- 모션을 더하면 `css/motion.css` 상단 등재표에 이름·목적·길이·reduced-motion 대체를 적는다.
- 금지어(§2-3)와 지도 구간 추가 금지어(§6-5 X8)를 확인한다. `보장` 은 footer 정본 구절 '보장하지 않습니다' 안에서만 허용한다.

## QA 위임

브라우저 실측(Lighthouse·axe·INP·실기기 뷰포트·시각 완성도)은 QA 트랙에서 한다. 구현은 로직·구조·문구·데이터를 테스트로 보장한다.
