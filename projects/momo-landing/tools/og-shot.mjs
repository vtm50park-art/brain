import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
await p.goto("file:///tmp/claude-0/-home-user-brain/41013770-11e6-5199-9794-7aa04c392ea2/scratchpad/og/og.html");
await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
await p.screenshot({ path: "og/og.png" });
await b.close();
