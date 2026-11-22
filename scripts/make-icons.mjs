// One-off helper: render public/favicon.svg onto a solid brand background and
// export PNG icons (apple-touch-icon 180x180, logo 512x512) for search engines.
// Usage: node scripts/make-icons.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import { chromium } from 'playwright-core'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const svg = readFileSync(join(ROOT, 'public/favicon.svg'), 'utf8')
const cache = join(homedir(), 'Library/Caches/ms-playwright')
const dir = execSync(`ls "${cache}"`).toString().split('\n').filter(d => d.startsWith('chromium-')).sort().pop()
const exe = join(cache, dir, 'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')

const browser = await chromium.launch({ executablePath: exe })
for (const [size, file] of [[180, 'apple-touch-icon.png'], [512, 'logo-512.png']]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  const pad = Math.round(size * 0.14)
  await page.setContent(
    `<body style="margin:0;background:#191310;display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px">` +
      `<div style="width:${size - pad * 2}px">${svg.replace('<svg', '<svg style="width:100%;height:auto;display:block"')}</div></body>`
  )
  await page.screenshot({ path: join(ROOT, 'public', file) })
  await page.close()
}

// favicon.ico: 48x48 transparent PNG wrapped in an ICO container (same artwork as favicon.svg)
const ico = await browser.newPage({ viewport: { width: 48, height: 48 } })
await ico.setContent(
  `<body style="margin:0;background:transparent;display:flex;align-items:center;justify-content:center;width:48px;height:48px">` +
    `<div style="width:44px">${svg.replace('<svg', '<svg style="width:100%;height:auto;display:block"')}</div></body>`
)
const png = await ico.screenshot({ omitBackground: true })
const head = Buffer.alloc(22)
head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(1, 4)
head.writeUInt8(48, 6); head.writeUInt8(48, 7); head.writeUInt16LE(1, 10); head.writeUInt16LE(32, 12)
head.writeUInt32LE(png.length, 14); head.writeUInt32LE(22, 18)
writeFileSync(join(ROOT, 'public/favicon.ico'), Buffer.concat([head, png]))
await browser.close()
console.log('icons written')
