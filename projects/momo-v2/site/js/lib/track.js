/**
 * 측정 훅 — V2_BUILD_SPEC §6-4
 * 외부 분석도구를 쓰지 않는다. `document` 에 CustomEvent 를 쏘는 것이 전부다.
 * 개인정보 파라미터 0: 검색어 원문·전화번호·주소는 어떤 이벤트에도 담지 않는다.
 */

/** 확정 10종 (최도윤 #789 9종 + 영상 1종) */
export const TRACK_EVENTS = Object.freeze({
  MAP_REGION_SELECT: 'map_region_select',
  MAP_SUBREGION_SELECT: 'map_subregion_select',
  MAP_SEARCH: 'map_search',
  HOSPITAL_CALL_CLICK: 'hospital_call_click',
  HOSPITAL_NAVER_CLICK: 'hospital_naver_click',
  LIST_LOAD_MORE: 'list_load_more',
  MAP_RESET: 'map_reset',
  MAP_ERROR: 'map_error',
  CTA_FIND_CLICK: 'cta_find_click',
  VIDEO_PLAY: 'video_play',
});

/**
 * 이벤트별 허용 파라미터.
 * 여기에 없는 키는 버린다 — 개인정보가 실릴 경로를 애초에 막는다.
 * map_error 의 reason 은 실패 지점(clinics | map)을 구분하기 위한 값이다.
 */
const ALLOWED_PARAMS = Object.freeze({
  map_region_select: ['region', 'source'],
  map_subregion_select: ['region', 'subregion'],
  map_search: ['result_count', 'query_length'],
  hospital_call_click: ['hospital_id', 'region'],
  hospital_naver_click: ['hospital_id', 'region'],
  list_load_more: ['region', 'remaining'],
  map_reset: [],
  map_error: ['reason'],
  cta_find_click: ['position'],
  video_play: [],
});

const EVENT_NAME = 'momo:track';

/** map_search 디바운스 600ms · 2자 이상만 — §6-4 */
export const SEARCH_TRACK_DEBOUNCE = 600;
export const SEARCH_TRACK_MIN_LENGTH = 2;

/**
 * 이벤트 payload 를 허용 파라미터만 남겨 만든다.
 * 테스트가 payload 모양을 직접 검증할 수 있도록 순수 함수로 분리했다.
 */
export function buildPayload(event, params = {}) {
  const allowed = ALLOWED_PARAMS[event];
  if (!allowed) return null;

  const detail = { event };
  for (const key of allowed) {
    if (params[key] !== undefined && params[key] !== null) {
      detail[key] = params[key];
    }
  }
  return detail;
}

/** 측정 훅 발사. 알 수 없는 이벤트면 아무 일도 하지 않는다. */
export function track(event, params = {}) {
  const detail = buildPayload(event, params);
  if (!detail) return false;
  if (typeof document === 'undefined') return false;

  document.dispatchEvent(new CustomEvent(EVENT_NAME, { detail }));
  return true;
}
