// Rasterise public/icon.svg into the PNG icons the PWA manifest references.
// Run with: node scripts/gen-icons.mjs
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const svg = await readFile(join(root, 'public', 'icon.svg'))

const targets = [
  { file: 'pwa-192.png', size: 192 },
  { file: 'pwa-512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
]

for (const { file, size } of targets) {
  const png = await sharp(svg, { density: 384 }).resize(size, size).png().toBuffer()
  await writeFile(join(root, 'public', file), png)
  console.log(`wrote public/${file} (${size}px)`)
}

// Maskable icon: same art, scaled to ~70% inside a full-bleed safe-zone background.
const bg = '#0f172a'
const inner = await sharp(svg, { density: 384 }).resize(360, 360).png().toBuffer()
const maskable = await sharp({
  create: { width: 512, height: 512, channels: 4, background: bg },
})
  .composite([{ input: inner, gravity: 'center' }])
  .png()
  .toBuffer()
await writeFile(join(root, 'public', 'pwa-maskable-512.png'), maskable)
console.log('wrote public/pwa-maskable-512.png (512px, maskable safe-zone)')
