/* MOMO'S PICK — interactions + clinic map */
(() => {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const isMobile = () => innerWidth < 1000;

  /* ---------- scroll: progress, nav, parallax, escalate ---------- */
  const nav = $("#nav"), bar = $(".progress span"), mcta = $("#mobile-cta");
  const parallax = $$(".parallax");
  const escalate = $(".escalate"), escLine = $(".escalate-line span");
  const finder = $("#finder");
  let lastY = scrollY, ticking = false;
  function onScroll() {
    const y = scrollY, h = document.documentElement.scrollHeight - innerHeight;
    bar.style.setProperty("--p", h > 0 ? (y / h).toFixed(4) : 0);
    nav.classList.toggle("scrolled", y > 40);
    nav.classList.toggle("hide", y > 600 && y > lastY + 4 && !nav.matches(":focus-within"));
    if (y < lastY - 4) nav.classList.remove("hide");
    const fr = finder.getBoundingClientRect();
    mcta.classList.toggle("show", y > innerHeight * 0.8 && !(fr.top < innerHeight && fr.bottom > 0));
    if (!reduce) {
      for (const el of parallax) {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) continue;
        const c = (r.top + r.height / 2 - innerHeight / 2) * -(+el.dataset.speed || 0.1);
        el.style.transform = `translate3d(0, ${c.toFixed(1)}px, 0)`;
      }
    }
    if (escLine) {
      const r = escalate.getBoundingClientRect();
      const t = Math.min(1, Math.max(0, (innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.3)));
      escLine.parentElement.style.setProperty("--w", t.toFixed(3));
      escLine.style.transform = `scaleX(${t.toFixed(3)})`;
    }
    lastY = y; ticking = false;
  }
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener("resize", onScroll);
  onScroll();

  /* ---------- hero headline: rotating phrases ([...] = highlighted) ---------- */
  const PHRASES = [
    ["탈모 때문에", "[어디 병원]을 가야 할까?"],
    ["탈모 샴푸 · 영양제,", "[안 해본 거] 없으신가요?"],
    ["치료 타이밍을 놓치면", "[탈모는 계속] 진행됩니다"],
    ["정답은 하나,", "[전문의 진료]부터"],
  ];
  const GRAD = [[143, 245, 198], [61, 220, 151], [43, 196, 201], [157, 184, 255]];
  const mix = (t) => {
    const s = Math.min(GRAD.length - 1.001, Math.max(0, t * (GRAD.length - 1)));
    const i = Math.floor(s), f = s - i, a = GRAD[i], b = GRAD[i + 1];
    return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(",")})`;
  };
  const rot = $("#rot"), dotsEl = $("#rot-dots"), HOLD = 4200;
  dotsEl.innerHTML = PHRASES.map(() => "<li></li>").join("");
  const dots = $$("li", dotsEl);
  const render = (lines) => {
    let i = 0;
    rot.innerHTML = lines.map((line) => {
      const parts = line.split(/(\[[^\]]+\])/).filter(Boolean);
      const total = parts.reduce((n, p) => n + (p.startsWith("[") ? p.length - 2 : 0), 0) || 1;
      let g = 0;
      return `<span class="ln">${parts.map((p) => {
        const hot = p.startsWith("[");
        const txt = hot ? p.slice(1, -1) : p;
        return txt.split(" ").map((word, wi, arr) => `<span class="w">${[...word].map((ch) => {
          const st = hot ? ` g" style="--i:${i++};color:${mix(g++ / Math.max(1, total - 1))}` : `" style="--i:${i++}`;
          return `<span class="ch${st}">${ch}</span>`;
        }).join("")}</span>${wi < arr.length - 1 ? " " : ""}`).join("");
      }).join("")}</span>`;
    }).join("");
  };
  let pi = 0;
  const show = () => {
    render(PHRASES[pi]);
    dots.forEach((d, k) => { d.classList.toggle("on", k === pi); d.classList.toggle("done", k < pi); });
    requestAnimationFrame(() => requestAnimationFrame(() => rot.classList.add("in")));
  };
  show();
  if (!reduce) setInterval(() => {
    rot.classList.remove("in"); rot.classList.add("out");
    setTimeout(() => { rot.classList.remove("out"); pi = (pi + 1) % PHRASES.length; show(); }, 620);
  }, HOLD);
  dotsEl.style.setProperty("--dur", HOLD + "ms");

  /* ---------- compare rows stagger + flow rail ---------- */
  $$(".vs-col").forEach((col) => $$("li", col).forEach((li, i) => li.style.setProperty("--i", i)));
  const railLinks = $$("#rail a");
  if (railLinks.length) {
    const sio = new IntersectionObserver((es) => {
      for (const e of es) if (e.isIntersecting) {
        const st = e.target.dataset.stage;
        railLinks.forEach((a) => a.classList.toggle("on", a.dataset.for === st));
      }
    }, { rootMargin: "-45% 0px -45% 0px" });
    $$("[data-stage]").forEach((sec) => sio.observe(sec));
  }

  /* ---------- reveal ---------- */
  const groups = new Map();
  $$(".reveal").forEach((el) => {
    const p = el.parentElement;
    const n = groups.get(p) || 0;
    groups.set(p, n + 1);
    if (n) el.style.setProperty("--d", `${Math.min(n, 8) * 0.08}s`);
  });
  const io = new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
  $$(".reveal").forEach((el) => io.observe(el));

  /* ---------- counters ---------- */
  const cio = new IntersectionObserver((es) => {
    for (const e of es) {
      if (!e.isIntersecting) continue;
      cio.unobserve(e.target);
      const el = e.target, to = +el.dataset.to, t0 = performance.now(), dur = reduce ? 1 : 1600;
      const step = (t) => {
        const k = Math.min(1, (t - t0) / dur), v = Math.round(to * (1 - Math.pow(1 - k, 4)));
        el.textContent = v;
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
  }, { threshold: 0.6 });
  $$(".count").forEach((el) => cio.observe(el));

  /* ---------- pointer effects ---------- */
  if (finePointer && !reduce) {
    const glow = $(".cursor-glow");
    addEventListener("pointermove", (e) => {
      document.body.classList.add("has-cursor");
      glow.style.setProperty("--x", e.clientX + "px");
      glow.style.setProperty("--y", e.clientY + "px");
    }, { passive: true });

    $$(".magnetic").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.25, y = (e.clientY - r.top - r.height / 2) * 0.35;
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });

    $$(".tilt").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        el.style.setProperty("--mx", px * 100 + "%");
        el.style.setProperty("--my", py * 100 + "%");
        const max = el.classList.contains("profile-card") ? 10 : 7;
        el.style.transform = `perspective(900px) rotateX(${(0.5 - py) * max}deg) rotateY(${(px - 0.5) * max}deg) translateZ(0)`;
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });
  }

  /* ---------- hero strands canvas ---------- */
  const cv = $("#strands");
  if (cv && !reduce) {
    const ctx = cv.getContext("2d");
    let W = 0, H = 0, dpr = 1, strands = [], running = true, raf;
    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 1.5);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(70, W / 22));
      strands = Array.from({ length: n }, () => ({
        x: W * (0.35 + Math.random() * 0.7), len: H * (0.25 + Math.random() * 0.55),
        amp: 20 + Math.random() * 60, ph: Math.random() * Math.PI * 2, sp: 0.15 + Math.random() * 0.35,
        w: 0.4 + Math.random() * 1.1, hue: Math.random() < 0.75 ? "61,220,151" : Math.random() < 0.5 ? "120,160,255" : "241,207,126",
        a: 0.12 + Math.random() * 0.35,
      }));
    };
    const draw = (t) => {
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      const tt = t / 1000;
      for (const s of strands) {
        const sw = Math.sin(tt * s.sp + s.ph) * s.amp;
        const y0 = H + 10, y1 = H - s.len;
        const g = ctx.createLinearGradient(0, y0, 0, y1);
        g.addColorStop(0, `rgba(${s.hue},0)`);
        g.addColorStop(0.6, `rgba(${s.hue},${s.a})`);
        g.addColorStop(1, `rgba(${s.hue},0)`);
        ctx.strokeStyle = g; ctx.lineWidth = s.w;
        ctx.beginPath();
        ctx.moveTo(s.x, y0);
        ctx.bezierCurveTo(s.x + sw * 0.3, y0 - s.len * 0.35, s.x - sw * 0.6, y0 - s.len * 0.7, s.x + sw, y1);
        ctx.stroke();
        ctx.fillStyle = `rgba(${s.hue},${s.a * 1.6})`;
        ctx.beginPath(); ctx.arc(s.x + sw, y1, s.w * 1.2, 0, 6.283); ctx.fill();
      }
      if (running) raf = requestAnimationFrame(draw);
    };
    resize(); addEventListener("resize", resize);
    // canvas lives in the fixed stage background: fade it out (and stop drawing) past the hero
    const fade = () => {
      const o = Math.max(0, 1 - scrollY / (innerHeight * 1.1));
      cv.style.opacity = (o * 0.55).toFixed(3);
      const want = o > 0;
      if (want && !running) { running = true; raf = requestAnimationFrame(draw); }
      running = want;
    };
    addEventListener("scroll", fade, { passive: true });
    fade();
    raf = requestAnimationFrame(draw);
  }

  /* ---------- 삼탈모TV: channel link from YouTube oEmbed (resolved at build) ---------- */
  fetch("/data/yt.json").then((r) => (r.ok ? r.json() : null)).then((yt) => {
    if (!yt || !yt.author_url) return;
    ["#tv-link", "#yt-link"].forEach((sel) => { const a = $(sel); if (a) a.href = yt.author_url; });
  }).catch(() => {});

  /* ---------- motion collage: torn paper + stop-motion ---------- */
  const board = $("#board");
  if (board) {
    const items = [...board.querySelectorAll(".piece, .cut")];
    const rnd = (a, b) => a + Math.random() * (b - a);
    const torn = (amp) => {
      const pts = [], n = 16;
      const edge = (fx) => { for (let i = 0; i < n; i++) pts.push(fx(i / n)); };
      const j = () => rnd(0, amp) + (Math.random() < 0.12 ? rnd(amp, amp * 2.2) : 0);
      edge((t) => [t * 100, j()]);
      edge((t) => [100 - j(), t * 100]);
      edge((t) => [100 - t * 100, 100 - j()]);
      edge((t) => [j(), 100 - t * 100]);
      return `polygon(${pts.map(([x, y]) => `${x.toFixed(1)}% ${y.toFixed(1)}%`).join(",")})`;
    };
    items.forEach((el) => el.style.setProperty("--torn", torn(el.classList.contains("cut") ? 6 : 2.4)));
    const mq = matchMedia("(max-width: 760px)");
    const place = () => items.forEach((el) => {
      const v = (mq.matches ? el.dataset.m : el.dataset.d) || el.dataset.d;
      el.hidden = v === "none";
      if (v === "none") return;
      const [x, y, w, r] = v.split(",").map(Number);
      el.style.setProperty("--x", x); el.style.setProperty("--y", y);
      el.style.setProperty("--w", w); el.style.setProperty("--r", r);
    });
    place(); mq.addEventListener("change", place);

    let timers = [], playing = false;
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    const clear = () => { timers.forEach(clearTimeout); timers = []; };
    const order = () => items.filter((el) => !el.hidden);
    const cycle = () => {
      const seq = order();
      seq.forEach((el) => el.classList.remove("on", "off"));
      seq.forEach((el, i) => {
        el.style.setProperty("--dir", i % 2 ? -1 : 1);
        later(() => el.classList.add("on"), 200 + i * 190);
      });
      const hold = 200 + seq.length * 190 + 6500;
      [...seq].reverse().forEach((el, i) => later(() => { el.classList.remove("on"); el.classList.add("off"); }, hold + i * 70));
      later(cycle, hold + seq.length * 70 + 700);
    };
    if (reduce) items.forEach((el) => el.classList.add("on"));
    else new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !playing) { playing = true; cycle(); }
      else if (!e.isIntersecting && playing) { playing = false; clear(); }
    }, { threshold: 0.25 }).observe(board);
  }

  /* =====================================================
     CLINIC MAP
     ===================================================== */
  const SVGNS = "http://www.w3.org/2000/svg";
  const svg = $("#map"), tip = $("#tip"), stage = $(".map-stage");
  const listEl = $("#list"), emptyEl = $("#empty"), qEl = $("#q");
  const chipsEl = $("#chips"), subEl = $("#subchips"), crumbsEl = $("#crumbs"), backEl = $("#back"), hintEl = $("#hint");
  const DRILL = { 서울: "seoul", 경기: "gg" };
  const FULL = { 서울: "서울특별시", 경기: "경기도", 인천: "인천광역시", 부산: "부산광역시", 대구: "대구광역시", 대전: "대전광역시", 광주: "광주광역시", 울산: "울산광역시", 세종: "세종특별자치시", 강원: "강원도", 충북: "충청북도", 충남: "충청남도", 전북: "전라북도", 전남: "전라남도", 경북: "경상북도", 경남: "경상남도", 제주: "제주특별자치도" };
  const state = { sido: null, sub: null, q: "" };
  let M, C, byProv = {}, bySub = {}, vb = null, vbAnim = 0;

  const el = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(SVGNS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const lvProv = (n) => (!n ? 0 : n < 4 ? 1 : n < 10 ? 2 : 3);
  const lvSub = (n) => (!n ? 0 : n < 2 ? 1 : n < 5 ? 2 : 3);
  const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  Promise.all([fetch("/data/map.json").then((r) => r.json()), fetch("/data/clinics.json").then((r) => r.json())])
    .then(([m, c]) => { M = m; C = c; init(); })
    .catch(() => { listEl.innerHTML = '<li class="empty">데이터를 불러오지 못했습니다. 새로고침 해주세요.</li>'; });

  function init() {
    for (const c of C) {
      byProv[c.sido] = (byProv[c.sido] || 0) + 1;
      const k = c.sido + "|" + c.sgg;
      bySub[k] = (bySub[k] || 0) + 1;
    }
    const regions = Object.keys(byProv).length;
    const sc = $("#stat-clinics"), sr = $("#stat-regions");
    sc.dataset.to = C.length; sr.dataset.to = regions;
    if (sc.textContent !== "0") sc.textContent = C.length;
    if (sr.textContent !== "0") sr.textContent = regions;
    buildSVG();
    buildChips();
    setView(null, null, true);
    qEl.addEventListener("input", () => { state.q = qEl.value.trim(); renderList(); });
  }

  /* ---------- svg ---------- */
  let Lprov, Lseoul, Lgg, Lbadge, home;
  function buildSVG() {
    const pad = 20;
    home = [-pad, -pad, M.W + pad * 2, M.H + pad * 2];
    svg.setAttribute("viewBox", home.join(" "));
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    vb = home.slice();
    const defs = el("defs", {}, svg);
    defs.innerHTML = `
      <linearGradient id="gHot" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8ff5c6"/><stop offset="1" stop-color="#1fae7a"/></linearGradient>
      <linearGradient id="gOn" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6e2a8"/><stop offset=".5" stop-color="#7cf0bf"/><stop offset="1" stop-color="#2bc4c9"/></linearGradient>
      <filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;

    Lprov = el("g", { class: "layer", id: "L-prov" }, svg);
    for (const p of M.prov) {
      const n = byProv[p.name] || 0;
      const g = el("g", { class: "rg prov", "data-name": p.name, "data-lv": lvProv(n), tabindex: 0, role: "button", "aria-label": `${FULL[p.name]} ${n}곳` }, Lprov);
      el("path", { d: p.d }, g);
      bindRegion(g, () => `${FULL[p.name]}<small>${n ? n + "곳" : "준비 중"}</small>`, () => onProv(p.name));
    }

    Lseoul = el("g", { class: "layer off", id: "L-seoul" }, svg);
    for (const s of M.seoul) {
      const n = bySub["서울|" + s.name] || 0;
      const g = el("g", { class: "rg sub", "data-sub": s.name, "data-lv": lvSub(n), tabindex: -1, role: "button", "aria-label": `서울 ${s.name} ${n}곳` }, Lseoul);
      el("path", { d: s.d }, g);
      bindRegion(g, () => `서울 ${s.name}<small>${n ? n + "곳" : "없음"}</small>`, () => onSub("서울", s.name, n));
    }

    Lgg = el("g", { class: "layer off", id: "L-gg" }, svg);
    for (const s of M.gg) {
      const n = bySub["경기|" + s.name] || 0;
      const g = el("g", { class: "rg sub gg-city", "data-sub": s.name, "data-lv": lvSub(n), tabindex: -1, role: "button", "aria-label": `경기 ${s.name} ${n}곳` }, Lgg);
      el("path", { d: s.d }, g);
      bindRegion(g, () => `경기 ${s.name}<small>${n ? n + "곳" : "없음"}</small>`, () => onSub("경기", s.name, n));
    }
    Lbadge = el("g", { class: "layer", id: "L-badge" }, svg);
  }

  function bindRegion(g, label, act) {
    g.addEventListener("click", act);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); act(); } });
    const show = (e) => {
      tip.innerHTML = label();
      const r = stage.getBoundingClientRect();
      let x, y;
      if (e && e.clientX != null && e.type.startsWith("pointer")) { x = e.clientX - r.left; y = e.clientY - r.top; }
      else { const b = g.getBoundingClientRect(); x = b.left + b.width / 2 - r.left; y = b.top + b.height / 2 - r.top; }
      tip.style.setProperty("--tx", x + "px"); tip.style.setProperty("--ty", y + "px");
      tip.classList.add("show");
    };
    g.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") show(e); });
    g.addEventListener("pointerleave", () => tip.classList.remove("show"));
    g.addEventListener("focus", () => { g.classList.add("focus"); show(); });
    g.addEventListener("blur", () => { g.classList.remove("focus"); tip.classList.remove("show"); });
  }

  /* ---------- badges ---------- */
  function center(bb) { return [(bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2]; }
  const SUB_NUDGE = { 강남구: [0.05, 0.08], 서초구: [-0.12, 0.12], 고양시: [0.08, 0.1], 용인시: [0.05, 0], 화성시: [0.12, -0.05], 남양주시: [-0.1, 0.1] };
  function drawBadges(view) {
    Lbadge.innerHTML = "";
    const unit = vb[2] / 1000;
    const items = [];
    if (view === "nation") {
      for (const p of M.prov) {
        const n = byProv[p.name] || 0;
        if (!n) continue;
        items.push({ xy: M.anchor[p.name] || center(p.bb), n, label: p.name, act: () => onProv(p.name), aria: `${FULL[p.name]} ${n}곳` });
      }
    } else {
      const key = view === "seoul" ? "서울" : "경기";
      const src = view === "seoul" ? M.seoul : M.gg;
      for (const s of src) {
        const n = bySub[key + "|" + s.name] || 0;
        if (!n) continue;
        let [x, y] = center(s.bb);
        const nd = SUB_NUDGE[s.name];
        if (nd) { x += (s.bb[2] - s.bb[0]) * nd[0]; y += (s.bb[3] - s.bb[1]) * nd[1]; }
        items.push({ xy: [x, y], n, label: s.name.replace(/(시|구|군)$/, ""), act: () => onSub(key, s.name, n), aria: `${key} ${s.name} ${n}곳` });
      }
    }
    for (const it of items) {
      const big = it.n >= 10;
      const r = (view === "nation" ? (big ? 27 : 21) : (big ? 30 : 22)) * unit;
      const g = el("g", { class: "badge", transform: `translate(${it.xy[0]},${it.xy[1]})`, "aria-hidden": "true" }, Lbadge);
      g.addEventListener("click", it.act);
      el("circle", { class: "halo", r: r * 1.15 }, g);
      el("circle", { class: "core", r }, g);
      const t = el("text", { y: 0, "font-size": r * (it.n >= 10 ? 0.9 : 1.0) }, g);
      t.textContent = it.n;
      const l = el("text", { class: "lbl", y: r + 15 * unit, "font-size": 17 * unit }, g);
      l.textContent = it.label;
    }
  }

  /* ---------- viewBox animation ---------- */
  function fitBox(bb, padRatio = 0.08) {
    const w = bb[2] - bb[0], h = bb[3] - bb[1];
    const r = svg.clientWidth / Math.max(1, svg.clientHeight) || 1;
    let W = w * (1 + padRatio * 2), H = h * (1 + padRatio * 2);
    if (W / H < r) W = H * r; else H = W / r;
    return [bb[0] + w / 2 - W / 2, bb[1] + h / 2 - H / 2, W, H];
  }
  function animateVB(to, done) {
    cancelAnimationFrame(vbAnim);
    const from = vb.slice(), t0 = performance.now(), dur = reduce ? 1 : 950;
    const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur), e = ease(k);
      vb = from.map((v, i) => v + (to[i] - v) * e);
      svg.setAttribute("viewBox", vb.map((v) => v.toFixed(2)).join(" "));
      if (k < 1) vbAnim = requestAnimationFrame(step); else done && done();
    };
    vbAnim = requestAnimationFrame(step);
  }

  /* ---------- state transitions ---------- */
  function onProv(name) {
    if (state.sido === name && !DRILL[name]) { setView(null, null); return; }
    setView(name, null);
    if (!DRILL[name] && isMobile()) scrollToList();
  }
  function onSub(sido, sub, n) {
    if (state.sub === sub) setView(sido, null);
    else setView(sido, sub);
    if (n && isMobile()) scrollToList();
  }
  function scrollToList() {
    setTimeout(() => $(".list-panel").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }), 250);
  }

  let currentView = "nation";
  function setView(sido, sub, instant) {
    state.sido = sido; state.sub = sub;
    const view = DRILL[sido] || "nation";
    const changed = view !== currentView;
    currentView = view;

    Lseoul.classList.toggle("off", view !== "seoul");
    Lgg.classList.toggle("off", view !== "gg");
    $$(".rg.prov", Lprov).forEach((g) => {
      const nm = g.dataset.name;
      g.classList.toggle("on", !!sido && view === "nation" && nm === sido);
      g.classList.toggle("muted", view !== "nation" && nm !== sido);
      g.classList.toggle("base", view !== "nation" && nm === sido);
      g.setAttribute("tabindex", view === "nation" || nm !== sido ? 0 : -1);
    });
    $$(".rg.sub", view === "gg" ? Lgg : Lseoul).forEach((g) => {
      g.classList.toggle("on", g.dataset.sub === sub);
      g.setAttribute("tabindex", 0);
    });
    $$(".rg.sub", view === "gg" ? Lseoul : Lgg).forEach((g) => { g.classList.remove("on"); g.setAttribute("tabindex", -1); });

    const target = view === "nation" ? home : fitBox(M.prov.find((p) => p.name === sido).bb, view === "seoul" ? 0.06 : 0.04);
    if (changed || instant) {
      Lbadge.classList.add("off");
      const finish = () => { drawBadges(view); Lbadge.classList.remove("off"); };
      if (instant) { vb = target.slice(); svg.setAttribute("viewBox", vb.join(" ")); finish(); }
      else animateVB(target, finish);
    }

    backEl.hidden = !sido;
    hintEl.style.opacity = view === "nation" && !sido ? 1 : 0;
    hintEl.textContent = view === "seoul" ? "구를 눌러 세부 리스트를 확인하세요" : view === "gg" ? "시를 눌러 세부 리스트를 확인하세요" : "서울 · 경기를 누르면 구·시 단위로 확대됩니다";
    if (view !== "nation") hintEl.style.opacity = sub ? 0 : 1;

    renderCrumbs(); syncChips(); renderSubchips(); renderList();
  }
  backEl.addEventListener("click", () => setView(null, null));

  /* ---------- chips ---------- */
  function buildChips() {
    const order = Object.entries(byProv).sort((a, b) => b[1] - a[1]);
    const mk = (key, label, n) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.setAttribute("role", "tab"); b.dataset.key = key || "";
      b.innerHTML = `${label}<i>${n}</i>`;
      b.addEventListener("click", () => setView(key || null, null));
      chipsEl.appendChild(b);
    };
    mk(null, "전체", C.length);
    for (const [k, n] of order) mk(k, k, n);
  }
  function syncChips() {
    $$(".chip", chipsEl).forEach((b) => b.setAttribute("aria-selected", String((b.dataset.key || null) === state.sido)));
  }
  function renderSubchips() {
    subEl.innerHTML = "";
    if (!state.sido) return;
    const subs = Object.entries(bySub).filter(([k]) => k.startsWith(state.sido + "|")).map(([k, n]) => [k.split("|")[1], n]).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"));
    if (subs.length < 2) return;
    const mk = (sub, label, n) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "subchip"; b.setAttribute("aria-pressed", String(state.sub === sub));
      b.innerHTML = `${label}<i>${n}</i>`;
      b.addEventListener("click", () => setView(state.sido, sub));
      subEl.appendChild(b);
    };
    mk(null, "전체", byProv[state.sido]);
    for (const [s, n] of subs) mk(s, s, n);
  }
  function renderCrumbs() {
    const parts = [`<button type="button" data-k="">전국</button>`];
    if (state.sido) parts.push(state.sub ? `<button type="button" data-k="${esc(state.sido)}">${esc(FULL[state.sido])}</button>` : `<b>${esc(FULL[state.sido])}</b>`);
    if (state.sub) parts.push(`<b>${esc(state.sub)}</b>`);
    if (!state.sido) parts[0] = "<b>전국</b>";
    crumbsEl.innerHTML = parts.join('<span class="sep">/</span>');
    $$("button", crumbsEl).forEach((b) => b.addEventListener("click", () => setView(b.dataset.k || null, null)));
  }

  /* ---------- list ---------- */
  const ICON_CALL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>';
  const ICON_MAP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';
  function hi(text) {
    const s = esc(text);
    if (!state.q) return s;
    const q = esc(state.q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return s.replace(new RegExp(q, "gi"), (m) => `<mark class="q">${m}</mark>`);
  }
  const PAGE = 10;
  let shown = PAGE;
  function renderList(keep) {
    if (!keep) shown = PAGE;
    const q = state.q.toLowerCase();
    let rows = C.filter((c) => (!state.sido || c.sido === state.sido) && (!state.sub || c.sgg === state.sub));
    if (q) rows = rows.filter((c) => (c.name + " " + c.doctor + " " + c.addr + " " + c.sgg).toLowerCase().includes(q));
    const subRank = (c) => bySub[c.sido + "|" + c.sgg] || 0;
    rows.sort((a, b) => (byProv[b.sido] - byProv[a.sido]) || (subRank(b) - subRank(a)) || a.sgg.localeCompare(b.sgg, "ko") || a.name.localeCompare(b.name, "ko"));

    $("#list-kicker").textContent = state.sido ? (state.sub ? FULL[state.sido] : "REGION") : "NATIONWIDE";
    $("#list-region").textContent = state.sub ? state.sub : state.sido ? FULL[state.sido] : "전국 전체";
    $("#list-count").textContent = rows.length;

    const paged = isMobile() ? rows.slice(0, shown) : rows;
    listEl.innerHTML = paged.map((c, i) => {
      const docs = c.doctor ? `${hi(c.doctor)} 원장` : "";
      const tel = c.tel ? `<a class="c-btn call" href="tel:${c.tel}" aria-label="${esc(c.name)} 전화 걸기">${ICON_CALL}</a>` : "";
      const mapq = encodeURIComponent(`${c.name} ${c.sgg}`.trim());
      return `<li class="clinic" style="--i:${Math.min(i, 18)}">
        <div class="c-top"><span class="c-area">${esc(c.sido)} ${esc(c.sgg)}</span>${docs ? `<span class="c-doc">${docs}</span>` : ""}</div>
        <h4 class="c-name">${hi(c.name)}</h4>
        <p class="c-addr">${hi(c.addr)}</p>
        <p class="c-phone">${esc(c.phone)}</p>
        <div class="c-act">${tel}<a class="c-btn map" href="https://map.naver.com/p/search/${mapq}" target="_blank" rel="noopener" aria-label="${esc(c.name)} 네이버 지도에서 보기">${ICON_MAP}</a></div>
      </li>`;
    }).join("") + (paged.length < rows.length ? `<li><button type="button" class="more" id="more" style="width:100%">더 보기 · ${rows.length - paged.length}곳 남음</button></li>` : "");
    const more = $("#more");
    if (more) more.addEventListener("click", () => { shown += PAGE * 2; renderList(true); });
    if (!keep) listEl.scrollTop = 0;
    emptyEl.hidden = rows.length > 0;
    if (!rows.length) emptyEl.innerHTML = state.q ? `&lsquo;${esc(state.q)}&rsquo; 검색 결과가 없습니다.` : "선택한 지역에 등록된 병원이 없습니다.<br>인접 지역을 선택해 보세요.";
  }

  addEventListener("resize", () => {
    if (!M) return;
    const target = currentView === "nation" ? home : fitBox(M.prov.find((p) => p.name === state.sido).bb, currentView === "seoul" ? 0.06 : 0.04);
    vb = target.slice(); svg.setAttribute("viewBox", vb.join(" "));
    drawBadges(currentView);
  });
})();
