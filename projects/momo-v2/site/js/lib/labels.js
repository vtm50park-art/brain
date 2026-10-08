/**
 * 지역명 배치 — V2_BUILD_SPEC §6-2 (DEV-4B REWORK)
 *
 * 지역명을 경계 중심에 그대로 놓으면 숫자 배지를 가린다. 이 모듈은 배치된 배지
 * 위치를 기준으로 아래 → 위 → 오른쪽 → 왼쪽 순으로 후보 자리를 시도해서 배지 원과도,
 * 이미 놓인 지역명 상자와도 겹치지 않고 지도 경계 안에 들어오는 첫 자리를 고른다.
 *
 * DOM·난수·시간을 쓰지 않는 순수 함수다(tests/labels.test.mjs 가 직접 검사한다).
 * 배지 배치(`placeBadges`)와 배지 크기는 건드리지 않는다 — 입력으로만 받는다.
 */

/** 지역명 12/600 (§6-2) */
export const LABEL_FONT_SIZE = 12;

/** 글자 상자 — 폭 = 글자 수 × 글자 크기 × 1.05, 높이 = 글자 크기 × 1.3 */
export const LABEL_WIDTH_RATIO = 1.05;
export const LABEL_HEIGHT_RATIO = 1.3;

/** 후보 자리 순서 — 아래 → 위 → 오른쪽 → 왼쪽 */
export const PLACEMENTS = Object.freeze(['below', 'above', 'right', 'left']);

/** 접하는 자리는 겹침이 아니다 — 부동소수 오차만 흡수한다 */
const EPSILON = 1e-6;

/** 좌표를 2자리로 끊어도 판정이 뒤집히지 않게, 판정 전에 먼저 끊는다 */
const round2 = (value) => Math.round(value * 100) / 100;

/** 경계 밖 자리는 교차가 많은 자리보다 더 나쁘다(선택 지역 차선책 점수) */
const OUT_OF_BOUNDS_PENALTY = 1000;

const collator = new Intl.Collator('ko');

/** 지역명 글자 상자 크기 (§6-2) */
export function labelSize(name, fontSize = LABEL_FONT_SIZE) {
  const chars = [...String(name ?? '')].length;
  return {
    width: chars * fontSize * LABEL_WIDTH_RATIO,
    height: fontSize * LABEL_HEIGHT_RATIO,
  };
}

/** 원과 사각형의 최단 거리 < 반지름 이면 교차다 */
export function rectCircleIntersects(rect, circle, radius) {
  const dx = Math.max(0, Math.abs(circle.x - rect.x) - rect.width / 2);
  const dy = Math.max(0, Math.abs(circle.y - rect.y) - rect.height / 2);
  return Math.sqrt(dx * dx + dy * dy) < radius - EPSILON;
}

/** 두 글자 상자가 겹치는가 */
export function rectsOverlap(a, b) {
  return (
    Math.abs(a.x - b.x) < (a.width + b.width) / 2 - EPSILON &&
    Math.abs(a.y - b.y) < (a.height + b.height) / 2 - EPSILON
  );
}

/**
 * 경계 사각형 안인가 — `bounds` 는 `{width, height}`(원점 0,0) 또는
 * `{x, y, width, height}`(현재 viewBox 사각형)다. 확대 중에는 지도 전체가 아니라
 * 보이는 viewBox 가 경계여야 지역명이 화면 밖으로 나가지 않는다 (§6-2).
 */
function insideBounds(rect, bounds) {
  if (!bounds) return true;
  const width = Number(bounds.width);
  const height = Number(bounds.height);
  if (!(width > 0) || !(height > 0)) return true;
  const minX = Number.isFinite(Number(bounds.x)) ? Number(bounds.x) : 0;
  const minY = Number.isFinite(Number(bounds.y)) ? Number(bounds.y) : 0;
  return (
    rect.x - rect.width / 2 >= minX - EPSILON &&
    rect.x + rect.width / 2 <= minX + width + EPSILON &&
    rect.y - rect.height / 2 >= minY - EPSILON &&
    rect.y + rect.height / 2 <= minY + height + EPSILON
  );
}

/** 배지 기준 후보 자리의 글자 상자 중심 */
function candidateRect(placement, badge, size, radius, gap) {
  const offsetX = radius + gap + size.width / 2;
  const offsetY = radius + gap + size.height / 2;
  let x = badge.x;
  let y = badge.y;
  if (placement === 'below') y = badge.y + offsetY;
  else if (placement === 'above') y = badge.y - offsetY;
  else if (placement === 'right') x = badge.x + offsetX;
  else x = badge.x - offsetX;
  return { x: round2(x), y: round2(y), width: size.width, height: size.height };
}

/**
 * 처리 순서 — 선택 지역 먼저, 그다음 병원 수 많은 순, 같으면 이름순 (§6-2)
 * 병원 0곳 지역은 이름을 그리지 않으므로 여기서 떨어진다.
 */
export function labelOrder(regions) {
  return (Array.isArray(regions) ? regions : [])
    .filter((region) => Number(region?.count) > 0)
    .map((region) => ({
      name: region.name,
      count: Number(region.count),
      selected: Boolean(region.selected),
    }))
    .sort((a, b) => {
      if (a.selected !== b.selected) return a.selected ? -1 : 1;
      if (b.count !== a.count) return b.count - a.count;
      return collator.compare(a.name, b.name);
    });
}

/**
 * 지역명 배치 (§6-2)
 *
 * @param {Array<{name: string, x: number, y: number}>} badges `placeBadges` 결과
 * @param {Array<{name: string, count: number, selected?: boolean}>} regions 병원이 있는 지역만
 * @param {{radius?: number, fontSize?: number, gap?: number, bounds?: {x?: number, y?: number, width: number, height: number}}} options
 * @returns {Array<{name, x, y, width, height, placement, crossings}>} 놓인 지역명만 — 자리가 없으면 숨긴다
 */
export function placeRegionLabels(badges, regions, options = {}) {
  const radius = Number(options.radius ?? 12);
  const fontSize = Number(options.fontSize ?? LABEL_FONT_SIZE);
  const gap = Number(options.gap ?? radius * 0.2);
  const bounds = options.bounds ?? null;

  const byName = new Map();
  for (const badge of Array.isArray(badges) ? badges : []) {
    if (Number.isFinite(badge?.x) && Number.isFinite(badge?.y)) byName.set(badge.name, badge);
  }
  const circles = [...byName.values()];

  const placed = [];
  for (const region of labelOrder(regions)) {
    const badge = byName.get(region.name);
    if (!badge) continue;
    const size = labelSize(region.name, fontSize);

    let best = null;
    for (const placement of PLACEMENTS) {
      const rect = candidateRect(placement, badge, size, radius, gap);
      let crossings = 0;
      for (const circle of circles) {
        if (rectCircleIntersects(rect, circle, radius)) crossings += 1;
      }
      for (const other of placed) {
        if (rectsOverlap(rect, other)) crossings += 1;
      }
      const inside = insideBounds(rect, bounds);
      if (crossings === 0 && inside) {
        best = { rect, placement, crossings, score: 0 };
        break;
      }
      // 선택 지역 이름은 항상 표시한다 — 겹치지 않는 자리가 없으면 교차가 가장 적은 자리
      if (!region.selected) continue;
      const score = crossings + (inside ? 0 : OUT_OF_BOUNDS_PENALTY);
      if (!best || score < best.score) best = { rect, placement, crossings, score };
    }

    // 놓을 자리가 없으면 숨긴다 (선택 지역은 차선책이 있으므로 여기 오지 않는다)
    if (!best) continue;
    placed.push({
      name: region.name,
      x: best.rect.x,
      y: best.rect.y,
      width: best.rect.width,
      height: best.rect.height,
      placement: best.placement,
      crossings: best.crossings,
    });
  }
  return placed;
}

/** 배치 결과의 교차 쌍 수 — 지역명↔배지 원, 지역명↔지역명 (0 이어야 한다) */
export function labelCrossings(labels, badges, options = {}) {
  const radius = Number(options.radius ?? 12);
  const list = Array.isArray(labels) ? labels : [];
  const circles = (Array.isArray(badges) ? badges : []).filter(
    (badge) => Number.isFinite(badge?.x) && Number.isFinite(badge?.y)
  );

  let badgeHits = 0;
  for (const label of list) {
    for (const circle of circles) {
      if (rectCircleIntersects(label, circle, radius)) badgeHits += 1;
    }
  }

  let labelHits = 0;
  for (let a = 0; a < list.length; a += 1) {
    for (let b = a + 1; b < list.length; b += 1) {
      if (rectsOverlap(list[a], list[b])) labelHits += 1;
    }
  }

  return { badge: badgeHits, label: labelHits, total: badgeHits + labelHits };
}
