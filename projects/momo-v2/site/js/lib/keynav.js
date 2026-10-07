/**
 * 지도 키보드 이동 — V2_BUILD_SPEC §6-2
 * DOM·이벤트를 쓰지 않는 순수 모듈이다. 방향키는 bb 중심 기준 최근접 지역으로 옮긴다.
 *
 * feature 는 `map.json` 의 모양을 따른다: `{ name, bb: [x1, y1, x2, y2] }`.
 * 호출측은 **이동 가능한 지역만** 넘긴다 — 병원 0곳인 7개 시·도는 탭 순서에서 빠지므로
 * 여기까지 오지 않는다(§6-2).
 */

const collator = new Intl.Collator('ko');

/** 방향축을 벗어난 거리에 주는 가중치. 1보다 크면 "같은 줄"을 먼저 고른다 */
const CROSS_PENALTY = 2;

export const DIRECTION_KEYS = Object.freeze({
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
});

/** bb → 중심 [cx, cy] */
export function centerOf(bb) {
  if (!Array.isArray(bb) || bb.length !== 4) return null;
  const [x1, y1, x2, y2] = bb;
  if (![x1, y1, x2, y2].every((v) => typeof v === 'number' && Number.isFinite(v))) return null;
  return [(x1 + x2) / 2, (y1 + y2) / 2];
}

const findFeature = (features, name) => features.find((f) => f?.name === name) ?? null;

/**
 * 방향키 1회 이동 결과 이름. 그 방향에 후보가 없으면 null(제자리).
 * 후보는 "중심이 그 방향으로 실제로 떨어져 있는" 지역만이다.
 */
export function nextByDirection(features, currentName, direction) {
  const list = Array.isArray(features) ? features : [];
  const current = findFeature(list, currentName);
  const from = centerOf(current?.bb);
  if (!from) return null;

  const [cx, cy] = from;
  let best = null;

  for (const feature of list) {
    if (feature === current || feature?.name === currentName) continue;
    const to = centerOf(feature?.bb);
    if (!to) continue;

    const dx = to[0] - cx;
    const dy = to[1] - cy;

    let along = 0;
    let cross = 0;
    if (direction === 'left') {
      if (dx >= 0) continue;
      along = -dx;
      cross = Math.abs(dy);
    } else if (direction === 'right') {
      if (dx <= 0) continue;
      along = dx;
      cross = Math.abs(dy);
    } else if (direction === 'up') {
      if (dy >= 0) continue;
      along = -dy;
      cross = Math.abs(dx);
    } else if (direction === 'down') {
      if (dy <= 0) continue;
      along = dy;
      cross = Math.abs(dx);
    } else {
      return null;
    }

    const score = along + CROSS_PENALTY * cross;
    if (best === null || score < best.score || (score === best.score && collator.compare(feature.name, best.name) < 0)) {
      best = { name: feature.name, score };
    }
  }

  return best?.name ?? null;
}

/**
 * 키 1회 처리 — 이동할 이름 또는 null.
 * Home = 첫 지역, End = 마지막 지역(지도 순서 = 받은 배열 순서).
 * 현재 지역이 없으면 방향키도 첫 지역으로 들어간다.
 */
export function nextByKey(features, currentName, key) {
  const list = (Array.isArray(features) ? features : []).filter((f) => centerOf(f?.bb));
  if (list.length === 0) return null;

  if (key === 'Home') return list[0].name;
  if (key === 'End') return list[list.length - 1].name;

  const direction = DIRECTION_KEYS[key];
  if (!direction) return null;

  if (!findFeature(list, currentName)) return list[0].name;
  return nextByDirection(list, currentName, direction);
}

/** 이 키를 지도가 처리하는가 — preventDefault 판정용 */
export function handlesKey(key) {
  return key === 'Home' || key === 'End' || key in DIRECTION_KEYS;
}
