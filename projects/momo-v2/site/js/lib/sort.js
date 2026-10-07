/**
 * 리스트 정렬 — V2_BUILD_SPEC §6-3 (고정 정렬)
 * DOM 을 쓰지 않는 순수 모듈이다.
 *
 * 순서: 시·도 병원 수 많은 순 → 구·시 병원 수 많은 순 → 이름(Intl.Collator('ko')) → id.
 * 건수는 "정렬하려는 목록" 기준으로 센다 — 검색·필터 결과에서도 그 결과 안의 분포를 따른다.
 */

const collator = new Intl.Collator('ko');

/**
 * 구·시 건수 Map 의 키.
 * 구분자를 공백이 아닌 글자로 둔다 — '성남시 분당구' 처럼 이름에 공백이 있는 지역과
 * 시·도+구·시 경계가 헷갈리지 않게 하고, 호출측·테스트가 키를 직접 조립하지 않게
 * 이 함수를 쓴다.
 */
export const SUB_KEY_SEPARATOR = '/';

export function subKeyOf(clinic) {
  return [clinic?.sido ?? '', clinic?.sgg ?? ''].join(SUB_KEY_SEPARATOR);
}

/** 시·도별·구시별 병원 수 */
export function groupCounts(clinics) {
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

/** 고정 정렬 비교자. counts 는 groupCounts 결과 */
export function compareClinics(a, b, counts) {
  const sidoDiff = (counts.sido.get(b?.sido ?? '') ?? 0) - (counts.sido.get(a?.sido ?? '') ?? 0);
  if (sidoDiff !== 0) return sidoDiff;

  // 건수가 같은 다른 시·도끼리는 시·도 이름으로 먼저 모아야
  // 리스트의 시·도 그룹 헤더가 쪼개지지 않는다
  if ((a?.sido ?? '') !== (b?.sido ?? '')) return collator.compare(a?.sido ?? '', b?.sido ?? '');

  const subDiff = (counts.sub.get(subKeyOf(b)) ?? 0) - (counts.sub.get(subKeyOf(a)) ?? 0);
  if (subDiff !== 0) return subDiff;

  if ((a?.sgg ?? '') !== (b?.sgg ?? '')) return collator.compare(a?.sgg ?? '', b?.sgg ?? '');

  const nameDiff = collator.compare(a?.name ?? '', b?.name ?? '');
  if (nameDiff !== 0) return nameDiff;

  return collator.compare(String(a?.id ?? ''), String(b?.id ?? ''));
}

/** 새 배열로 정렬한다 — 입력 배열은 건드리지 않는다 */
export function sortClinics(clinics, counts = null) {
  const list = Array.isArray(clinics) ? [...clinics] : [];
  const resolved = counts ?? groupCounts(list);
  return list.sort((a, b) => compareClinics(a, b, resolved));
}
