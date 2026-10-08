/**
 * 병원 리스트 · 검색 · 조건 요약 바 — V2_BUILD_SPEC §6-3 · §6-4 · §6-5 (DEV-3C)
 *
 * 상태는 js/map.js 가 들고 있는 reducer 하나가 정본이다. 리스트는
 * ① 검색 입력·'더 보기'·조건 해제를 `applyAction` 으로 지도에 보내고
 * ② `momo:state` 를 구독해 다시 그린다.
 * 상태 사본을 따로 두지 않으므로 지도와 리스트가 어긋날 자리가 없다.
 *
 * 렌더 결과는 먼저 순수 함수(`cardModel`·`summaryModel`·`listModel`)로 **객체**를 만들고,
 * DOM 은 그 객체를 그대로 옮겨 붙인다. 테스트(tests/list-ui.test.mjs)는 DOM 없이
 * 이 객체·문자열만 보면 라벨·aria·tel·링크를 전부 검사할 수 있다.
 * 문자열은 textContent·setAttribute 로만 넣는다(innerHTML 0, `<mark>` 는 createElement).
 */

import { MAP, MOBILE_BREAKPOINT } from './copy.js';
import { filterClinics, highlightParts } from './lib/search.js';
import { sortClinics } from './lib/sort.js';
import { PAGE_SIZE, firstNewIndex, groupBySido, paginateGrouped } from './lib/paginate.js';
import { ACTIONS, hasFilter } from './lib/state.js';
import { QUERY_DEBOUNCE, parseHash, serializeHash, hasMapHash } from './lib/hash.js';
import {
  SEARCH_TRACK_DEBOUNCE,
  SEARCH_TRACK_MIN_LENGTH,
  TRACK_EVENTS,
  track,
} from './lib/track.js';
import {
  STATE_EVENT,
  ZOOM_SIDO,
  applyAction,
  currentState,
  highlightRegion,
  loadMapData,
  requestMapData,
  setSearchResults,
} from './map.js';

/** 네이버지도 검색 — 유일하게 허용된 외부 링크 (§1) */
export const NAVER_SEARCH_BASE = 'https://map.naver.com/p/search/';

/** 리스트 제목으로 자동 스크롤 300ms (§6-3) */
export const SCROLL_MS = 300;

/* ============================ 순수 모델 ============================ */

const textOf = (value) => (typeof value === 'string' ? value : '');

/** 표시전화에서 숫자만 — `tel` 필드가 비어 있어도 링크를 잃지 않게 보강한다 (§7 N3b) */
const digitsOf = (clinic) => {
  const tel = textOf(clinic?.tel).replace(/\D/g, '');
  if (tel.length > 0) return tel;
  return textOf(clinic?.phone).split('~')[0].replace(/\D/g, '');
};

/** `https://map.naver.com/p/search/{병원명 구·시}` — 질의는 encodeURIComponent (§6-4) */
export function naverSearchUrl(clinic) {
  const query = [textOf(clinic?.name), textOf(clinic?.sgg)].filter(Boolean).join(' ');
  return `${NAVER_SEARCH_BASE}${encodeURIComponent(query)}`;
}

/** `tel:` href — 숫자가 없으면 null (버튼을 링크 아닌 상태로 두는 신호) */
export function telHref(clinic) {
  const digits = digitsOf(clinic);
  return digits.length > 0 ? `tel:${digits}` : null;
}

/**
 * 카드 1장 — §6-4 위계(지역 칩 → 병원명 → 원장 → 주소 → 전화) 그대로의 객체.
 * `*Parts` 는 `<mark>` 로 감쌀 조각 목록이고, 전화는 **번호 텍스트 자체가 링크**다.
 */
export function cardModel(clinic, query = '') {
  const name = textOf(clinic?.name);
  const sgg = textOf(clinic?.sgg);
  const doctor = textOf(clinic?.doctor);
  const addr = textOf(clinic?.addr);
  const phone = textOf(clinic?.phone);
  const href = telHref(clinic);

  return {
    id: textOf(clinic?.id),
    sido: textOf(clinic?.sido),
    sub: sgg,
    region: textOf(clinic?.label),
    name,
    nameParts: highlightParts(name, query),
    doctor,
    doctorText: doctor ? MAP.doctorSuffix(doctor) : '',
    doctorParts: highlightParts(doctor, query),
    addr,
    addrParts: highlightParts(addr, query),
    phone,
    telHref: href,
    call: {
      label: MAP.callLabel,
      ariaLabel: MAP.callAria(name, phone),
      href,
    },
    naver: {
      label: MAP.naverLabel,
      ariaLabel: MAP.naverAria(name, sgg),
      href: naverSearchUrl(clinic),
      target: '_blank',
      rel: 'noopener noreferrer',
    },
  };
}

/** 카드의 보이는 텍스트만 위계 순서대로 — 테스트가 문자열로 검사한다 */
export function cardLines(model) {
  return [
    model.region,
    model.name,
    model.doctorText,
    model.addr,
    model.phone,
    model.call.label,
    model.naver.label,
  ].filter((line) => line.length > 0);
}

/** 카드 텍스트 한 덩어리 */
export const cardText = (model) => cardLines(model).join('\n');

/**
 * 조건 요약 바 — "서울 › 강남구 · 20곳 ✕" + 보조 문구(§6-5).
 * 서울·경기에서 구·시가 걸려 있으면 '{서울} 전체 {N}곳 보기' 를 함께 낸다.
 */
export function summaryModel(state, total, sidoTotal = total) {
  const current = state ?? {};
  const steps = [];
  if (current.sido) steps.push(current.sido);
  if (current.sido && current.sub) steps.push(current.sub);
  const query = textOf(current.q).trim();
  if (steps.length === 0 && query.length > 0) steps.push(`'${query}'`);

  const whole =
    current.sido && current.sub && ZOOM_SIDO.includes(current.sido)
      ? MAP.summaryWholeSido(current.sido, sidoTotal)
      : null;

  return {
    visible: hasFilter(current),
    label: steps.join(' › '),
    count: total,
    countText: `${total}곳`,
    text: steps.length > 0 ? `${steps.join(' › ')} · ${total}곳` : `${total}곳`,
    clearLabel: MAP.summaryClear,
    clearMark: '✕',
    support: MAP.summarySub,
    wholeSido: whole,
  };
}

/**
 * 리스트 전체 — 0건·'더 보기'·리스트 끝 중 무엇을 낼지까지 담는다 (§6-4 · §6-5).
 * `mobile` 이 false 면 전체를 한 번에 낸다(PC 는 패널 내부 스크롤로 전체 — §6-4).
 */
export function listModel(clinics, state, { mobile = false } = {}) {
  const current = state ?? {};
  const query = textOf(current.q);
  const all = Array.isArray(clinics) ? clinics : [];

  if (all.length === 0) {
    return {
      status: 'empty',
      total: 0,
      groups: [],
      cards: [],
      hasMore: false,
      remaining: 0,
      empty: {
        text: MAP.noResult(query.trim()),
        clearLabel: MAP.noResultClear,
        nationwideLabel: MAP.noResultNationwide,
      },
      end: null,
    };
  }

  const page = mobile
    ? paginateGrouped(all, current.visible ?? PAGE_SIZE)
    : { items: all, shown: all.length, total: all.length, remaining: 0, hasMore: false, groups: groupBySido(all) };

  return {
    status: 'ok',
    total: page.total,
    shown: page.shown,
    groups: page.groups.map((group) => ({
      sido: group.sido,
      count: group.items.length,
      cards: group.items.map((clinic) => cardModel(clinic, query)),
    })),
    cards: page.items.map((clinic) => cardModel(clinic, query)),
    hasMore: page.hasMore,
    remaining: page.remaining,
    moreLabel: page.hasMore ? MAP.loadMore(page.remaining) : null,
    empty: null,
    end: page.hasMore
      ? null
      : { text: MAP.listEnd(page.total), backLabel: MAP.listBackToMap },
  };
}

/* ============================ DOM 영역 ============================ */

let clinics = null;
let dom = null;
let loadFailed = false;
let hashTimer = 0;
let searchTimer = 0;
let resizeTimer = 0;
let pendingFocus = null;
let lastHash = null;
let lastSynced = { sido: null, sub: null, q: '' };

const isMobile = () => typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT;

const prefersReduced = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function el(name, className, text = null) {
  const node = document.createElement(name);
  if (className) node.className = className;
  if (text !== null) node.textContent = text;
  return node;
}

const clear = (node) => {
  while (node && node.firstChild) node.removeChild(node.firstChild);
};

/** 하이라이트 조각 — `<mark>` 는 createElement 로만 만든다 (§6-3) */
function appendParts(host, parts, tail = '') {
  for (const part of parts) {
    if (part.mark) host.appendChild(el('mark', 'map__mark', part.text));
    else host.appendChild(document.createTextNode(part.text));
  }
  if (tail) host.appendChild(document.createTextNode(tail));
}

function button(className, label, onClick) {
  const node = el('button', className, label);
  node.type = 'button';
  node.addEventListener('click', onClick);
  return node;
}

/* ------------------------------ 카드 ------------------------------ */

function cardNode(model) {
  const card = el('article', 'map__card');
  card.tabIndex = -1;
  card.dataset.id = model.id;
  card.dataset.sido = model.sido;
  card.dataset.sub = model.sub;

  if (model.region) card.appendChild(el('p', 'map__card-region', model.region));

  const name = el('h4', 'map__card-name');
  appendParts(name, model.nameParts);
  card.appendChild(name);

  if (model.doctorText) {
    const doctor = el('p', 'map__card-doctor');
    appendParts(doctor, model.doctorParts, ' 원장');
    card.appendChild(doctor);
  }

  if (model.addr) {
    const addr = el('p', 'map__card-addr');
    appendParts(addr, model.addrParts);
    card.appendChild(addr);
  }

  if (model.phone) {
    const phone = el('p', 'map__card-phone');
    if (model.telHref) {
      // 번호 텍스트 자체가 tel 링크다 (§6-4)
      const link = el('a', 'map__card-tel', model.phone);
      link.href = model.telHref;
      phone.appendChild(link);
    } else {
      phone.textContent = model.phone;
    }
    card.appendChild(phone);
  }

  const actions = el('div', 'map__card-actions');

  const call = el('a', 'map__btn map__btn--call', model.call.label);
  if (model.call.href) call.href = model.call.href;
  call.setAttribute('aria-label', model.call.ariaLabel);
  call.addEventListener('click', () => {
    track(TRACK_EVENTS.HOSPITAL_CALL_CLICK, { hospital_id: model.id, region: model.sido });
  });
  actions.appendChild(call);

  const naver = el('a', 'map__btn map__btn--naver', model.naver.label);
  naver.href = model.naver.href;
  naver.target = model.naver.target;
  naver.rel = model.naver.rel;
  naver.setAttribute('aria-label', model.naver.ariaLabel);
  naver.addEventListener('click', () => {
    track(TRACK_EVENTS.HOSPITAL_NAVER_CLICK, { hospital_id: model.id, region: model.sido });
  });
  actions.appendChild(naver);

  card.appendChild(actions);
  return card;
}

/* ------------------------------ 조건 요약 바 ------------------------------ */

function renderSummary(model) {
  const host = dom.summary;
  if (!host) return;
  clear(host);

  if (!model.visible) {
    host.appendChild(el('span', 'map__summary-support', model.support));
    return;
  }

  const line = el('span', 'map__summary-line');
  if (model.label) line.appendChild(el('span', 'map__summary-label', model.label));
  line.appendChild(el('span', 'map__summary-count', model.countText));
  host.appendChild(line);

  const clearBtn = button('map__summary-clear', model.clearMark, () => {
    applyAction({ type: ACTIONS.RESET }, 'list');
    track(TRACK_EVENTS.MAP_RESET);
  });
  clearBtn.setAttribute('aria-label', model.clearLabel);
  host.appendChild(clearBtn);

  if (model.wholeSido) {
    host.appendChild(
      button('map__summary-whole', model.wholeSido, () => {
        const state = currentState();
        applyAction({ type: ACTIONS.SELECT_SUB, sub: state.sub }, 'list');
      })
    );
  }

  host.appendChild(el('span', 'map__summary-support', model.support));
}

/* ------------------------------ 리스트 ------------------------------ */

function renderLoadError() {
  const host = dom.list;
  clear(host);
  host.removeAttribute('aria-busy');
  const box = el('div', 'map__error');
  box.setAttribute('role', 'alert');
  box.appendChild(el('p', '', MAP.loadError));
  box.appendChild(
    button('map__retry', MAP.loadRetry, () => {
      loadFailed = false;
      start();
    })
  );
  host.appendChild(box);
}

function renderEmpty(model) {
  const host = dom.list;
  const box = el('div', 'map__empty');
  box.appendChild(el('p', 'map__empty-text', model.empty.text));
  const actions = el('div', 'map__empty-actions');
  actions.appendChild(button('map__back', model.empty.clearLabel, () => setQuery('', true)));
  actions.appendChild(
    button('map__back', model.empty.nationwideLabel, () => {
      applyAction({ type: ACTIONS.RESET }, 'list');
      track(TRACK_EVENTS.MAP_RESET);
    })
  );
  box.appendChild(actions);
  host.appendChild(box);
}

function renderList(model, state, mobile) {
  const host = dom.list;
  clear(host);
  host.removeAttribute('aria-busy');

  if (model.status === 'empty') {
    renderEmpty(model);
    return;
  }

  const cards = [];
  for (const group of model.groups) {
    // 모바일은 시·도 sticky 그룹 헤더 — PC 는 CSS 로 sticky 를 끈다 (§6-4)
    const section = el('section', 'map__group');
    const head = el('div', 'map__group-head');
    const title = el('h3', 'map__group-title');
    title.appendChild(el('span', '', group.sido));
    title.appendChild(el('span', 'map__group-count', `${group.count}곳`));
    head.appendChild(title);
    // 1단 레이아웃 복귀 동선 — PC 2단은 지도가 늘 보이므로 CSS 로 숨긴다 (§6-3)
    head.appendChild(button('map__group-back', MAP.listBackToMap, backToMap));
    section.appendChild(head);
    for (const card of group.cards) {
      const node = cardNode(card);
      section.appendChild(node);
      cards.push(node);
    }
    host.appendChild(section);
  }

  if (model.hasMore) {
    const region = state.sub || state.sido || '전국';
    host.appendChild(
      button('map__more', model.moreLabel, () => {
        pendingFocus = firstNewIndex(state.visible ?? PAGE_SIZE, model.total);
        track(TRACK_EVENTS.LIST_LOAD_MORE, { region, remaining: model.remaining });
        applyAction({ type: ACTIONS.SHOW_MORE, total: model.total }, 'list');
      })
    );
  } else if (model.end) {
    const end = el('div', 'map__end');
    end.appendChild(el('p', 'map__end-text', model.end.text));
    end.appendChild(button('map__back', model.end.backLabel, scrollToMap));
    host.appendChild(end);
  }

  if (pendingFocus !== null) {
    cards[pendingFocus]?.focus?.();
    pendingFocus = null;
  }

  if (!mobile) bindHover(cards);
}

/** PC 한정 — 카드 hover·focus-within 시 지도 강조 동기화 (§6-4) */
function bindHover(cards) {
  for (const card of cards) {
    const on = () => highlightRegion(card.dataset.sub || card.dataset.sido);
    const off = () => highlightRegion(null);
    card.addEventListener('mouseenter', on);
    card.addEventListener('mouseleave', off);
    card.addEventListener('focusin', on);
    card.addEventListener('focusout', off);
  }
}

/* ------------------------------ 렌더 ------------------------------ */

function render(state) {
  if (!dom) return;
  if (loadFailed) {
    renderSummary(summaryModel(state, 0));
    renderLoadError();
    return;
  }
  if (!clinics) return;

  const mobile = isMobile();
  const searched = state.q ? filterClinics(clinics, { q: state.q }) : clinics;
  // 검색 중 칩·지도 배지 숫자를 결과 기준으로 갱신한다 — 지도 모듈에 결과를 넘긴다 (§6-3)
  setSearchResults(state.q ? searched : null);

  const scoped = sortClinics(filterClinics(searched, { sido: state.sido, sub: state.sub }));
  const sidoTotal = state.sido
    ? filterClinics(searched, { sido: state.sido }).length
    : scoped.length;

  renderSummary(summaryModel(state, scoped.length, sidoTotal));
  renderList(listModel(scoped, state, { mobile }), state, mobile);
}

/* ------------------------------ 입력 ------------------------------ */

/** 검색어 변경 — 상태는 지도 쪽 reducer 가 받는다 */
function setQuery(value, syncInput = false) {
  if (syncInput && dom?.input) dom.input.value = value;
  applyAction({ type: ACTIONS.SET_QUERY, q: value }, 'list');
}

/** map_search 는 600ms 디바운스 · 2자 이상 · 검색어 원문 전송 금지 (§6-4) */
function trackSearch(query, resultCount) {
  clearTimeout(searchTimer);
  const length = query.trim().length;
  if (length < SEARCH_TRACK_MIN_LENGTH) return;
  searchTimer = setTimeout(() => {
    track(TRACK_EVENTS.MAP_SEARCH, { result_count: resultCount, query_length: length });
  }, SEARCH_TRACK_DEBOUNCE);
}

function scrollToMap() {
  dom?.canvas?.scrollIntoView({
    behavior: prefersReduced() ? 'auto' : 'smooth',
    block: 'center',
  });
}

/** 그룹 헤더 '지도로 돌아가기' — 같은 지도 위치로 이동하고 포커스를 지도 영역에 둔다 (§6-3) */
function backToMap() {
  scrollToMap();
  dom?.canvas?.focus?.({ preventScroll: true });
}

/** 구·시 또는 비확대 시·도 선택 시 모바일에서 리스트로 자동 스크롤 (§6-3) */
function maybeScrollToList(state, source) {
  if (!isMobile() || source === 'list') return;
  const zoomOnly = state.sido && !state.sub && ZOOM_SIDO.includes(state.sido);
  if (!state.sido || zoomOnly) return;
  dom?.panel?.scrollIntoView({
    behavior: prefersReduced() ? 'auto' : 'smooth',
    block: 'start',
  });
}

/* ------------------------------ 해시 동기화 ------------------------------ */

function writeHash(hash, push) {
  const url = hash || `${window.location.pathname}${window.location.search}`;
  lastHash = hash;
  if (push) window.history.pushState(null, '', url);
  else window.history.replaceState(null, '', url);
}

/** 시·도·구·시는 pushState, 검색어는 250ms 디바운스 replaceState (§6-3) */
function syncHash(state) {
  if (typeof window === 'undefined' || !window.history?.pushState) return;
  const hash = serializeHash(state);
  const regionChanged = state.sido !== lastSynced.sido || state.sub !== lastSynced.sub;
  const queryChanged = state.q !== lastSynced.q;
  lastSynced = { sido: state.sido, sub: state.sub, q: state.q };

  if (regionChanged) {
    clearTimeout(hashTimer);
    if (hash !== (window.location.hash || '')) writeHash(hash, true);
    return;
  }
  if (!queryChanged) return;

  clearTimeout(hashTimer);
  hashTimer = setTimeout(() => {
    if (hash !== (window.location.hash || '')) writeHash(hash, false);
  }, QUERY_DEBOUNCE);
}

function hydrateFromHash() {
  const hash = window.location.hash || '';
  if (hash === lastHash) return;
  lastHash = hash;
  const parsed = parseHash(hash);
  lastSynced = { sido: parsed.sido, sub: parsed.sub, q: parsed.q };
  if (dom?.input) dom.input.value = parsed.q;
  applyAction({ type: ACTIONS.HYDRATE, state: parsed }, 'list');
}

/* ------------------------------ 데이터 ------------------------------ */

async function start() {
  dom.list.setAttribute('aria-busy', 'true');
  try {
    // 지도와 같은 로드를 공유한다 — 실패해도 리스트·검색은 clinics 만으로 동작한다 (§6-4)
    const data = await loadMapData();
    clinics = data.clinics;
  } catch {
    try {
      const response = await fetch('data/clinics.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('load failed: clinics');
      clinics = await response.json();
    } catch {
      loadFailed = true;
      track(TRACK_EVENTS.MAP_ERROR, { reason: 'clinics' });
    }
  }
  render(currentState());
}

/* ------------------------------ 진입점 ------------------------------ */

/** 리스트 배선 — main.js 가 initMap 뒤에 호출한다 */
export function initList() {
  const list = document.querySelector('[data-role="map-list"]');
  if (!list) return;

  dom = {
    list,
    summary: document.querySelector('[data-role="map-summary"]'),
    input: document.querySelector('[data-role="map-search"]'),
    canvas: document.querySelector('[data-role="map-canvas"]'),
    panel: list.closest('.map__panel') ?? list,
  };

  dom.input?.addEventListener('input', () => {
    const value = dom.input.value;
    setQuery(value);
    const searched = clinics ? filterClinics(clinics, { q: value }) : [];
    trackSearch(value, searched.length);
  });

  document.addEventListener(STATE_EVENT, (event) => {
    const state = event.detail?.state ?? currentState();
    syncHash(state);
    render(state);
    maybeScrollToList(state, event.detail?.source);
  });

  window.addEventListener('hashchange', hydrateFromHash);
  window.addEventListener(
    'resize',
    () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        render(currentState());
      }, 150);
    },
    { passive: true }
  );

  // 해시에 지도 상태가 있으면 즉시 로드한다 (§6-4)
  const hash = window.location.hash || '';
  if (hasMapHash(hash)) {
    hydrateFromHash();
    requestMapData();
  } else {
    lastHash = hash;
  }

  start();
}
