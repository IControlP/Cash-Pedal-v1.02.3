// Renders the social/search preview image and the raster logo into public/.
//
//   npm install --no-save playwright   # Chromium is used headless
//   node scripts/generate-brand-images.mjs
//
// public/og-image.png (1200×630) — og:image / twitter:image, shown by Bing,
//   Copilot, Google Discover and social apps when a page is shared or cited.
// public/logo.png (512×512) — Organization logo in JSON-LD (search engines
//   want a raster logo of at least 112px; the SVG favicon doesn't qualify).
//
// Re-run after changing brand colours or the tagline, and commit the PNGs.
import { chromium } from 'playwright'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const BG = '#0f0520'
const ACCENT = '#FFB800'

const fonts = '<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Plus+Jakarta+Sans:wght@500;600&display=block" rel="stylesheet">'
const base = `*{margin:0;box-sizing:border-box}body{background:${BG};color:#fff;font-family:'Plus Jakarta Sans',sans-serif}`

const og = `<!doctype html><html><head>${fonts}<style>${base}
  .wrap{width:1200px;height:630px;padding:72px 80px;display:flex;flex-direction:column;justify-content:space-between;
    background:radial-gradient(900px 500px at 85% 15%, rgba(255,184,0,.18), transparent 60%), ${BG}}
  .brand{font-family:Syne;font-weight:800;font-size:44px;display:flex;align-items:center;gap:14px}
  .brand b{color:${ACCENT}}
  h1{font-family:Syne;font-weight:800;font-size:76px;line-height:1.05;letter-spacing:-1px;max-width:980px}
  h1 span{color:${ACCENT}}
  .sub{font-size:30px;color:rgba(255,255,255,.72);font-weight:500}
  .row{display:flex;justify-content:space-between;align-items:flex-end}
  .url{font-size:28px;font-weight:600;color:${ACCENT}}
</style></head><body><div class="wrap">
  <div class="brand"><b>$</b>Cash Pedal</div>
  <h1>How much car can you <span>really</span> afford?</h1>
  <div class="row"><div class="sub">Payment + gas + insurance + maintenance, for your state.<br>Free calculators &amp; guides.</div><div class="url">cashpedal.io</div></div>
</div></body></html>`

const logo = `<!doctype html><html><head>${fonts}<style>${base}
  .wrap{width:512px;height:512px;border-radius:112px;background:${BG};display:flex;align-items:center;justify-content:center;
    font-family:Syne;font-weight:800;font-size:360px;color:${ACCENT};line-height:1;padding-bottom:20px}
</style></head><body style="background:transparent"><div class="wrap">$</div></body></html>`

const browser = await chromium.launch()
for (const [file, html, width, height] of [['og-image.png', og, 1200, 630], ['logo.png', logo, 512, 512]]) {
  const page = await browser.newPage({ viewport: { width, height } })
  await page.setContent(html, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: join(root, 'public', file), omitBackground: file === 'logo.png' })
  await page.close()
  console.log(`wrote public/${file}`)
}
await browser.close()
