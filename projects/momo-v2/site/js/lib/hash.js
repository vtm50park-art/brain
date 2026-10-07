/**
 * URL 해시 직렬화·파싱 — V2_BUILD_SPEC §6-3
 * 형식: `#map=<sido code>&sub=<name>&q=<query>`
 * DOM·location 을 쓰지 않는 순수 모듈이다. pushState/replaceState 는 js/map.js 가 한다.
 *
 * 무효값은 조용히 버린다 — 해시는 사용자가 손으로 고칠 수 있는 입력이고,
 * 잘못된 값 하나로 지도가 빈 화면이 되면 안 된다.
 */

import { codeOf, shortOf, isSidoCode } from './alias.js';

/** 검색어 replaceState 디바운스 — §6-3 */
export const QUERY_DEBOUNCE = 250;

const decode = (value) => {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    // 깨진 퍼센트 인코딩 — 무효값으로 본다
    return '';
  }
};

/**
 * 해시 → `{ sido, sub, q }` (sido 는 약칭, 없으면 null).
 * `map` 이 17개 code 가 아니면 sido·sub 둘 다 버린다.
 */
export function parseHash(hash) {
  const raw = String(hash ?? '').replace(/^#/, '');
  const out = { sido: null, sub: null, q: '' };
  if (raw.length === 0) return out;

  const params = new Map();
  for (const chunk of raw.split('&')) {
    if (chunk.length === 0) continue;
    const at = chunk.indexOf('=');
    const key = at === -1 ? chunk : chunk.slice(0, at);
    const value = at === -1 ? '' : chunk.slice(at + 1);
    if (!params.has(key)) params.set(key, value);
  }

  const code = decode(params.get('map') ?? '').trim();
  if (isSidoCode(code)) {
    out.sido = shortOf(code);
    const sub = decode(params.get('sub') ?? '').trim();
    if (sub.length > 0) out.sub = sub;
  }

  const q = decode(params.get('q') ?? '');
  if (q.trim().length > 0) out.q = q;

  return out;
}

/**
 * `{ sido, sub, q }` → 해시 문자열.
 * 빈 상태는 `''` — 해시를 지운다는 뜻이다. 시·도가 없으면 sub 은 쓰지 않는다.
 */
export function serializeHash({ sido = null, sub = null, q = '' } = {}) {
  const parts = [];
  const code = sido ? codeOf(sido) : null;

  if (code) {
    parts.push(`map=${code}`);
    if (typeof sub === 'string' && sub.length > 0) {
      parts.push(`sub=${encodeURIComponent(sub)}`);
    }
  }

  if (typeof q === 'string' && q.trim().length > 0) {
    parts.push(`q=${encodeURIComponent(q)}`);
  }

  return parts.length === 0 ? '' : `#${parts.join('&')}`;
}

/** 해시가 지도 상태를 담고 있는가 — 로드 시 즉시 데이터를 가져올 조건(§6-4) */
export function hasMapHash(hash) {
  const parsed = parseHash(hash);
  return parsed.sido !== null || parsed.q.length > 0;
}
