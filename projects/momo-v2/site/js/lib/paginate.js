/**
 * 페이지 계산 — V2_BUILD_SPEC §6-4
 * DOM 을 쓰지 않는 순수 모듈이다. 모바일 리스트의 '더 보기 · N곳 남음' 과
 * 시·도 sticky 그룹 헤더가 쓰는 묶음을 여기서 계산한다.
 */

/** 20곳 단위 — §6-4 확정 상수 */
export const PAGE_SIZE = 20;

/** visible 초기값 */
export const INITIAL_VISIBLE = PAGE_SIZE;

const clampVisible = (visible) => {
  const value = Number(visible);
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value);
};

/**
 * 보이는 구간과 남은 수.
 * `remaining` 이 '더 보기 · {N}곳 남음' 의 N 이고, `hasMore` 가 버튼 노출 여부다.
 */
export function paginate(items, visible = INITIAL_VISIBLE) {
  const all = Array.isArray(items) ? items : [];
  const limit = Math.min(clampVisible(visible), all.length);
  return {
    items: all.slice(0, limit),
    shown: limit,
    total: all.length,
    remaining: all.length - limit,
    hasMore: limit < all.length,
  };
}

/** '더 보기' 1회 후의 visible — 전체 수를 넘지 않는다 */
export function nextVisible(visible, total) {
  const cap = clampVisible(total);
  return Math.min(clampVisible(visible) + PAGE_SIZE, cap);
}

/**
 * '더 보기' 후 포커스를 옮길 새 첫 카드의 인덱스(§6-4).
 * 더 볼 것이 없으면 null.
 */
export function firstNewIndex(visible, total) {
  const shown = Math.min(clampVisible(visible), clampVisible(total));
  return shown < clampVisible(total) ? shown : null;
}

/**
 * 시·도 그룹 묶음 — 입력 순서(정렬 결과)를 그대로 보존한다.
 * 같은 시·도가 떨어져 나타나면 하나로 합치지 않는다. 정렬이 시·도를 모아 주는 것이
 * sort.js 의 책임이고, 여기서 다시 모으면 정렬 결과를 조용히 바꾸게 된다.
 */
export function groupBySido(items) {
  const groups = [];
  for (const item of Array.isArray(items) ? items : []) {
    const sido = item?.sido ?? '';
    const last = groups[groups.length - 1];
    if (last && last.sido === sido) last.items.push(item);
    else groups.push({ sido, items: [item] });
  }
  return groups;
}

/** 보이는 구간만 시·도 그룹으로 묶은 결과 */
export function paginateGrouped(items, visible = INITIAL_VISIBLE) {
  const page = paginate(items, visible);
  return { ...page, groups: groupBySido(page.items) };
}
