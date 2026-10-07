/**
 * 지도·리스트 상태 — V2_BUILD_SPEC §6-3
 * DOM 을 쓰지 않는 순수 reducer 다. 같은 입력이면 같은 출력이고, 바뀐 것이 없으면
 * 받은 state 객체를 그대로 돌려준다(호출측이 === 로 리렌더를 건너뛸 수 있게).
 *
 * 상태: { sido, sub, q, visible }
 * - 같은 시·도 재선택 = 해제, 같은 구·시 재선택 = 해제
 * - 시·도 변경 시 sub 초기화 + visible 리셋
 * - 검색어 변경 시 visible 리셋
 */

import { INITIAL_VISIBLE } from './paginate.js';
import { isSidoShort } from './alias.js';

export const ACTIONS = Object.freeze({
  SELECT_SIDO: 'selectSido',
  SELECT_SUB: 'selectSub',
  SET_QUERY: 'setQuery',
  SHOW_MORE: 'showMore',
  RESET: 'reset',
  HYDRATE: 'hydrate',
});

export function initialState() {
  return { sido: null, sub: null, q: '', visible: INITIAL_VISIBLE };
}

const normalizeSido = (value) => (isSidoShort(value) ? value : null);
const normalizeSub = (value) => (typeof value === 'string' && value.length > 0 ? value : null);
const normalizeQuery = (value) => (typeof value === 'string' ? value : '');

/** 순수 reducer. 알 수 없는 action 이면 state 를 그대로 돌려준다 */
export function reduce(state, action) {
  const current = state ?? initialState();
  const type = action?.type;

  switch (type) {
    case ACTIONS.SELECT_SIDO: {
      const next = normalizeSido(action.sido);
      // 같은 시·도 재선택 = 해제
      const sido = next !== null && next === current.sido ? null : next;
      if (sido === current.sido && current.sub === null && current.visible === INITIAL_VISIBLE) {
        return current;
      }
      return { ...current, sido, sub: null, visible: INITIAL_VISIBLE };
    }

    case ACTIONS.SELECT_SUB: {
      // 시·도가 없으면 구·시만으로는 의미가 없다
      if (current.sido === null) return current;
      const next = normalizeSub(action.sub);
      const sub = next !== null && next === current.sub ? null : next;
      if (sub === current.sub && current.visible === INITIAL_VISIBLE) return current;
      return { ...current, sub, visible: INITIAL_VISIBLE };
    }

    case ACTIONS.SET_QUERY: {
      const q = normalizeQuery(action.q);
      if (q === current.q && current.visible === INITIAL_VISIBLE) return current;
      return { ...current, q, visible: INITIAL_VISIBLE };
    }

    case ACTIONS.SHOW_MORE: {
      const total = Number(action.total);
      const grown = current.visible + INITIAL_VISIBLE;
      const visible = Number.isFinite(total) ? Math.min(grown, Math.max(total, 0)) : grown;
      if (visible === current.visible) return current;
      return { ...current, visible };
    }

    case ACTIONS.RESET: {
      const fresh = initialState();
      const unchanged =
        current.sido === fresh.sido &&
        current.sub === fresh.sub &&
        current.q === fresh.q &&
        current.visible === fresh.visible;
      return unchanged ? current : fresh;
    }

    case ACTIONS.HYDRATE: {
      // 해시·로드 복원 — 무효값은 버린다(§6-3)
      const source = action.state ?? {};
      const sido = normalizeSido(source.sido);
      const next = {
        sido,
        sub: sido === null ? null : normalizeSub(source.sub),
        q: normalizeQuery(source.q),
        visible: INITIAL_VISIBLE,
      };
      const unchanged =
        current.sido === next.sido &&
        current.sub === next.sub &&
        current.q === next.q &&
        current.visible === next.visible;
      return unchanged ? current : next;
    }

    default:
      return current;
  }
}

/** 조건이 하나라도 걸려 있는가 — 조건 요약 바 노출 판정(§6-3) */
export function hasFilter(state) {
  const current = state ?? initialState();
  return current.sido !== null || current.sub !== null || current.q.length > 0;
}
