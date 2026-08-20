// LUMI BAND 랜딩페이지 — 완료기준 검증 하네스
//
// 확정문서 2026-08-20_LUMI_BAND_랜딩페이지_1차실증_실행확정 §7 의
// acceptance criteria 중 브라우저로 확인 가능한 항목을 실측한다.
// "테스트되지 않은 상태를 완료로 보고하지 않는다"(docs/dev-execution.md)를
// 지키기 위한 도구이며, REWORK 후 재검증에도 그대로 쓴다.
//
//   node lumi-band/verify.mjs [url]
//   기본 대상은 로컬 소스. 배포본을 검증하려면 URL 을 인자로 넘긴다.
//
// 주의: 프로그램적 고속 스크롤은 IntersectionObserver 를 건너뛸 수 있다.
// 실사용과 같게 보이도록 mouse.wheel 로 내려간다.

import { chromium } from 'playwright';

const TARGET = process.argv[2] ?? 'file://' + new URL('./index.html', import.meta.url).pathname;
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const SECTIONS = ['top','problem','solution','features','how','dashboard',
                  'proof','compare','pricing','faq','final'];
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900  },
  { name: 'tablet',  width: 820,  height: 1180 },
  { name: 'mobile',  width: 390,  height: 844  },
];

const browser = await chromium.launch({ executablePath: CHROME });
let failed = 0;

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));

  await page.goto(TARGET, { waitUntil: 'load' });
  await page.waitForTimeout(500);

  // 실사용처럼 휠로 끝까지 내려가 모든 scroll reveal 을 발화시킨다
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += 400) {
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(1200);

  const r = {};
  r.sections = (await Promise.all(SECTIONS.map(id => page.locator('#' + id).count())))
    .filter(Boolean).length;
  r.footer = await page.locator('footer').count();
  r.hOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  r.unrevealed = await page.evaluate(() =>
    [...document.querySelectorAll('.rv')].filter(e => getComputedStyle(e).opacity === '0').length);
  r.brokenAnchors = await page.evaluate(() => {
    const ids = new Set([...document.querySelectorAll('[id]')].map(e => e.id));
    return [...document.querySelectorAll('a[href^="#"]')]
      .map(a => a.getAttribute('href').slice(1)).filter(h => h && !ids.has(h));
  });
  r.counts = {
    features: await page.locator('.bento .b').count(),
    faq:      await page.locator('.fq').count(),
    plans:    await page.locator('.plan').count(),
    steps:    await page.locator('.steps .step').count(),
    problems: await page.locator('.p-card').count(),
    quotes:   await page.locator('.quote').count(),
  };

  // 한글 어절 보호 — H1 이 의도한 2줄로 떨어지는지
  r.h1 = await page.evaluate(() => {
    const el = document.querySelector('.hero h1'), cs = getComputedStyle(el);
    return { lines: Math.round(el.getBoundingClientRect().height / parseFloat(cs.lineHeight)),
             wordBreak: cs.wordBreak };
  });

  // 인터랙션
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await page.locator('.hero-cta a[href="#pricing"]').click();
  await page.waitForTimeout(900);
  r.ctaScroll = await page.evaluate(() => window.scrollY) > 200;

  const faq = page.locator('.fq').first();
  await faq.locator('.fq-q').click();
  await page.waitForTimeout(400);
  r.faqOpens = (await faq.getAttribute('class')).includes('open')
            && (await faq.locator('.fq-q').getAttribute('aria-expanded')) === 'true';

  const before = await page.locator('.plan .amt').first().innerText();
  await page.locator('#tgSub').click();
  await page.waitForTimeout(250);
  r.pricingToggle = (await page.locator('.plan .amt').first().innerText()) !== before;

  await page.locator('.dash-step').nth(1).click();
  await page.waitForTimeout(300);
  r.dashSwitch = (await page.locator('#panelTitle').innerText()).includes('주간');

  r.consoleErrors = errors;

  const checks = [
    ['섹션 11개',        r.sections === 11],
    ['푸터',             r.footer === 1],
    ['가로 스크롤 없음',  !r.hOverflow],
    ['미노출 요소 없음',  r.unrevealed === 0],
    ['깨진 앵커 없음',    r.brokenAnchors.length === 0],
    ['콘솔 오류 없음',    errors.length === 0],
    ['H1 2줄 (한글 보호)', r.h1.lines === 2 && r.h1.wordBreak === 'keep-all'],
    ['CTA 앵커 스크롤',   r.ctaScroll],
    ['FAQ 아코디언',      r.faqOpens],
    ['요금제 토글',       r.pricingToggle],
    ['대시보드 전환',     r.dashSwitch],
    ['기능 6 / FAQ 5 / 플랜 3',
      r.counts.features === 6 && r.counts.faq === 5 && r.counts.plans === 3],
  ];

  console.log(`\n── ${vp.name} (${vp.width}x${vp.height}) ${'─'.repeat(30)}`);
  for (const [label, ok] of checks) {
    if (!ok) failed++;
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}`);
  }
  if (errors.length) console.log('  콘솔:', errors.slice(0, 5));

  await ctx.close();
}

await browser.close();
console.log(`\n결과: ${failed === 0 ? '전 항목 PASS' : failed + '건 FAIL'}`);
process.exit(failed === 0 ? 0 : 1);
