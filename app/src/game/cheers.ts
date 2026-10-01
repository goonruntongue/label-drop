// One-line praise shown on a clear / level up. Picked once per result so the banner and the
// result panel always show the same line.
import type { Grade } from './grading';

const BY_STARS: Record<1 | 2 | 3, string[]> = {
  3: [
    '完璧な仕分け！ 迷う人がいない売り場です。',
    'どの言葉も、ちょうどいい居場所に収まりました。',
    '見る人の目線で分けられています。お見事！',
    'ラベルを見ただけで中身がわかる。理想の形です。',
    '情報が気持ちよく整いました。',
    'この箱なら、初めての人もすぐ見つけられます。',
  ],
  2: [
    'いい仕分け！ あと一歩で完璧です。',
    '迷いやすい言葉も、上手にさばけています。',
    '探す人の気持ちが見えてきましたね。',
    '軸がぶれていません。その調子！',
    'ラベルがぐっと伝わるようになりました。',
  ],
  1: [
    'クリア！ 分け方の軸が見えてきました。',
    '一歩前進。間違えた語は、次へのヒントです。',
    '模範と見比べると、もっと強くなれます。',
    'まずは形になりました。ここから磨いていきましょう。',
  ],
};

/** Keyed by the level just reached. */
const LEVEL_UP: Record<number, string> = {
  2: '言葉を分ける魔法を覚えました。',
  3: '次は、箱に名前を与える力を磨きましょう。',
  4: '散らかった情報も、もう怖くありません。',
  5: '分け方の「軸」を操れるようになりました。',
  6: '情報の骨組みが見えるようになってきました。',
  7: 'ひと目で伝わる名前を生み出す力を得ました。',
  8: '賢者への道が、いま開けました。',
  9: '残るは最終試験のみ。あなたなら届きます。',
  10: '最終試験へ。★5つで、伝説の大賢者に。',
};

const picked = new WeakMap<Grade, string>();

/** The praise line for this result, or null when there is nothing to celebrate (★0 / practice). */
export function cheerFor(result: Grade, levelUpTo: number | null): string | null {
  if (result.stars <= 0) return null;
  const cached = picked.get(result);
  if (cached) return cached;
  const pool = BY_STARS[Math.min(3, result.stars) as 1 | 2 | 3];
  const line = (levelUpTo && LEVEL_UP[levelUpTo]) || pool[Math.floor(Math.random() * pool.length)];
  picked.set(result, line);
  return line;
}

/** The praise line for reaching a level (used by the debug preview). */
export function levelUpCheer(level: number): string | null {
  return LEVEL_UP[level] ?? null;
}
