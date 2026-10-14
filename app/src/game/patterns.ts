// IA仕分け練習 (the portal edition): the board is chosen from a list of patterns instead of a block count.
// A pattern is a number of blocks, a number of boxes, and how the blocks are shared out:
// evenly (9 → 3/3/3) or unevenly (9 → 4/2/3). Every box shows how many blocks it takes ("0/3").
// Topics hold 5 groups of 6 keywords, so: 3–5 boxes, 2–6 blocks to a box.

export type Split = 'even' | 'random';

export interface Pattern {
  id: string;
  blocks: number;
  trays: number;
  split: Split;
}

const SHAPES: Array<[blocks: number, trays: number]> = [
  [9, 3],
  [12, 3],
  [12, 4],
  [15, 3],
  [15, 5],
  [16, 4],
  [20, 4],
  [20, 5],
  [25, 5],
];

export const PATTERNS: Pattern[] = SHAPES.flatMap(([blocks, trays]) =>
  (['even', 'random'] as const).map((split) => ({ id: `${blocks}-${trays}-${split}`, blocks, trays, split })),
);

export const DEFAULT_PATTERN = '9-3-even';

export function patternById(id: string): Pattern {
  return PATTERNS.find((p) => p.id === id) ?? PATTERNS.find((p) => p.id === DEFAULT_PATTERN)!;
}

export function patternLabel(p: Pattern): string {
  return `ブロック${p.blocks} 箱${p.trays}（仕分け数-${p.split === 'even' ? '均等' : 'ランダム'}）`;
}

const MIN_PER_TRAY = 2;
const MAX_PER_TRAY = 6;

/** How many blocks go in each box. "random" is never even: at least two boxes differ. */
export function patternSizes(p: Pattern): number[] {
  if (p.split === 'even') {
    return Array.from({ length: p.trays }, (_, i) => Math.floor(p.blocks / p.trays) + (i < p.blocks % p.trays ? 1 : 0));
  }
  for (;;) {
    const sizes = Array.from({ length: p.trays }, () => MIN_PER_TRAY);
    let rest = p.blocks - MIN_PER_TRAY * p.trays;
    while (rest > 0) {
      const open = sizes.map((s, i) => (s < MAX_PER_TRAY ? i : -1)).filter((i) => i >= 0);
      sizes[open[Math.floor(Math.random() * open.length)]]++;
      rest--;
    }
    if (sizes.some((s) => s !== sizes[0])) return sizes;
  }
}
