/**
 * 문자열 정규화 — V2_BUILD_SPEC §6-3
 * DOM 을 쓰지 않는 순수 모듈이다. 검색·하이라이트가 같은 규칙을 쓰도록 여기 한 곳에 모은다.
 *
 * 규칙: NFC → 소문자 → 공백·하이픈 제거.
 * 하이라이트는 원문 오프셋이 필요하므로 정규화 결과와 함께 "정규화 인덱스 → 원문 인덱스"
 * 대응표(map)를 돌려주는 변형을 둔다. NFC 는 문자 단위로 적용한다 —
 * 문자열 전체에 걸면 결합 문자가 합쳐져 원문 오프셋이 어긋난다.
 */

/**
 * 제거 대상: 모든 공백류 + 하이픈 계열.
 * U+002D 하이픈, U+00AD soft hyphen, U+2010~U+2015 대시, U+2212 마이너스,
 * U+FE58·U+FE63 small/compat 하이픈, U+FF0D 전각 하이픈.
 */
const DROPPED = /[-­‐-―−﹘﹣－\s]/u;

const HANGUL_BASE = 0xac00;
const HANGUL_LAST = 0xd7a3;
const JUNG_JONG = 21 * 28;

/** 현대 한글 초성 19자 (조합형 자모 순서) */
export const CHOSEONG = Object.freeze([
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
]);

const CHOSEONG_SET = new Set(CHOSEONG);

/** 정규화 + 원문 인덱스 대응표 */
export function normalizeWithMap(value) {
  const source = String(value ?? '');
  let text = '';
  const map = [];

  let index = 0;
  for (const char of source) {
    const width = char.length;
    if (!DROPPED.test(char)) {
      for (const out of char.normalize('NFC').toLowerCase()) {
        text += out;
        map.push(index);
      }
    }
    index += width;
  }

  return { text, map };
}

/** 정규화된 문자열만 필요할 때 */
export function normalize(value) {
  return normalizeWithMap(value).text;
}

/** 단일 문자가 초성 자모인가 */
export function isChoseongChar(char) {
  return CHOSEONG_SET.has(char);
}

/** 음절 → 초성 자모. 한글 음절이 아니면 null */
export function choseongOf(char) {
  const code = String(char ?? '').codePointAt(0);
  if (code === undefined || code < HANGUL_BASE || code > HANGUL_LAST) return null;
  return CHOSEONG[Math.floor((code - HANGUL_BASE) / JUNG_JONG)];
}

/**
 * 질의가 "전부 초성"인가 — 초성 검색을 켜는 조건(§6-3).
 * 빈 문자열은 false.
 */
export function isAllChoseong(value) {
  const text = normalize(value);
  if (text.length === 0) return false;
  return [...text].every(isChoseongChar);
}

/**
 * 원문의 한글 음절만 초성으로 바꾼 문자열 + 원문 인덱스 대응표.
 * 한글이 아닌 문자는 초성 열에 넣지 않는다 — 초성 질의와 섞이면 오탐이 된다.
 */
export function choseongWithMap(value) {
  const source = String(value ?? '');
  let text = '';
  const map = [];

  let index = 0;
  for (const char of source) {
    const width = char.length;
    const cho = choseongOf(char.normalize('NFC'));
    if (cho) {
      text += cho;
      map.push(index);
    }
    index += width;
  }

  return { text, map };
}
