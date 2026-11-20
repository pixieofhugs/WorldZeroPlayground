#!/usr/bin/env node
// Renders public/favicon.svg to the install icons with Playwright (already a dependency). Run: node scripts/make-icons.mjs
import { chromium } from '@playwright/test'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const svg = readFileSync(join(root, 'public/favicon.svg'), 'utf8').replace(/<!--[\s\S]*?-->/g, '')
const fonts = ['lora-400to700i-latin', 'lora-400to700i-latin-ext']
  .map((f) => `@font-face{font-family:Lora;font-style:italic;font-weight:400 700;src:url(${pathToFileURL(join(root, `src/assets/fonts/${f}.woff2`))})}`)
  .join('')

// iOS rounds its own corners and the maskable mask crops them: both want the tile full-bleed.
const bleed = svg.replace(/ rx="[\d.]+"/g, '')
// Maskable: Android may crop to the inner 80% circle, so shrink the whole mark about the centre.
const maskable = bleed.replace(/<text/, '<g transform="translate(32 32) scale(0.8) translate(-32 -32)"><text').replace('</text>', '</text></g>')

const jobs = [
  ['icon-192.png', svg, 192],
  ['icon-512.png', svg, 512],
  ['icon-maskable-512.png', maskable, 512],
  ['apple-touch-icon.png', bleed, 180],
]
const dir = mkdtempSync(join(tmpdir(), 'wz-icons-'))
const browser = await chromium.launch()
for (const [name, markup, size] of jobs) {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  // The favicon swaps tiles under a dark OS scheme; pin light so the icon is the same everywhere.
  await page.emulateMedia({ colorScheme: 'light' })
  const file = join(dir, `${name}.html`)
  writeFileSync(file, `<style>${fonts}html,body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${markup}`)
  await page.goto(pathToFileURL(file).href)
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: join(root, 'public', name), omitBackground: true })
  await page.close()
}
await browser.close()
