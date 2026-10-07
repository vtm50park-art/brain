/**
 * 검색 — V2_BUILD_SPEC §6-3
 * DOM 을 쓰지 않는 순수 모듈이다. `<mark>` 는 js/list.js 가 createElement 로 만들고,
 * 여기서는 "원문 어디부터 어디까지"만 계산해 돌려준다.
 *
 * 규칙
 * - 정규화: NFC·소문자·공백·하이픈 제거 (normalize.js)
 * - 대상: 병원명·원장명·주소·시군구·지역라벨·시·도 약칭/정식명/별칭 (alias.js)
 * - 초성 검색: 질의가 "전부 초성"일 때만
 * - 1글자 질의: 부분일치만 (초성 검색 안 함)
 * - 시·도 필터와 AND
 */

import { normalize, normalizeWithMap, isAllChoseong, choseongWithMap } from './normalize.js';
import { aliasTermsOf } from './alias.js';
import { subKeyOf } from './sort.js';

/** 검색 대상 필드 — 순서는 하이라이트 우선순위와 무관하다 */
export const SEARCH_FIELDS = Object.freeze(['name', 'doctor', 'addr', 'sgg', 'label']);

/** 한 병원의 검색 대상 문자열 전부 */
export function searchTexts(clinic) {
  const texts = SEARCH_FIELDS.map((field) => clinic?.[field]).filter(
    (value) => typeof value === 'string' && value.length > 0
  );
  return [...texts, ...aliasTermsOf(clinic?.sido)];
}

/**
 * 질의 해석 결과.
 * `mode` 가 'choseong' 이면 초성 열에서 찾고, 'text' 면 정규화 문자열에서 찾는다.
 * 빈 질의는 `empty: true` — 필터를 걸지 않는다는 뜻이다.
 */
export function parseQuery(query) {
  const text = normalize(query);
  if (text.length === 0) return { empty: true, text: '', mode: 'text' };
  // 1글자는 부분일치만 — 초성 1자는 후보가 너무 많아 검색이 무의미해진다
  const mode = text.length > 1 && isAllChoseong(text) ? 'choseong' : 'text';
  return { empty: false, text, mode };
}

function hasMatch(source, parsed) {
  if (parsed.empty) return true;
  const { text } = parsed.mode === 'choseong' ? choseongWithMap(source) : normalizeWithMap(source);
  return text.includes(parsed.text);
}

/** 질의가 이 병원의 어느 대상 문자열에든 걸리는가 */
export function matchesQuery(clinic, query) {
  const parsed = typeof query === 'object' && query !== null ? query : parseQuery(query);
  if (parsed.empty) return true;
  return searchTexts(clinic).some((source) => hasMatch(source, parsed));
}

/**
 * 시·도 필터(AND) + 질의 필터.
 * `sido` 는 약칭(`clinics.json` 의 `sido` 값), `sub` 는 구·시 이름이다.
 */
export function filterClinics(clinics, { sido = null, sub = null, q = '' } = {}) {
  const parsed = parseQuery(q);
  return (Array.isArray(clinics) ? clinics : []).filter((clinic) => {
    if (sido && clinic?.sido !== sido) return false;
    if (sub && clinic?.sgg !== sub) return false;
    return matchesQuery(clinic, parsed);
  });
}

function mergeRanges(ranges) {
  const sorted = [...ranges].sort((a, b) => a.start - b.start || a.end - b.end);
  const merged = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end) last.end = Math.max(last.end, range.end);
    else merged.push({ ...range });
  }
  return merged;
}

/**
 * 하이라이트 구간 — **원문 오프셋** [start, end) 목록.
 * 정규화로 공백·하이픈이 사라져도 대응표로 원문 위치를 되찾는다.
 * 겹치거나 맞닿는 구간은 하나로 합친다.
 */
export function highlightRanges(original, query) {
  const parsed = typeof query === 'object' && query !== null ? query : parseQuery(query);
  if (parsed.empty) return [];

  const source = String(original ?? '');
  const { text, map } =
    parsed.mode === 'choseong' ? choseongWithMap(source) : normalizeWithMap(source);

  const needle = parsed.text;
  const found = [];
  let from = 0;
  for (;;) {
    const at = text.indexOf(needle, from);
    if (at === -1) break;
    const last = at + needle.length - 1;
    found.push({ start: map[at], end: map[last] + 1 });
    from = at + 1;
  }

  return mergeRanges(found);
}

/**
 * 하이라이트 구간을 원문 조각으로 쪼갠다 — `[{text, mark}]`.
 * list.js 는 이 배열을 돌며 mark 인 조각만 `<mark>` 로 만든다.
 */
export function highlightParts(original, query) {
  const source = String(original ?? '');
  const ranges = highlightRanges(source, query);
  if (ranges.length === 0) return source.length ? [{ text: source, mark: false }] : [];

  const parts = [];
  let cursor = 0;
  for (const { start, end } of ranges) {
    if (start > cursor) parts.push({ text: source.slice(cursor, start), mark: false });
    parts.push({ text: source.slice(start, end), mark: true });
    cursor = end;
  }
  if (cursor < source.length) parts.push({ text: source.slice(cursor), mark: false });
  return parts;
}

/**
 * 검색 결과 기준 지역별 건수 — 칩·지도 배지 숫자를 결과 기준으로 갱신할 때 쓴다(§6-3).
 * 0건 지역은 키가 없다(감쇠 판정은 호출측에서 `?? 0`).
 */
export function regionCounts(clinics) {
  const sido = new Map();
  const sub = new Map();
  for (const clinic of Array.isArray(clinics) ? clinics : []) {
    const name = clinic?.sido ?? '';
    sido.set(name, (sido.get(name) ?? 0) + 1);
    const key = subKeyOf(clinic);
    sub.set(key, (sub.get(key) ?? 0) + 1);
  }
  return { sido, sub };
}
