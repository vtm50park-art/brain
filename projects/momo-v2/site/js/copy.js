/**
 * 모모형 병원 랜딩페이지 V2 — 카피 정본
 * 근거: V2_BUILD_SPEC §4(페이지 카피) · §6-5(지도 구간 문구)
 *
 * 화면에 나가는 모든 문구는 이 파일 한 곳에서 정의한다.
 * index.html 의 정적 텍스트도 이 값과 동일해야 하며 tests/copy.test.mjs 가 대조한다.
 * `{}` 가 들어가는 문구는 함수로 두어 보간 위치를 고정한다.
 */

/** 4곳(히어로 · 해결책 · 모바일 고정 · 마무리)에서 같은 문구를 쓴다 — §3 */
export const CTA_LABEL = '내 지역 병원 찾기';

/** CTA 목적지 섹션 id — 해시는 지도 상태 전용이라 덮어쓰지 않는다 — §3 */
export const CTA_TARGET_ID = 'hospital-map';

/** 모바일 breakpoint — css/tokens.css 의 --bp-mobile 과 같은 값 — §5-4 */
export const MOBILE_BREAKPOINT = 768;

/** 리스트 페이지 단위 — §6-4 (DEV-2B 리스트에서 사용) */
export const PAGE_SIZE = 20;

export const HERO = {
  /** 회전 고민 문구 4개. a = 첫 줄, b = 둘째 줄 — §4 S1 */
  rotation: [
    { a: '탈모 때문에', b: '어디 병원을 가야 할까?' },
    { a: '탈모 샴푸 · 영양제,', b: '안 해본 거 없으신가요?' },
    { a: '치료 타이밍을 놓치면', b: '탈모는 계속 진행될 수 있습니다' },
    { a: '정답은 하나,', b: '전문의 진료부터' },
  ],
  rotationListLabel: '탈모를 겪는 분들의 고민',
  pauseLabel: '문구 전환 일시정지',
  resumeLabel: '문구 전환 다시 시작',
  h1: '탈모, 어디 병원부터 가야 할까요?',
  sub: '19년 탈모 1등 가이드 모모형이 추천하는 전국 10개 시·도 탈모 진료 병원 89곳을 지역별로 확인하세요.',
  cta: CTA_LABEL,
  videoLabel: '모모형이 직접 전하는 병원 선택 이야기 (삼탈모TV)',
  videoPlayLabel: '영상 재생',
  videoExternal: '유튜브에서 보기',
  videoTitle: '삼탈모TV 영상',
  photoAlt: '탈모 전문가 모모형',
};

/** 영상은 클릭 후에만 외부 요청이 일어난다 — §4 S1 / §1 */
export const VIDEO = {
  id: 'TFhDyC6f0nU',
  embed: 'https://www.youtube-nocookie.com/embed/TFhDyC6f0nU?autoplay=1&rel=0',
  watch: 'https://www.youtube.com/watch?v=TFhDyC6f0nU',
};

export const STORY = {
  title: '탈모, 혼자 알아보다 길을 잃기 쉽습니다.',
  body: '모모형은 19년간 탈모 관련 정보를 찾고 여러 관리 방법과 병원 진료 정보를 경험해 왔습니다. 정보가 많아 어디서부터 시작할지 고민된다면, 병원을 찾는 일부터 정리해 보세요.',
  listTitle: '19년간 경험한 관리·치료',
  items: [
    { term: '관리', desc: '탈모 샴푸 · 토닉 · 영양제 등 여러 관리 방법' },
    { term: '시술', desc: 'PRP · 레이저 · 자기장 · 고주파 · 헤어백신 · 사이토카인' },
    { term: '약물', desc: '먹는 약 · 바르는 약 등 약물 치료 (처방은 의료진이 결정)' },
  ],
  caption: '모모형 개인의 경험이며, 효과는 사람마다 다릅니다.',
  photoAlt: '모모형',
};

export const RISK = {
  title: '방향을 못 잡으면 시간과 비용이 쌓일 수 있습니다.',
  cards: [
    { term: '시간', desc: '확인되지 않은 방법을 이것저것 시도하다 보면 시간이 흘러갑니다.' },
    { term: '비용', desc: '여러 제품과 방법을 반복하면 비용 부담이 커질 수 있습니다.' },
    { term: '혼란', desc: '정보가 많을수록 내 상황에 맞는 선택이 더 어려워집니다.' },
  ],
  outro: '증상이 걱정된다면 의료진과 상담해 현재 상태를 확인해 보는 것이 좋습니다.',
};

export const ROLE = {
  title: '혼자 알아볼 때와 진료 상담을 받을 때',
  head: { label: '구분', momo: '모모형', hospital: '병원 의료진' },
  rows: [
    { label: '역할', momo: '병원을 찾는 길잡이', hospital: '진단·치료' },
    {
      label: '하는 일',
      momo: '지역별 추천 병원 안내, 19년 경험 공유',
      hospital: '상태 확인, 개인 상황 상담, 진료 방법 결정',
    },
  ],
};

/** B4 비의사 고지 — S4 역할표 아래 + 병원 안내 섹션 주의문 위, 두 곳 모두 같은 문구 */
export const NOT_A_DOCTOR = '모모형은 의사가 아닙니다. 진단과 치료는 반드시 의료진과 상담하세요.';

export const SOLUTION = {
  title: '시작은 병원 상담부터.',
  emphasis: '정답은 하나, 전문의 진료부터',
  body: '19년의 경험을 바탕으로, 모모형이 병원을 찾는 분들께 지역별 추천 병원을 안내합니다. 탈모가 걱정된다면 먼저 병원 진료와 의료진 상담으로 현재 상태를 확인해 보세요.',
  typesTitle: '탈모, 원인과 형태가 다양합니다',
  typesNotice: '탈모 유형은 다양하며, 정확한 원인과 유형은 의료진 진단으로 확인합니다.',
  types: [
    { term: '유전성 탈모', desc: '남성형 / 여성형' },
    { term: '질환성 탈모', desc: '갑상선 기능 이상 등 내과적 원인' },
    { term: '휴지기 탈모', desc: '스트레스 · 잘못된 식습관 · 다이어트 등' },
    { term: '원형 탈모', desc: '면역계 문제' },
  ],
  cta: CTA_LABEL,
};

/**
 * 병원 안내(hospital-map) 구간 문구 — §4 S6 + §6-5
 * 문체: 안내문은 해요체, 고지·주의문은 합니다체.
 * 이 구간 화면 텍스트에는 '상담' 단어를 쓰지 않는다.
 * 예외: B4 비의사 고지(NOT_A_DOCTOR)는 법적 고지라 '상담' 금지보다 우선한다(서지윤 실장 채택).
 */
export const MAP = {
  title: '전국 탈모 진료 병원',
  subtitle: '모모형이 추천하는 전국 10개 시·도 89곳, 지역을 누르면 병원 목록이 열립니다',
  /** B5 추천 관계 고지 — 부제 아래 1줄 */
  relation: '모모형이 추천하는 병원이며, 추천에 대한 대가·협찬·제휴는 없습니다.',
  imageAlt: '모모형 추천',
  /** B4 는 주의문 바로 위 */
  notice: '병원 정보는 변경될 수 있으니 방문 전 전화로 진료 일정을 꼭 확인하세요.',
  asOf: '병원 정보 기준 2026.10',

  searchPlaceholder: '병원명·원장명·지역·주소로 검색',
  searchLabel: '병원 검색',
  regionChipsLabel: '시·도 선택',
  subChipsLabel: '구·시 선택',
  mapLabel: '전국 병원 분포 지도',
  listLabel: '병원 목록',

  guideIdle: '지역을 눌러 병원을 찾아보세요. 서울·경기는 구·시 단위까지 볼 수 있어요',
  guideZoom: (sido) => `${sido} 지도예요. 구·시를 누르면 해당 지역 병원만 보여드려요`,
  guideSub: (sido, sub, n) =>
    `${sido} ${sub}의 병원 ${n}곳이에요. 다른 구·시는 지도나 칩에서 바꿀 수 있어요`,
  guideSido: (sido, n) =>
    `${sido} 병원 ${n}곳을 목록에 표시했어요. 같은 지역을 다시 누르면 전체로 돌아가요`,

  emptyRegion: '등록된 병원이 없습니다. 병원이 있는 지역을 선택해 주세요',
  backLabel: '전국 지도',
  backAria: '전국 지도로 돌아가기',

  summarySub: '방문 전 전화로 진료 일정을 확인하세요',
  summaryClear: '선택한 조건 전체 해제',
  summaryWholeSido: (sido, n) => `${sido} 전체 ${n}곳 보기`,

  noResult: (q) => `'${q}'와 일치하는 병원이 없어요. 철자를 확인하거나 지역명으로 검색해 보세요.`,
  noResultClear: '검색 지우기',
  noResultNationwide: '전국에서 찾기',

  loadError: '지도를 불러오지 못했어요. 지도 없이 아래 목록에서 병원을 찾을 수 있어요.',
  loadRetry: '다시 시도',

  listEnd: (n) => `여기까지 ${n}곳이에요. 찾는 병원이 없다면 다른 지역을 선택하거나 검색해 보세요.`,
  listBackToMap: '지도로 돌아가기',
  loadMore: (remaining) => `더 보기 · ${remaining}곳 남음`,

  callLabel: '전화하기',
  callAria: (name, phone) => `전화하기: ${name} ${phone}`,
  naverLabel: '네이버지도 검색',
  naverAria: (name, sgg) => `네이버지도 검색: ${name} ${sgg} 검색결과, 새 창`,
  doctorSuffix: (doctor) => `${doctor} 원장`,

  /** 범례 — SVG 밖 한 줄 · §6-2 */
  legend: ['없음', '1–3', '4–9', '10+', '선택'],
  legendSub: ['구·시 기준', '없음', '1', '2–3', '4+'],
};

export const CLOSING = {
  title: '가까운 병원, 지금 확인해 보세요.',
  cta: CTA_LABEL,
  support: '진료 여부와 방법은 의료진과 상담해 결정하세요.',
  sign: '19년 탈모 1등 가이드 모모형',
  youtube: '삼탈모TV 유튜브',
};

export const FOOTER = {
  /** '보장하지 않습니다' 는 금지어 '보장' 의 유일한 정본 예외 구절이다 */
  disclaimer:
    '본 페이지는 모모형의 개인 경험을 바탕으로 한 정보 제공 목적이며, 특정 의료기관의 진료 결과나 치료 효과를 보장하지 않습니다. 진단과 치료는 반드시 의료진과 상담하세요.',
  copyright: '© 모모형 · 삼탈모TV · 병원 정보 기준 2026.10',
};

export const FIXED_CTA = {
  label: CTA_LABEL,
  /** 모바일 고정 CTA 자체를 읽어 주는 영역 라벨 */
  regionLabel: '빠른 이동',
};
