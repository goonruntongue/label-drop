// After `vite build --mode portal`: make dist-portal the portal edition's own site (IA仕分け練習).
// public/ is shared with Label Drop and Vite copies all of it, so this puts the portal's app icon
// (icons/portal/), name and title in place, and removes what only the game uses (the opening pictures,
// the characters).
// The portal edition is still an installable PWA: same file names, its own manifest values.
import { createHash } from 'node:crypto';
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist-portal';
const NAME = 'IA仕分け練習';
const edit = (file, change) => {
  const before = readFileSync(join(dist, file), 'utf8');
  const after = change(before);
  if (after === before) throw new Error(`${file}: nothing changed (did the markup change?)`);
  writeFileSync(join(dist, file), after);
};

// Icons: the portal set under the usual names.
cpSync(join('icons', 'portal'), join(dist, 'icons'), { recursive: true });
// Game-only files.
rmSync(join(dist, 'intro'), { recursive: true, force: true });
rmSync(join(dist, 'characters'), { recursive: true, force: true });

edit('manifest.webmanifest', (text) => {
  const manifest = JSON.parse(text);
  manifest.name = NAME;
  manifest.short_name = NAME;
  manifest.description = 'キーワードを箱に仕分けて名前を付ける、情報アーキテクチャ（グルーピングとラベリング）の練習';
  // The icon is light: a light splash and toolbar go with it.
  manifest.background_color = '#EAF0F8';
  manifest.theme_color = '#050C1C';
  return JSON.stringify(manifest, null, 2) + '\n';
});
edit('index.html', (html) =>
  html
    .replace(/<title>[^<]*<\/title>/, `<title>${NAME} — practice IA</title>`)
    .replace(/(name="apple-mobile-web-app-title" content=")[^"]*"/, `$1${NAME}"`)
    .replace(/(<meta name="description" content=")[^"]*"/, '$1キーワードを箱に仕分けて名前を付ける、情報アーキテクチャの練習"')
    .replace('<b>Label <span>Drop</span></b>', '<b>IA <span>仕分け練習</span></b>')
    // The mincho face is only for the game's opening.
    .replace('&family=Zen+Old+Mincho:wght@700;900', ''),
);

// Phones remember an app icon by its address: stamp the addresses with the artwork, so a new icon is fetched.
const stamp = createHash('md5').update(readFileSync(join(dist, 'icons', 'icon-512.png'))).digest('hex').slice(0, 8);
for (const file of ['index.html', 'manifest.webmanifest']) {
  edit(file, (text) => text.replace(/(icons\/[a-z0-9-]+\.png|manifest\.webmanifest)(\?v=[0-9a-f]+)?(?=")/g, `$1?v=${stamp}`));
}

// The offline list must only name files that are on this site.
const precache = join(dist, 'precache.json');
const list = JSON.parse(readFileSync(precache, 'utf8'));
list.files = list.files.filter((f) => f === './' || existsSync(join(dist, f)));
writeFileSync(precache, JSON.stringify(list, null, 1));
console.log(`${dist}: ${NAME}`);
