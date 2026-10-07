// Static build: copies src → public, self-hosts Pretendard, projects the
// Korea boundary GeoJSON into SVG paths and converts the Dropshot images to WebP.
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const OUT = "public";
const GEO = "https://raw.githubusercontent.com/southkorea/southkorea-maps/master/kostat/2013/json";
const BIG = [2000, 1200, 640], CARD = [800, 480];
const IMAGES = {
  hero: ["mcp_ef072415d32441989b351e75368ba0f6", BIG],
  story: ["mcp_42770e5beb9a4168b6e8b6962a966a54", BIG],
  clinic: ["mcp_8f9d97ab0f994b97ab565f5154043b60", BIG],
  diag: ["mcp_ee6325485bce440fb9d32a4e04127351", BIG],
  "c-prp": ["mcp_ed4a8bf4169c435590ac38b3cf1fdba6", CARD],
  "c-laser": ["mcp_85878bfd00a14cb2bdcf7915956c75a9", CARD],
  "c-magnet": ["mcp_236d2fb4973e49dc9cd265bf8cd9dd3d", CARD],
  "c-rf": ["mcp_e9e90aa692454b8aa554b53c7b37f9d5", CARD],
  "c-vaccine": ["mcp_97db1de3616d4cbf8c358d210e289812", CARD],
  "c-cyto": ["mcp_70f8b7308c9b4f84b54f9bb11dd8a269", CARD],
  "c-fina": ["mcp_2e97b5bdb2e442fb8d2cdd8bda350dd3", CARD],
  "c-duta": ["mcp_955445997da948e1b62de1b630f56bf2", CARD],
  "c-topical": ["mcp_a01fc3e969d540ea970fd23bd1602e02", CARD],
  "c-oral": ["mcp_8cee30b5dc354fea940c9c8308ce7e28", CARD],
  "c-tricho": ["mcp_4a60308e956a4437a83e46d825f7da10", CARD],
  "c-desk": ["mcp_63a13b764a7443f380810981141072d7", CARD],
};
const YT_VIDEO = "TFhDyC6f0nU";
const LOCAL = process.env.LOCAL_BUILD === "1";

await rm(OUT, { recursive: true, force: true });
await cp("src", OUT, { recursive: true });

// 1. Pretendard (OFL-1.1) — dynamic subset, self-hosted
const fontSrc = "node_modules/pretendard/dist/web/variable";
await mkdir(`${OUT}/assets/fonts`, { recursive: true });
await cp(`${fontSrc}/woff2-dynamic-subset`, `${OUT}/assets/fonts/woff2-dynamic-subset`, { recursive: true });
const css = await readFile(`${fontSrc}/pretendardvariable-dynamic-subset.css`, "utf8");
await writeFile(`${OUT}/assets/fonts/pretendard.css`, css);
await cp("node_modules/pretendard/LICENSE", `${OUT}/assets/fonts/LICENSE.txt`).catch(() => {});

// 2. Map paths
async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return r.json();
}
const prov = await getJSON(`${GEO}/skorea_provinces_geo_simple.json`);
const muni = await getJSON(`${GEO}/skorea_municipalities_geo_simple.json`);
const SHORT = { 11: "서울", 21: "부산", 22: "대구", 23: "인천", 24: "광주", 25: "대전", 26: "울산", 29: "세종", 31: "경기", 32: "강원", 33: "충북", 34: "충남", 35: "전북", 36: "전남", 37: "경북", 38: "경남", 39: "제주" };
const polys = (g) => (g.type === "Polygon" ? [g.coordinates] : g.coordinates);
const k = Math.cos((36 * Math.PI) / 180);
let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
for (const f of prov.features) for (const p of polys(f.geometry)) for (const ring of p) for (const [x, y] of ring) {
  minx = Math.min(minx, x * k); maxx = Math.max(maxx, x * k); miny = Math.min(miny, y); maxy = Math.max(maxy, y);
}
const H = 1000, s = H / (maxy - miny), W = (maxx - minx) * s;
const P = (x, y) => [(x * k - minx) * s, (maxy - y) * s];
const r = (v, n) => +v.toFixed(n);
function toPath(g, prec) {
  let d = "";
  for (const p of polys(g)) for (const ring of p) {
    const pts = [];
    for (const c of ring) {
      const [x, y] = P(...c).map((v) => r(v, prec));
      const last = pts[pts.length - 1];
      if (!last || last[0] !== x || last[1] !== y) pts.push([x, y]);
    }
    if (pts.length >= 3) d += "M" + pts.map((q) => q.join(",")).join("L") + "Z";
  }
  return d;
}
function bbox(g, acc = [Infinity, Infinity, -Infinity, -Infinity]) {
  for (const p of polys(g)) for (const ring of p) for (const c of ring) {
    const [x, y] = P(...c);
    acc = [Math.min(acc[0], x), Math.min(acc[1], y), Math.max(acc[2], x), Math.max(acc[3], y)];
  }
  return acc;
}
const map = { W: r(W, 1), H, prov: [], seoul: [], gg: [] };
for (const f of prov.features) {
  const c = f.properties.code;
  map.prov.push({ code: c, name: SHORT[c], d: toPath(f.geometry, 1), bb: bbox(f.geometry).map((v) => r(v, 2)) });
}
const gg = new Map();
for (const f of muni.features) {
  const { code, name } = f.properties;
  if (code.startsWith("11")) map.seoul.push({ name, d: toPath(f.geometry, 2), bb: bbox(f.geometry).map((v) => r(v, 2)) });
  else if (code.startsWith("31")) {
    const city = name.match(/^(.+?[시군])/)[1];
    const e = gg.get(city) || { name: city, d: "", bb: undefined };
    e.d += toPath(f.geometry, 2);
    e.bb = bbox(f.geometry, e.bb);
    gg.set(city, e);
  }
}
map.gg = [...gg.values()].map((e) => ({ ...e, bb: e.bb.map((v) => r(v, 2)) }));
// label anchors (lon, lat) so crowded areas (서울·인천·경기) don't collide
const ANCHOR = { 서울: [126.99, 37.555], 경기: [127.45, 37.76], 인천: [126.7, 37.46], 강원: [128.3, 37.75], 충북: [127.7, 36.78], 충남: [126.85, 36.55], 대전: [127.39, 36.34], 세종: [127.26, 36.58], 전북: [127.15, 35.75], 광주: [126.85, 35.16], 전남: [126.95, 34.86], 경북: [128.75, 36.38], 대구: [128.6, 35.86], 울산: [129.25, 35.56], 경남: [128.25, 35.3], 부산: [129.05, 35.17], 제주: [126.55, 33.38] };
map.anchor = Object.fromEntries(Object.entries(ANCHOR).map(([n, [x, y]]) => [n, P(x, y).map((v) => r(v, 1))]));
await writeFile(`${OUT}/data/map.json`, JSON.stringify(map));

// 3. Images (Dropshot · GPT Image 2.0 originals) → WebP
await mkdir(`${OUT}/assets/img`, { recursive: true });
const sharp = (await import("sharp")).default;
for (const [name, [job, widths]] of Object.entries(IMAGES)) {
  const url = `https://cdn.aistudio.dropshot.io/public/jobs/prod/${job}/output/output_0.png`;
  let buf;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status}`);
    buf = Buffer.from(await res.arrayBuffer());
  } catch (e) {
    if (!LOCAL) throw new Error(`image ${name} download failed: ${e.message}`);
    const local = `.local-img/${name}.png`;
    buf = existsSync(local) ? await readFile(local)
      : await sharp({ create: { width: 1536, height: 1024, channels: 3, background: "#0b1f3a" } }).png().toBuffer();
  }
  for (const w of widths) {
    await sharp(buf).resize({ width: w, withoutEnlargement: true }).webp({ quality: 78 }).toFile(`${OUT}/assets/img/${name}-${w}.webp`);
  }
  await sharp(buf).resize({ width: 480 }).jpeg({ quality: 62 }).toFile(`${OUT}/assets/img/${name}-thumb.jpg`);
}
// 3b. 모모형 프로필 사진 (client-provided, staged on the Dropshot CDN)
const MOMO = "https://cdn.aistudio.dropshot.io/public/mcp-uploads/prod/PX017JIG/8ccf6a0725954b1a806a04bc90cc7d34/momo-profile.jpg";
try {
  const r = await fetch(MOMO);
  if (!r.ok) throw new Error(`${r.status}`);
  await writeFile(`${OUT}/assets/img/momo.jpg`, Buffer.from(await r.arrayBuffer()));
} catch (e) {
  if (!LOCAL) throw new Error(`momo photo download failed: ${e.message}`);
}
// 3c. 모모형 프로필 화보 (client-provided; pre-cropped, product bottle cropped out)
const UP = "https://cdn.aistudio.dropshot.io/public/mcp-uploads/prod/PX017JIG/";
const PORTRAITS = [
  "5d2f8c4cfbd94929ad2224924ec5629f/momo-suit-900.webp",
  "9501b229a9ee4edca53f831f2a647f86/momo-suit-sq.webp",
  "7df464fb35b64198bed1fb07d14ba9e3/momo-sweater-760.webp",
  "37df25955974458fb4bf65342b369211/momo-sweater-face.webp",
  "f1eeb7d6197943a795046bb9362f5c61/momo-stamp-900.webp",
];
for (const p of PORTRAITS) {
  try {
    const r = await fetch(UP + p);
    if (!r.ok) throw new Error(`${r.status}`);
    await writeFile(`${OUT}/assets/img/${p.split("/")[1]}`, Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    if (!LOCAL) throw new Error(`portrait download failed ${p}: ${e.message}`);
  }
}

// 4. YouTube channel link for 삼탈모TV (non-fatal: page falls back to the video URL)
try {
  const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${YT_VIDEO}&format=json`);
  if (r.ok) {
    const o = await r.json();
    await writeFile(`${OUT}/data/yt.json`, JSON.stringify({ author_name: o.author_name, author_url: o.author_url, title: o.title }));
    console.log("yt", o.author_name, o.author_url);
  } else console.log("yt oembed", r.status);
} catch (e) { console.log("yt oembed failed", e.message); }
console.log("build ok", { prov: map.prov.length, seoul: map.seoul.length, gg: map.gg.length });
