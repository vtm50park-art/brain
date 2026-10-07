/**
 * 히어로 — 회전 고민 문구 + 영상 facade
 * 근거: V2_BUILD_SPEC §4 S1 · §5-3
 * - 정적 첫 문구로 시작, 5초 이상 체류, 전환 300ms, 일시정지 버튼 상시 제공
 * - reduced-motion 이면 4문구를 정적 목록으로 노출하고 타이머를 쓰지 않는다
 * - 영상은 클릭 후에만 iframe 을 넣는다(초기 로드 시 youtube 요청 0건)
 * DOM 생성은 createElement/textContent 만 쓴다(innerHTML 계열 금지 — §10-6).
 */

import { HERO, VIDEO } from './copy.js';
import { track, TRACK_EVENTS } from './lib/track.js';

const DWELL = 5000;
const FADE = 300;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function lineEl(text) {
  const span = document.createElement('span');
  span.className = 'hero__rotator-line';
  span.textContent = text;
  return span;
}

/** reduced-motion 대체: 4문구 전부를 정적 목록으로 노출 */
function renderStaticList(rotator) {
  const list = document.createElement('ul');
  list.className = 'hero__rotator-list';
  list.setAttribute('aria-label', HERO.rotationListLabel);

  for (const phrase of HERO.rotation) {
    const item = document.createElement('li');
    item.appendChild(lineEl(phrase.a));
    item.appendChild(lineEl(phrase.b));
    list.appendChild(item);
  }

  rotator.replaceChildren(list);
  rotator.removeAttribute('data-phase');
}

function paint(rotator, index) {
  const phrase = HERO.rotation[index];
  rotator.replaceChildren(lineEl(phrase.a), lineEl(phrase.b));
}

function initRotator(rotator, pauseButton) {
  if (!rotator) return;

  if (prefersReducedMotion()) {
    renderStaticList(rotator);
    if (pauseButton) pauseButton.hidden = true;
    return;
  }

  let index = 0;
  let paused = false;
  let dwellTimer = 0;
  let fadeTimer = 0;

  const step = () => {
    rotator.dataset.phase = 'out';
    fadeTimer = window.setTimeout(() => {
      index = (index + 1) % HERO.rotation.length;
      paint(rotator, index);
      rotator.dataset.phase = 'in';
      schedule();
    }, FADE);
  };

  const schedule = () => {
    window.clearTimeout(dwellTimer);
    if (paused) return;
    dwellTimer = window.setTimeout(step, DWELL);
  };

  const setPaused = (next) => {
    paused = next;
    if (paused) {
      window.clearTimeout(dwellTimer);
      window.clearTimeout(fadeTimer);
      rotator.dataset.phase = 'in';
    } else {
      schedule();
    }
    if (pauseButton) {
      pauseButton.setAttribute('aria-pressed', String(paused));
      const label = paused ? HERO.resumeLabel : HERO.pauseLabel;
      pauseButton.setAttribute('aria-label', label);
      const text = pauseButton.querySelector('[data-role="pause-text"]');
      if (text) text.textContent = label;
    }
  };

  if (pauseButton) {
    pauseButton.hidden = false;
    pauseButton.addEventListener('click', () => setPaused(!paused));
  }

  // 탭이 보이지 않을 때는 돌리지 않는다
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      window.clearTimeout(dwellTimer);
    } else {
      schedule();
    }
  });

  setPaused(false);
}

function initVideo(root) {
  const facade = root && root.querySelector('[data-role="video-facade"]');
  if (!facade) return;

  facade.addEventListener(
    'click',
    () => {
      const frame = facade.parentElement;
      const iframe = document.createElement('iframe');
      iframe.className = 'video__embed';
      iframe.src = VIDEO.embed;
      iframe.title = HERO.videoTitle;
      iframe.setAttribute('allow', 'accelerometer; encrypted-media; picture-in-picture');
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('loading', 'lazy');
      iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');

      facade.remove();
      if (frame) frame.appendChild(iframe);
      track(TRACK_EVENTS.VIDEO_PLAY);
    },
    { once: true }
  );
}

export function initHero() {
  const hero = document.getElementById('hero');
  if (!hero) return;

  initRotator(
    hero.querySelector('[data-role="rotator"]'),
    hero.querySelector('[data-role="rotator-pause"]')
  );
  initVideo(hero);
}
