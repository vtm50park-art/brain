/**
 * 병원 지도 — V2_BUILD_SPEC §6-1 · §6-2 · §6-5 (DEV-3B)
 *
 * `data/map.json` 의 정적 SVG path 만 쓴다. 외부 지도 서비스·키·분석도구는 없다.
 * 상태는 `js/lib/state.js` 의 순수 reducer 로만 바뀌고, 바뀔 때마다 `document` 에
 * `momo:state` CustomEvent 를 쏜다 — 리스트(DEV-3C)는 이 이벤트만 구독하면 된다.
 * 이 파일은 리스트를 그리지 않는다.
 *
 * 앞쪽 절반은 DOM 을 쓰지 않는 순수 함수다(tests/map-ui.test.mjs 가 직접 검사한다).
 */

import { MAP } from './copy.js';
import { ACTIONS, reduce, initialState } from './lib/state.js';
import { sidoByShort } from './lib/alias.js';
import { filterClinics, regionCounts } from './lib/search.js';
import { nextByKey, handlesKey, centerOf } from './lib/keynav.js';
import { track, TRACK_EVENTS } from './lib/track.js';

/* ============================ 순수 영역 ============================ */

export const SVG_NS = 'http://www.w3.org/2000/svg';

/** 상태 변경 알림 이벤트 — 리스트(DEV-3C)가 구독하는 유일한 접점 */
export const STATE_EVENT = 'momo:state';

/** 배지 지름 24px → 반지름 12 (§6-2) */
export const BADGE_RADIUS = 12;

/** 배지 사이 최소 여유 — 겹침 0 판정은 `중심거리 ≥ 2r + gap` 이다 */
export const BADGE_GAP = 1;

/** 지역명을 숨기는 렌더 크기 경계 (§6-2) */
export const LABEL_MIN_WIDTH = 40;
export const LABEL_MIN_HEIGHT = 28;

/** 소형 지역 투명 원 히트영역 — CSS 픽셀 기준 지름 (§6-2) */
export const HIT_TARGET = 44;

/** 확대 전환 600ms, reduced-motion 은 0ms (§6-2) */
export const ZOOM_MS = 600;

/** 구·시까지 확대하는 시·도 (§6-2) */
export const ZOOM_SIDO = Object.freeze(['서울', '경기']);

/** 확대 시 여백 비율 */
const ZOOM_PAD = 0.08;

/**
 * 해칭 패턴 정의 — 색 단독 의존을 없애는 2종 (§6-2)
 * 1–3 단계는 45도 간격 8, 4–9 단계는 −45도 간격 5. 10+ 는 단색, 없음은 해칭 없음.
 */
export const HATCH = Object.freeze([
  Object.freeze({ tier: 'low', id: 'momo-hatch-low', angle: 45, gap: 8 }),
  Object.freeze({ tier: 'mid', id: 'momo-hatch-mid', angle: -45, gap: 5 }),
]);

/** 단계 경계 — 전국은 1–3 / 4–9 / 10+, 확대(구·시)는 1 / 2–3 / 4+ (§6-2 범례) */
export const TIER_STEPS = Object.freeze({
  prov: Object.freeze([3, 9]),
  sub: Object.freeze([1, 3]),
});

/** 병원 수 → 4단계 중 하나 */
export function tierOf(count, scope = 'prov') {
  const n = Number(count);
  if (!Number.isFinite(n) || n <= 0) return 'none';
  const [low, mid] = TIER_STEPS[scope] ?? TIER_STEPS.prov;
  if (n <= low) return 'low';
  if (n <= mid) return 'mid';
  return 'high';
}

/** 그 단계에 쓰는 해칭 정의 — 없으면 null */
export function hatchOf(tier) {
  return HATCH.find((entry) => entry.tier === tier) ?? null;
}

/** 렌더 크기 미달이면 지역명을 숨긴다 (§6-2) */
export function shouldHideRegionLabel(width, height) {
  const w = Number(width);
  const h = Number(height);
  if (!Number.isFinite(w) || !Number.isFinite(h)) return true;
  return w < LABEL_MIN_WIDTH || h < LABEL_MIN_HEIGHT;
}

/** viewBox 기준 user 단위 크기 → CSS 픽셀 크기 */
export function renderedSize(bb, viewBox, pixelSize) {
  if (!Array.isArray(bb) || bb.length !== 4 || !Array.isArray(viewBox) || viewBox.length !== 4) {
    return null;
  }
  const [, , vw, vh] = viewBox;
  const [pw, ph] = Array.isArray(pixelSize) ? pixelSize : [pixelSize, pixelSize];
  if (!(vw > 0) || !(vh > 0) || !(pw > 0) || !(ph > 0)) return null;
  return { width: ((bb[2] - bb[0]) / vw) * pw, height: ((bb[3] - bb[1]) / vh) * ph };
}

/** 황금각 — 좌표가 완전히 같을 때도 결정적으로 갈라지게 하는 밀어내기 방향 */
const GOLDEN_ANGLE = 2.399963229728653;

/**
 * 배지 겹침 0 — 결정적 밀어내기 (§6-2)
 *
 * seeds 는 `{ name, x, y }` 배열이고 입력 순서가 결과를 결정한다. 난수·시간을 쓰지
 * 않으므로 같은 입력이면 항상 같은 좌표가 나온다. 두 배지의 중심거리가 `2r + gap`
 * 보다 가까우면 둘을 반대 방향으로 같은 양만큼 민다.
 */
export function placeBadges(seeds, options = {}) {
  const radius = options.radius ?? BADGE_RADIUS;
  const gap = options.gap ?? BADGE_GAP;
  const minDist = radius * 2 + gap;
  const passes = options.passes ?? 200;
  const bounds = options.bounds ?? null;

  const points = (Array.isArray(seeds) ? seeds : [])
    .filter((seed) => Number.isFinite(seed?.x) && Number.isFinite(seed?.y))
    .map((seed, index) => ({ name: seed.name, x: seed.x, y: seed.y, index }));

  const clamp = (point) => {
    if (!bounds) return;
    point.x = Math.min(Math.max(point.x, radius), Math.max(bounds.width - radius, radius));
    point.y = Math.min(Math.max(point.y, radius), Math.max(bounds.height - radius, radius));
  };

  // 좌표를 2자리로 끊어도 겹치지 않게 최소거리에 여유를 둔다
  const safe = minDist + 0.05;
  const distance = (p, q) => Math.sqrt((q.x - p.x) ** 2 + (q.y - p.y) ** 2);

  for (let pass = 0; pass < passes; pass += 1) {
    let moved = false;
    for (let a = 0; a < points.length; a += 1) {
      for (let b = a + 1; b < points.length; b += 1) {
        const p = points[a];
        const q = points[b];
        let dx = q.x - p.x;
        let dy = q.y - p.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist >= safe) continue;

        if (dist < 1e-9) {
          // 좌표가 완전히 같을 때도 방향을 좌표·순서로만 정한다(난수 없음)
          const angle = GOLDEN_ANGLE * (p.index + 1);
          dx = Math.cos(angle);
          dy = Math.sin(angle);
          dist = 1;
        }
        const push = (safe - dist) / 2;
        const ux = (dx / dist) * push;
        const uy = (dy / dist) * push;
        p.x -= ux;
        p.y -= uy;
        q.x += ux;
        q.y += uy;
        clamp(p);
        clamp(q);
        moved = true;
      }
    }
    if (!moved) break;
  }

  /**
   * 최종 보정 — 반복 밀어내기로 안 풀린 배지(대칭 배치 등)는 입력 순서대로
   * 황금각 나선 위의 빈 자리로 옮긴다. 앞 배지는 이미 확정이라 반드시 끝난다.
   */
  for (let i = 1; i < points.length; i += 1) {
    const p = points[i];
    const cx = p.x;
    const cy = p.y;
    const blocked = () => points.slice(0, i).some((other) => distance(other, p) < safe);
    for (let k = 1; k <= 512 && blocked(); k += 1) {
      const angle = GOLDEN_ANGLE * k;
      const radius = safe * 0.75 * Math.sqrt(k);
      p.x = cx + Math.cos(angle) * radius;
      p.y = cy + Math.sin(angle) * radius;
      clamp(p);
    }
  }

  return points.map((point) => ({
    name: point.name,
    x: Math.round(point.x * 100) / 100,
    y: Math.round(point.y * 100) / 100,
  }));
}

/** 배치 결과에서 겹치는 쌍 수 — 0 이어야 한다 (§6-2) */
export function badgeOverlaps(placed, radius = BADGE_RADIUS, gap = BADGE_GAP) {
  const list = Array.isArray(placed) ? placed : [];
  const minDist = radius * 2 + gap;
  let count = 0;
  for (let a = 0; a < list.length; a += 1) {
    for (let b = a + 1; b < list.length; b += 1) {
      const dx = list[b].x - list[a].x;
      const dy = list[b].y - list[a].y;
      if (Math.sqrt(dx * dx + dy * dy) < minDist - 1e-6) count += 1;
    }
  }
  return count;
}

/** easeInOut — 확대/복귀 보간 (§6-2) */
export function easeInOut(t) {
  const x = Math.min(Math.max(Number(t) || 0, 0), 1);
  return x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
}

/** viewBox 선형 보간 */
export function lerpViewBox(from, to, t) {
  const k = easeInOut(t);
  return from.map((value, index) => value + (to[index] - value) * k);
}

/** bb 를 감싸는 viewBox — 캔버스 비율을 유지하며 여백을 둔다 */
export function viewBoxForBounds(bb, canvas, pad = ZOOM_PAD) {
  const [x1, y1, x2, y2] = bb;
  const ratio = canvas[1] > 0 ? canvas[0] / canvas[1] : 1;
  let w = Math.max(x2 - x1, 1) * (1 + pad * 2);
  let h = Math.max(y2 - y1, 1) * (1 + pad * 2);
  if (w / h > ratio) h = w / ratio;
  else w = h * ratio;
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  return [cx - w / 2, cy - h / 2, w, h];
}

/** 경로 표시 단계 — '전국 › 서울특별시 › 강남구' (§6-2) */
export function breadcrumbOf(state) {
  const steps = [{ key: 'all', label: '전국' }];
  if (state?.sido) {
    const entry = sidoByShort(state.sido);
    steps.push({ key: 'sido', label: entry?.full ?? state.sido, sido: state.sido });
    if (state.sub) steps.push({ key: 'sub', label: state.sub, sido: state.sido, sub: state.sub });
  }
  return steps;
}

/** 안내 문구 — §6-5 */
export function guideTextOf(state, count) {
  if (!state?.sido) return MAP.guideIdle;
  const full = sidoByShort(state.sido)?.full ?? state.sido;
  if (state.sub) return MAP.guideSub(full, state.sub, count);
  if (ZOOM_SIDO.includes(state.sido)) return MAP.guideZoom(full);
  return MAP.guideSido(full, count);
}

/* ============================ DOM 영역 ============================ */

const RETRY_LIMIT = 3;

let state = initialState();
let data = null;
let dataPromise = null;
let roving = null;
let tooltipAllowed = false;
let zoomFrame = 0;
let viewBox = null;
let zoomAnim = null;
let dom = null;
let started = false;
/** 리스트가 넘긴 검색 결과 — null 이면 전체 기준 */
let results = null;

const prefersReduced = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** SVG 요소 1개 — 속성은 객체로 한 번에 준다 */
function svgEl(name, attrs = null) {
  const el = document.createElementNS(SVG_NS, name);
  if (attrs) for (const key of Object.keys(attrs)) el.setAttribute(key, String(attrs[key]));
  return el;
}

/** HTML 요소 1개 — 텍스트는 textContent 로만 넣는다 */
function el(name, className, text = null) {
  const node = document.createElement(name);
  if (className) node.className = className;
  if (text !== null) node.textContent = text;
  return node;
}

const clear = (node) => {
  while (node && node.firstChild) node.removeChild(node.firstChild);
};

/** 상태 변경 — reducer 통과 후 바뀐 것이 있을 때만 렌더·알림 */
function dispatch(action, source = 'map') {
  const next = reduce(state, action);
  if (next === state) return;
  state = next;
  render();
  document.dispatchEvent(
    new CustomEvent(STATE_EVENT, { detail: { state: { ...state }, source } })
  );
}

/** 현재 상태에서 보이는 병원 — 칩·배지 숫자는 검색 결과 기준이다 (§6-3) */
function countsFor() {
  // 리스트(js/list.js)가 검색 결과를 넘겨 주면 그것이 기준이다 — 같은 필터를 두 번 돌리지 않는다
  if (results) return regionCounts(results);
  const clinics = data?.clinics ?? [];
  const searched = state.q ? filterClinics(clinics, { q: state.q }) : clinics;
  return regionCounts(searched);
}

const provCount = (counts, name) => counts.sido.get(name) ?? 0;
const subCount = (counts, sido, name) => counts.sub.get(`${sido}/${name}`) ?? 0;

/* ------------------------------ 지도 SVG ------------------------------ */

/** 해칭 패턴 2종을 defs 에 등록한다 */
function buildDefs() {
  const defs = svgEl('defs');
  for (const entry of HATCH) {
    const pattern = svgEl('pattern', {
      id: entry.id,
      width: entry.gap,
      height: entry.gap,
      patternUnits: 'userSpaceOnUse',
      patternTransform: `rotate(${entry.angle})`,
    });
    pattern.appendChild(
      svgEl('line', { x1: 0, y1: 0, x2: 0, y2: entry.gap, class: 'map__hatch-line' })
    );
    defs.appendChild(pattern);
  }
  return defs;
}

/** 캔버스 비우기 — 미니 인셋 버튼은 마크업 정본이라 지우지 않고 되돌려 붙인다 */
function clearCanvas() {
  clear(dom.canvas);
  if (dom.inset) dom.canvas.appendChild(dom.inset);
}

function buildMap() {
  clearCanvas();

  const svg = svgEl('svg', {
    class: 'map__svg',
    viewBox: `0 0 ${data.map.W} ${data.map.H}`,
    role: 'group',
    'aria-label': MAP.mapLabel,
    preserveAspectRatio: 'xMidYMid meet',
  });
  viewBox = [0, 0, data.map.W, data.map.H];
  svg.appendChild(buildDefs());

  const layers = {};
  for (const name of ['prov', 'sub', 'hatch', 'hits', 'badges', 'labels']) {
    layers[name] = svgEl('g', { class: `map__layer map__layer--${name}` });
    svg.appendChild(layers[name]);
  }

  for (const feature of data.map.prov) {
    const path = svgEl('path', { d: feature.d, class: 'map__area map__area--prov', role: 'button' });
    path.dataset.name = feature.name;
    layers.prov.appendChild(path);
  }

  dom.canvas.appendChild(svg);

  const tooltip = el('div', 'map__tooltip');
  tooltip.setAttribute('role', 'presentation');
  tooltip.hidden = true;
  dom.canvas.appendChild(tooltip);

  const announce = el('p', 'sr-only');
  announce.setAttribute('aria-live', 'polite');
  dom.canvas.appendChild(announce);

  dom.svg = svg;
  dom.layers = layers;
  dom.tooltip = tooltip;
  dom.announce = announce;

  bindMapEvents();
}

/** 확대 대상 구·시 path — 서울·경기 선택 시에만 그린다 */
function paintSubLayer(counts) {
  const layer = dom.layers.sub;
  const zoomed = ZOOM_SIDO.includes(state.sido);
  // SVG 요소는 HTML 의 hidden 속성을 반영하지 않으므로 클래스로 숨긴다
  layer.classList.toggle('is-hidden', !zoomed);
  layer.setAttribute('aria-hidden', String(!zoomed));
  if (!zoomed) {
    clear(layer);
    return;
  }

  const features = data.map[state.sido === '서울' ? 'seoul' : 'gg'] ?? [];
  const existing = layer.childElementCount === features.length;
  if (!existing) {
    clear(layer);
    for (const feature of features) {
      const path = svgEl('path');
      path.setAttribute('d', feature.d);
      path.dataset.name = feature.name;
      // 구·시 path 는 탭 순서에 들어가지 않는다 — 키보드 대체는 구·시 칩 (§6-2)
      path.setAttribute('tabindex', '-1');
      path.setAttribute('role', 'button');
      layer.appendChild(path);
    }
  }

  layer.classList.toggle('has-selection', Boolean(state.sub));

  for (const path of layer.children) {
    const name = path.dataset.name;
    const count = subCount(counts, state.sido, name);
    const selected = state.sub === name;
    const tier = tierOf(count, 'sub');
    path.setAttribute(
      'class',
      `map__area map__area--sub map__area--${tier}${selected ? ' is-selected' : ''}${
        count === 0 ? ' is-empty' : ''
      }`
    );
    path.setAttribute('aria-disabled', String(count === 0));
    path.setAttribute('aria-pressed', String(selected));
    path.setAttribute(
      'aria-label',
      count === 0 ? `${name}, ${MAP.emptyRegion}` : `${name} 병원 ${count}곳`
    );
  }
}

function paintProvLayer(counts) {
  const selectable = [];
  for (const path of dom.layers.prov.children) {
    const name = path.dataset.name;
    const count = provCount(counts, name);
    const selected = state.sido === name;
    const tier = tierOf(count, 'prov');
    const empty = count === 0;

    path.setAttribute(
      'class',
      `map__area map__area--prov map__area--${tier}${selected ? ' is-selected' : ''}${
        empty ? ' is-empty' : ''
      }`
    );
    path.setAttribute('aria-disabled', String(empty));
    path.setAttribute('aria-pressed', String(selected));
    const full = sidoByShort(name)?.full ?? name;
    path.setAttribute(
      'aria-label',
      empty ? `${full}, ${MAP.emptyRegion}` : `${full} 병원 ${count}곳`
    );
    // 병원 0곳 7개 시·도는 탭 순서에서 빠진다 (§6-2)
    if (empty) path.removeAttribute('tabindex');
    else selectable.push(name);
  }

  // 비선택 감쇠는 영역 층에만 준다 — 라벨·배지는 100% (§6-2)
  dom.layers.prov.classList.toggle('has-selection', Boolean(state.sido));

  // roving tabindex — Tab 정지점 1개 (§6-2)
  if (!selectable.includes(roving)) roving = state.sido ?? selectable[0] ?? null;
  for (const path of dom.layers.prov.children) {
    if (path.getAttribute('aria-disabled') === 'true') continue;
    path.setAttribute('tabindex', path.dataset.name === roving ? '0' : '-1');
  }
  return selectable;
}

/**
 * 해칭 오버레이 — 단계 Fill 위에 같은 path 를 패턴 fill 로 한 겹 덧댄다.
 * 1–3 과 4–9 를 색 없이도 구분하게 만드는 층이다 (§6-2).
 */
function paintHatch(scope, counts) {
  const source = dom.layers[scope];
  const layer = dom.layers.hatch;
  clear(layer);
  for (const path of source.children) {
    const name = path.dataset.name;
    const count =
      scope === 'sub' ? subCount(counts, state.sido, name) : provCount(counts, name);
    const hatch = hatchOf(tierOf(count, scope));
    if (!hatch) continue;
    const overlay = svgEl('path');
    overlay.setAttribute('d', path.getAttribute('d'));
    overlay.setAttribute('class', `map__hatch map__hatch--${hatch.tier}`);
    overlay.setAttribute('fill', `url(#${hatch.id})`);
    overlay.setAttribute('pointer-events', 'none');
    overlay.dataset.hatch = hatch.id;
    layer.appendChild(overlay);
  }
}

function pixelSize() {
  const rect = dom.svg.getBoundingClientRect?.();
  const width = rect?.width || dom.canvas.clientWidth || 744;
  const height = rect?.height || dom.canvas.clientHeight || 640;
  return [width, height];
}

/** 배지·지역명·히트영역 — 겹침 0 배치 후 한 번에 그린다 */
function paintOverlays(counts) {
  const zoomed = ZOOM_SIDO.includes(state.sido);
  const scope = zoomed ? 'sub' : 'prov';
  const features = zoomed
    ? data.map[state.sido === '서울' ? 'seoul' : 'gg'] ?? []
    : data.map.prov;

  const seeds = [];
  const meta = new Map();
  for (const feature of features) {
    const count = zoomed
      ? subCount(counts, state.sido, feature.name)
      : provCount(counts, feature.name);
    const anchor = zoomed ? null : data.map.anchor?.[feature.name];
    const center = Array.isArray(anchor) && anchor.length === 2 ? anchor : centerOf(feature.bb);
    if (!center) continue;
    meta.set(feature.name, { count, bb: feature.bb, center });
    if (count > 0) seeds.push({ name: feature.name, x: center[0], y: center[1] });
  }

  const px = pixelSize();
  const scale = viewBox && viewBox[2] > 0 ? viewBox[2] / px[0] : 1;
  const placed = placeBadges(seeds, {
    radius: BADGE_RADIUS * scale,
    gap: BADGE_GAP * scale,
    bounds: { width: data.map.W, height: data.map.H },
  });

  clear(dom.layers.badges);
  clear(dom.layers.labels);
  clear(dom.layers.hits);

  // 배지 — 지름 24px 고정, 숫자 13/700
  for (const point of placed) {
    const selected = zoomed ? state.sub === point.name : state.sido === point.name;
    const group = svgEl('g', { class: `map__badge${selected ? ' is-selected' : ''}` });
    group.appendChild(
      svgEl('circle', {
        cx: point.x,
        cy: point.y,
        r: BADGE_RADIUS * scale,
        class: 'map__badge-bg',
      })
    );
    const text = svgEl('text', {
      x: point.x,
      y: point.y,
      class: 'map__badge-num',
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
      'font-size': 13 * scale,
    });
    text.textContent = String(meta.get(point.name).count);
    group.appendChild(text);
    dom.layers.badges.appendChild(group);
  }

  for (const [name, info] of meta) {
    const size = renderedSize(info.bb, viewBox, px);
    if (!size) continue;

    // 렌더 폭 40px 미만 또는 높이 28px 미만이면 지역명을 숨긴다 (§6-2)
    if (!shouldHideRegionLabel(size.width, size.height)) {
      const label = svgEl('text', {
        x: info.center[0],
        y: info.center[1] + BADGE_RADIUS * scale * 1.6,
        class: 'map__name',
        'text-anchor': 'middle',
        'font-size': 12 * scale,
      });
      label.textContent = name;
      dom.layers.labels.appendChild(label);
    }

    // 소형 지역 투명 원 히트영역 44px (§6-2)
    if (size.width < HIT_TARGET || size.height < HIT_TARGET) {
      const hit = svgEl('circle', {
        cx: info.center[0],
        cy: info.center[1],
        r: (HIT_TARGET / 2) * scale,
        class: 'map__hit',
      });
      hit.dataset.name = name;
      hit.dataset.scope = scope;
      if (info.count === 0) hit.setAttribute('aria-disabled', 'true');
      dom.layers.hits.appendChild(hit);
    }
  }
}

/* ------------------------------ 칩·범례·경로 ------------------------------ */

function chipButton(label, count, { selected, disabled }) {
  const chip = el('button', `map__chip${selected ? ' is-selected' : ''}`);
  chip.type = 'button';
  chip.appendChild(el('span', '', label));
  chip.appendChild(el('span', 'map__chip-count', String(count)));
  chip.setAttribute('aria-pressed', String(selected));
  if (disabled) {
    chip.setAttribute('aria-disabled', 'true');
    chip.setAttribute('tabindex', '-1');
    chip.classList.add('is-empty');
  }
  return chip;
}

function renderChips(counts) {
  const host = dom.chips;
  clear(host);
  for (const feature of data.map.prov) {
    const count = provCount(counts, feature.name);
    const chip = chipButton(feature.name, count, {
      selected: state.sido === feature.name,
      disabled: count === 0,
    });
    chip.dataset.name = feature.name;
    chip.setAttribute(
      'aria-label',
      count === 0
        ? `${feature.name}, ${MAP.emptyRegion}`
        : `${feature.name} 병원 ${count}곳`
    );
    host.appendChild(chip);
  }
}

function renderSubChips(counts) {
  const host = dom.subChips;
  if (!host) return;
  const zoomed = ZOOM_SIDO.includes(state.sido);
  clear(host);
  host.hidden = !zoomed;
  if (!zoomed) return;

  const features = data.map[state.sido === '서울' ? 'seoul' : 'gg'] ?? [];
  for (const feature of features) {
    const count = subCount(counts, state.sido, feature.name);
    const chip = chipButton(feature.name, count, {
      selected: state.sub === feature.name,
      disabled: count === 0,
    });
    chip.dataset.name = feature.name;
    chip.dataset.scope = 'sub';
    host.appendChild(chip);
  }
}

/** 범례는 SVG 밖 한 줄이고, 확대 시 구·시 기준으로 교체된다 (§6-2) */
function renderLegend() {
  const host = dom.legend;
  if (!host) return;
  const zoomed = ZOOM_SIDO.includes(state.sido);
  const labels = zoomed ? MAP.legendSub.slice(1) : MAP.legend.slice(0, 4);
  const tiers = ['none', 'low', 'mid', 'high'];
  clear(host);

  const item = (tier, label) => {
    const li = el('li');
    const swatch = el('span', `map__swatch map__swatch--${tier}`);
    swatch.setAttribute('aria-hidden', 'true');
    li.appendChild(swatch);
    li.appendChild(el('span', '', label));
    host.appendChild(li);
  };

  if (zoomed) host.appendChild(el('li', 'map__legend-scope', MAP.legendSub[0]));
  labels.forEach((label, index) => item(tiers[index], label));
  item('selected', MAP.legend[4]);
}

/** 경로 표시 — 각 단계 클릭 가능 (§6-2) */
function renderPath() {
  const host = dom.path;
  if (!host) return;
  clear(host);
  const steps = breadcrumbOf(state);
  host.hidden = steps.length < 2;
  steps.forEach((step, index) => {
    if (index > 0) {
      const sep = el('span', 'map__path-sep', '›');
      sep.setAttribute('aria-hidden', 'true');
      host.appendChild(sep);
    }
    const button = el('button', 'map__path-step', step.label);
    button.type = 'button';
    button.dataset.step = step.key;
    if (index === steps.length - 1) button.setAttribute('aria-current', 'true');
    host.appendChild(button);
  });
}

function renderInset() {
  const inset = dom.inset;
  if (!inset) return;
  inset.hidden = !ZOOM_SIDO.includes(state.sido);
}

function renderGuide(counts) {
  if (!dom.guide) return;
  const count = state.sub
    ? subCount(counts, state.sido, state.sub)
    : state.sido
      ? provCount(counts, state.sido)
      : 0;
  dom.guide.textContent = guideTextOf(state, count);
  if (dom.announce) {
    const full = state.sido ? sidoByShort(state.sido)?.full ?? state.sido : null;
    dom.announce.textContent = full ? `${full} 선택, ${count}곳 표시` : '';
  }
}

function render() {
  if (!data || !dom?.svg) return;
  const counts = countsFor();
  const zoomed = ZOOM_SIDO.includes(state.sido);
  paintProvLayer(counts);
  paintSubLayer(counts);
  paintHatch(zoomed ? 'sub' : 'prov', counts);
  applyZoom();
  paintOverlays(counts);
  renderChips(counts);
  renderSubChips(counts);
  renderLegend();
  renderPath();
  renderInset();
  renderGuide(counts);
}

/* ------------------------------ 확대 전환 ------------------------------ */

function targetViewBox() {
  if (!ZOOM_SIDO.includes(state.sido)) return [0, 0, data.map.W, data.map.H];
  const feature = data.map.prov.find((item) => item.name === state.sido);
  if (!feature) return [0, 0, data.map.W, data.map.H];
  return viewBoxForBounds(feature.bb, pixelSize());
}

const sameBox = (a, b) => a && b && a.every((value, index) => Math.abs(value - b[index]) < 0.5);

function setViewBox(box) {
  viewBox = box;
  dom.svg.setAttribute('viewBox', box.map((value) => Math.round(value * 100) / 100).join(' '));
}

/**
 * viewBox 보간 600ms easeInOut — reduced-motion 은 0ms.
 * 애니메이션 중 입력이 오면 **현재 viewBox 에서** 목표를 다시 잡는다 (§6-2).
 */
function applyZoom() {
  const target = targetViewBox();
  if (zoomAnim && sameBox(zoomAnim.to, target)) return;
  if (sameBox(viewBox, target)) {
    zoomAnim = null;
    return;
  }

  if (zoomFrame) cancelAnimationFrame(zoomFrame);
  if (prefersReduced() || typeof requestAnimationFrame !== 'function') {
    zoomAnim = null;
    setViewBox(target);
    return;
  }

  const from = viewBox.slice();
  zoomAnim = { to: target };
  let start = null;
  const step = (now) => {
    if (start === null) start = now;
    const t = Math.min((now - start) / ZOOM_MS, 1);
    setViewBox(lerpViewBox(from, target, t));
    if (t < 1) {
      zoomFrame = requestAnimationFrame(step);
    } else {
      zoomFrame = 0;
      zoomAnim = null;
      paintOverlays(countsFor());
    }
  };
  zoomFrame = requestAnimationFrame(step);
}

/* ------------------------------ 입력 ------------------------------ */

function selectSido(name, source) {
  const count = provCount(countsFor(), name);
  if (count === 0) return;
  roving = name;
  const willClear = state.sido === name;
  dispatch({ type: ACTIONS.SELECT_SIDO, sido: name }, source);
  track(willClear ? TRACK_EVENTS.MAP_RESET : TRACK_EVENTS.MAP_REGION_SELECT,
    willClear ? {} : { region: name, source });
}

function selectSub(name, source) {
  if (!state.sido) return;
  if (subCount(countsFor(), state.sido, name) === 0) return;
  const willClear = state.sub === name;
  dispatch({ type: ACTIONS.SELECT_SUB, sub: name }, source);
  if (!willClear) {
    track(TRACK_EVENTS.MAP_SUBREGION_SELECT, { region: state.sido, subregion: name });
  }
}

function resetAll() {
  dispatch({ type: ACTIONS.RESET }, 'map');
  track(TRACK_EVENTS.MAP_RESET);
}

function showTooltip(target) {
  if (!tooltipAllowed || !dom.tooltip) return;
  const label = target.getAttribute('aria-label');
  if (!label) return;
  dom.tooltip.textContent = label;
  dom.tooltip.hidden = false;
  const rect = dom.canvas.getBoundingClientRect();
  const box = target.getBoundingClientRect();
  dom.tooltip.style.left = `${box.left + box.width / 2 - rect.left}px`;
  dom.tooltip.style.top = `${box.top - rect.top}px`;
}

const hideTooltip = () => {
  if (dom.tooltip) dom.tooltip.hidden = true;
};

const areaTarget = (event) => event.target?.closest?.('[data-name]') ?? null;

function bindMapEvents() {
  const svg = dom.svg;

  svg.addEventListener('click', (event) => {
    const target = areaTarget(event);
    if (!target || target.getAttribute('aria-disabled') === 'true') return;
    const scope = target.dataset.scope ?? (target.parentNode === dom.layers.sub ? 'sub' : 'prov');
    if (scope === 'sub') selectSub(target.dataset.name, 'map');
    else selectSido(target.dataset.name, 'map');
  });

  // 툴팁은 pointerType==='mouse' 에서만 (§6-2)
  svg.addEventListener('pointerover', (event) => {
    tooltipAllowed = event.pointerType === 'mouse';
    const target = areaTarget(event);
    if (target) showTooltip(target);
  });
  svg.addEventListener('pointerout', hideTooltip);
  svg.addEventListener('pointerdown', (event) => {
    tooltipAllowed = event.pointerType === 'mouse';
    if (!tooltipAllowed) hideTooltip();
  });

  svg.addEventListener('keydown', (event) => {
    const target = areaTarget(event);
    if (!target || target.parentNode !== dom.layers.prov) return;
    const key = event.key;

    if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
      event.preventDefault();
      selectSido(target.dataset.name, 'map');
      return;
    }
    if (key === 'Escape') {
      event.preventDefault();
      resetAll();
      return;
    }
    if (!handlesKey(key)) return;

    event.preventDefault();
    const counts = countsFor();
    const features = data.map.prov.filter((item) => provCount(counts, item.name) > 0);
    const next = nextByKey(features, target.dataset.name, key);
    if (!next) return;
    roving = next;
    for (const path of dom.layers.prov.children) {
      if (path.getAttribute('aria-disabled') === 'true') continue;
      path.setAttribute('tabindex', path.dataset.name === next ? '0' : '-1');
    }
    dom.layers.prov.querySelector(`[data-name="${next}"]`)?.focus?.();
  });

  svg.addEventListener('focusout', hideTooltip);
}

function bindChrome() {
  dom.chips.addEventListener('click', (event) => {
    const chip = event.target.closest('.map__chip');
    if (!chip || chip.getAttribute('aria-disabled') === 'true') return;
    selectSido(chip.dataset.name, 'chip');
  });

  dom.subChips?.addEventListener('click', (event) => {
    const chip = event.target.closest('.map__chip');
    if (!chip || chip.getAttribute('aria-disabled') === 'true') return;
    selectSub(chip.dataset.name, 'chip');
  });

  dom.path?.addEventListener('click', (event) => {
    const step = event.target.closest('.map__path-step');
    if (!step) return;
    if (step.dataset.step === 'all') resetAll();
    else if (step.dataset.step === 'sido' && state.sub) selectSub(state.sub, 'chip');
  });

  dom.inset?.addEventListener('click', resetAll);
}

/* ------------------------------ 데이터 로드 ------------------------------ */

async function fetchJson(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`load failed: ${path}`);
  return response.json();
}

/** map.json · clinics.json 동시 로드 — 결과는 한 번만 받아 캐시한다 */
export function loadMapData() {
  if (!dataPromise) {
    dataPromise = Promise.all([fetchJson('data/map.json'), fetchJson('data/clinics.json')])
      .then(([mapJson, clinics]) => ({ map: mapJson, clinics }))
      .catch((error) => {
        dataPromise = null;
        throw error;
      });
  }
  return dataPromise;
}

/** 지도 로드 실패 — §6-5 문구 + '다시 시도' */
function showError(attempt) {
  clearCanvas();
  const box = el('div', 'map__error');
  box.setAttribute('role', 'alert');
  box.appendChild(el('p', '', MAP.loadError));
  if (attempt < RETRY_LIMIT) {
    const retry = el('button', 'map__retry', MAP.loadRetry);
    retry.type = 'button';
    retry.addEventListener('click', () => start(attempt + 1), { once: true });
    box.appendChild(retry);
  }
  dom.canvas.appendChild(box);
  track(TRACK_EVENTS.MAP_ERROR, { reason: 'map' });
}

async function start(attempt = 0) {
  dom.canvas.setAttribute('aria-busy', 'true');
  try {
    data = await loadMapData();
    dom.canvas.removeAttribute('aria-busy');
    buildMap();
    render();
  } catch {
    dom.canvas.removeAttribute('aria-busy');
    data = null;
    showError(attempt);
  }
}

/** 데이터 로드 1회 — 섹션 접근·CTA 클릭·해시 `map=` 중 먼저 온 것이 깨운다 (§6-4) */
function kick() {
  if (started || !dom) return;
  started = true;
  start(0);
}

/* ------------------------------ 진입점 ------------------------------ */

/**
 * 지도 배선 — main.js 가 호출한다.
 * 섹션이 가까워질 때(rootMargin 400px) 또는 CTA 클릭 시 데이터를 불러온다 (§6-4).
 */
export function initMap() {
  const canvas = document.querySelector('[data-role="map-canvas"]');
  const chips = document.querySelector('[data-role="region-chips"]');
  if (!canvas || !chips) return;

  dom = {
    section: document.getElementById('hospital-map'),
    canvas,
    chips,
    subChips: document.querySelector('[data-role="sub-chips"]'),
    legend: document.querySelector('[data-role="map-legend"]'),
    guide: document.querySelector('[data-role="map-guide"]'),
    path: document.querySelector('[data-role="map-path"]'),
    inset: document.querySelector('[data-role="map-inset"]'),
  };

  bindChrome();
  if (dom.inset) dom.inset.hidden = true;
  if (dom.path) dom.path.hidden = true;

  for (const button of document.querySelectorAll('[data-cta-position]')) {
    button.addEventListener('click', kick);
  }

  if (typeof IntersectionObserver === 'function' && dom.section) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.disconnect();
          kick();
        }
      },
      { rootMargin: '400px' }
    );
    observer.observe(dom.section);
  } else {
    kick();
  }

  let resizeTimer = 0;
  window.addEventListener(
    'resize',
    () => {
      if (!data || !dom.svg) return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        viewBox = targetViewBox();
        setViewBox(viewBox);
        paintOverlays(countsFor());
      }, 150);
    },
    { passive: true }
  );
}

/** 현재 상태 사본 — 리스트(DEV-3C)가 첫 렌더에서 쓰려고 읽는다 */
export function currentState() {
  return { ...state };
}

/**
 * 리스트·검색(js/list.js)이 보내는 상태 변경.
 * 지도와 같은 reducer 를 통과하므로 상태가 두 곳으로 갈라지지 않는다.
 */
export function applyAction(action, source = 'list') {
  dispatch(action, source);
}

/**
 * 검색 결과를 지도에 전달한다 — 칩·지도 배지 숫자를 결과 기준으로 즉시 갱신한다 (§6-3).
 * `null` 이면 전체 기준으로 돌아간다.
 */
export function setSearchResults(clinics) {
  const next = Array.isArray(clinics) ? clinics : null;
  if (next === results) return;
  results = next;
  render();
}

/** 리스트 카드 hover·focus-within 시 지도 강조 — PC 한정 (§6-4) */
export function highlightRegion(name) {
  const layer = ZOOM_SIDO.includes(state.sido) ? dom?.layers?.sub : dom?.layers?.prov;
  if (!layer) return;
  for (const node of layer.querySelectorAll('.is-hover')) node.classList.remove('is-hover');
  if (!name) return;
  for (const node of layer.querySelectorAll('[data-name]')) {
    if (node.dataset.name === name) node.classList.add('is-hover');
  }
}

/** 해시에 지도 상태가 있을 때 리스트가 즉시 로드를 요청한다 (§6-4) */
export function requestMapData() {
  kick();
}
