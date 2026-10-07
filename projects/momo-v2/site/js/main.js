/**
 * 엔트리 — 공통 동작 배선
 * 근거: V2_BUILD_SPEC §3(CTA) · §4(모바일 고정 CTA) · §5-3(모션) · §6-4(측정)
 *
 * CTA 4곳은 모두 '내 지역 병원 찾기' → #hospital-map 으로 scrollIntoView 한다.
 * 해시는 지도 상태 전용이므로 CTA 가 location.hash 를 덮어쓰지 않는다.
 *
 * 지도(js/map.js)는 DEV-3B, 리스트·검색·조건 요약 바(js/list.js)는 DEV-3C 에서 배선했다.
 * 리스트는 `document` 의 `momo:state` 이벤트를 구독해 지도와 같은 상태로 그린다.
 */

import { CTA_TARGET_ID, MOBILE_BREAKPOINT } from './copy.js';
import { initHero } from './hero.js';
import { initMap } from './map.js';
import { initList } from './list.js';
import { track, TRACK_EVENTS } from './lib/track.js';

/** 지도 섹션으로 이동 — 해시 변경 없음 */
function scrollToMap() {
  const target = document.getElementById(CTA_TARGET_ID);
  if (!target) return;

  const reduce =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}

function initCtas() {
  const buttons = document.querySelectorAll('[data-cta-position]');
  for (const button of buttons) {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      track(TRACK_EVENTS.CTA_FIND_CLICK, { position: button.dataset.ctaPosition });
      scrollToMap();
    });
  }
}

/**
 * 모바일 하단 고정 CTA — §4
 * 히어로를 벗어나면 노출, 병원 안내 구간(≥10% 교차)과 마무리 구간에서는 숨긴다.
 */
function initFixedCta() {
  const fixed = document.querySelector('[data-role="fixed-cta"]');
  if (!fixed || typeof IntersectionObserver !== 'function') return;

  document.body.classList.add('has-fixed-cta');

  const visible = { hero: true, map: false, closing: false };

  const apply = () => {
    const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
    const show = isMobile && !visible.hero && !visible.map && !visible.closing;
    fixed.classList.toggle('is-shown', show);
    fixed.setAttribute('aria-hidden', String(!show));
  };

  const watch = (id, key, threshold) => {
    const el = document.getElementById(id);
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visible[key] = entry.isIntersecting;
        }
        apply();
      },
      { threshold }
    );
    observer.observe(el);
  };

  watch('hero', 'hero', 0);
  watch(CTA_TARGET_ID, 'map', 0.1);
  watch('closing', 'closing', 0);

  window.addEventListener('resize', apply, { passive: true });
  apply();
}

/** 섹션 진입 1회 — §5-3 */
function initReveal() {
  const targets = document.querySelectorAll('.reveal');
  if (!targets.length) return;

  if (typeof IntersectionObserver !== 'function') {
    for (const el of targets) el.classList.add('is-in');
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.08 }
  );

  for (const el of targets) observer.observe(el);
}

function init() {
  initHero();
  initCtas();
  initFixedCta();
  initReveal();
  // 지도가 먼저다 — 리스트는 지도 모듈의 상태·로드를 공유한다 (§6-3)
  initMap();
  initList();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
