// Rasterize the app icons into the PNGs the PWA manifest and iOS need (run: npm run icons).
//  - Label Drop (public/icons/): icons/icon.svg
//  - IA仕分け練習, the portal edition (icons/portal/, outside public/ so Label Drop doesn't ship it):
//    icons/icon-portal.svg. scripts/portal-dist.mjs copies that set into the portal build.
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const at = (path) => fileURLToPath(new URL(path, import.meta.url));

const targets = [
  { file: 'apple-touch-icon.png', size: 180 }, // iOS home screen
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  // Maskable: artwork kept inside the central safe zone (Android crops to circles/squircles).
  { file: 'icon-maskable-512.png', size: 512, pad: 0.1 },
  { file: 'favicon-32.png', size: 32 },
];

for (const { src, out, background } of [
  { src: '../icons/icon.svg', out: '../public/icons/', background: '#050C1C' },
  { src: '../icons/icon-portal.svg', out: '../icons/portal/', background: '#EAF0F8' },
]) {
  await mkdir(at(out), { recursive: true });
  for (const t of targets) {
    const inner = Math.round(t.size * (1 - 2 * (t.pad ?? 0)));
    const art = await sharp(at(src), { density: 384 }).resize(inner, inner).png().toBuffer();
    const img = t.pad
      ? sharp({ create: { width: t.size, height: t.size, channels: 4, background } }).composite([{ input: art, gravity: 'center' }])
      : sharp(art);
    await img.png().toFile(at(out) + t.file);
    console.log('wrote', out.replace('../', ''), t.file);
  }
}
