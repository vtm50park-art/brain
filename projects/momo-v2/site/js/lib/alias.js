/**
 * 시·도 약칭 별칭표 (17개) — V2_BUILD_SPEC §6-3
 * DOM·데이터 로드를 쓰지 않는 순수 모듈이다.
 *
 * `short` 는 `data/map.json` 의 `prov[].name` 과 `data/clinics.json` 의 `sido` 값이고,
 * `code` 는 `prov[].code` 다(해시 직렬화 기준 — §6-3).
 * `aliases` 는 검색어로 들어올 수 있는 다른 표기다.
 */

export const SIDO_ALIASES = Object.freeze([
  { code: '11', short: '서울', full: '서울특별시', aliases: ['서울시'] },
  { code: '21', short: '부산', full: '부산광역시', aliases: ['부산시'] },
  { code: '22', short: '대구', full: '대구광역시', aliases: ['대구시'] },
  { code: '23', short: '인천', full: '인천광역시', aliases: ['인천시'] },
  { code: '24', short: '광주', full: '광주광역시', aliases: ['광주시'] },
  { code: '25', short: '대전', full: '대전광역시', aliases: ['대전시'] },
  { code: '26', short: '울산', full: '울산광역시', aliases: ['울산시'] },
  { code: '29', short: '세종', full: '세종특별자치시', aliases: ['세종시'] },
  { code: '31', short: '경기', full: '경기도', aliases: [] },
  { code: '32', short: '강원', full: '강원특별자치도', aliases: ['강원도'] },
  { code: '33', short: '충북', full: '충청북도', aliases: [] },
  { code: '34', short: '충남', full: '충청남도', aliases: [] },
  { code: '35', short: '전북', full: '전북특별자치도', aliases: ['전라북도'] },
  { code: '36', short: '전남', full: '전라남도', aliases: [] },
  { code: '37', short: '경북', full: '경상북도', aliases: [] },
  { code: '38', short: '경남', full: '경상남도', aliases: [] },
  { code: '39', short: '제주', full: '제주특별자치도', aliases: ['제주도'] },
]);

const BY_SHORT = new Map(SIDO_ALIASES.map((entry) => [entry.short, entry]));
const BY_CODE = new Map(SIDO_ALIASES.map((entry) => [entry.code, entry]));

/** 약칭으로 별칭표 1줄 찾기 */
export function sidoByShort(short) {
  return BY_SHORT.get(short) ?? null;
}

/** prov code 로 별칭표 1줄 찾기 */
export function sidoByCode(code) {
  return BY_CODE.get(String(code)) ?? null;
}

/** 17개 code 안에 있는 값인가 — 해시 무효값 판정용(§6-3) */
export function isSidoCode(code) {
  return BY_CODE.has(String(code));
}

/** 17개 약칭 안에 있는 값인가 */
export function isSidoShort(short) {
  return BY_SHORT.has(short);
}

export function codeOf(short) {
  return BY_SHORT.get(short)?.code ?? null;
}

export function shortOf(code) {
  return BY_CODE.get(String(code))?.short ?? null;
}

/**
 * 한 시·도의 검색 대상 표기 전부 — 약칭 + 정식명 + 별칭.
 * 알 수 없는 값이면 받은 값 그대로 1개만 돌려준다(데이터가 늘어도 검색이 죽지 않게).
 */
export function aliasTermsOf(short) {
  const entry = BY_SHORT.get(short);
  if (!entry) return short ? [String(short)] : [];
  return [entry.short, entry.full, ...entry.aliases];
}
