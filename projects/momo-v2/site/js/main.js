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

/** 숨김 기준 — 지도·마무리 구간이 뷰포트 높이의 이만큼을 덮으면 가린다 (§4 · X6) */
const FIXED_CTA_HIDE_RATIO = 0.1;

/** 요소가 뷰포트 안에서 실제로 차지하는 높이(px) */
function visibleHeight(el) {
  if (!el) return 0;
  const rect = el.getBoundingClientRect();
  return Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
}

/**
 * 모바일 하단 고정 CTA — §4
 * 히어로를 벗어나면 노출, 지도·마무리 구간이 뷰포트의 10% 이상 보이면 숨긴다.
 *
 * 숨김 기준은 '섹션 높이의 10%' 가 아니라 '뷰포트 높이의 10%' 다. 섹션 기준이면
 * 리스트가 긴 시·도(서울 48곳 · 2,800px 이상)에서 지도 섹션 한가운데에서도 교차율이
 * 10% 를 못 넘어 CTA 가 카드 글자를 덮었다 (DEV-4C).
 */
function initFixedCta() {
  const fixed = document.querySelector('[data-role="fixed-cta"]');
  if (!fixed || typeof IntersectionObserver !== 'function') return;

  document.body.classList.add('has-fixed-cta');

  const hero = document.getElementById('hero');
  const map = document.getElementById(CTA_TARGET_ID);
  const closing = document.getElementById('closing');

  let heroVisible = true;

  const apply = () => {
    const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
    // 뷰포트 높이가 0 으로 보고되는 환경에서 늘 숨김이 되지 않게 최소 1px 을 둔다
    const limit = Math.max(1, window.innerHeight * FIXED_CTA_HIDE_RATIO);
    const covered = visibleHeight(map) >= limit || visibleHeight(closing) >= limit;
    const show = isMobile && !heroVisible && !covered;

    fixed.classList.toggle('is-shown', show);
    fixed.setAttribute('aria-hidden', String(!show));
    // aria-hidden 만 주면 안의 버튼이 키보드 포커스를 받는다(axe aria-hidden-focus) — §8
    if (show) fixed.removeAttribute('inert');
    else fixed.setAttribute('inert', '');
  };

  // 히어로 구간 숨김은 그대로 — 교차 여부만 본다
  if (hero) {
    const heroObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) heroVisible = entry.isIntersecting;
        apply();
      },
      { threshold: 0 }
    );
    heroObserver.observe(hero);
  }

  // 긴 섹션에서도 10% 지점을 놓치지 않게 임계값을 촘촘히 둔다. 실제 비교는 apply() 가
  // getBoundingClientRect 로 다시 하므로 임계값은 호출 시점만 만든다.
  const DENSE = Array.from({ length: 51 }, (_, step) => step / 50);
  const coverObserver = new IntersectionObserver(apply, { threshold: DENSE });
  for (const el of [map, closing]) {
    if (el) coverObserver.observe(el);
  }

  // 임계값 사이 구간은 스크롤로 메운다 — rAF 1회로 묶어 메인 스레드를 늘리지 않는다
  let queued = false;
  const onScroll = () => {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(() => {
      queued = false;
      apply();
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
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
