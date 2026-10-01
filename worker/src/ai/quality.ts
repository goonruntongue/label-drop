// The embedding check (SPEC 7.2 ④), pure so it can be tested with made-up vectors:
// - cohesion: share of keywords whose closest group centroid is their own group;
// - near-duplicates: two keywords with cosine similarity above 0.92 are the same thing twice.

export const NEAR_DUPLICATE = 0.92;

function unit(v: number[]): number[] {
  const n = Math.hypot(...v) || 1;
  return v.map((x) => x / n);
}
const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * (b[i] ?? 0), 0);

export interface QualityResult {
  cohesion: number;
  duplicates: [number, number][];
}

/** `vectors[i]` belongs to group `groupOf[i]`. */
export function quality(vectors: number[][], groupOf: number[]): QualityResult {
  const units = vectors.map(unit);
  const groups = [...new Set(groupOf)];
  const centroids = new Map(
    groups.map((g) => {
      const members = units.filter((_, i) => groupOf[i] === g);
      const sum = members.reduce((acc, v) => acc.map((x, k) => x + v[k]), new Array(units[0]?.length ?? 0).fill(0) as number[]);
      return [g, unit(sum)] as const;
    }),
  );
  let home = 0;
  units.forEach((v, i) => {
    let best = groupOf[i];
    let bestSim = -Infinity;
    for (const [g, c] of centroids) {
      const s = dot(v, c);
      if (s > bestSim) [best, bestSim] = [g, s];
    }
    if (best === groupOf[i]) home++;
  });
  const duplicates: [number, number][] = [];
  for (let i = 0; i < units.length; i++) {
    for (let j = i + 1; j < units.length; j++) if (dot(units[i], units[j]) > NEAR_DUPLICATE) duplicates.push([i, j]);
  }
  return { cohesion: units.length ? home / units.length : 0, duplicates };
}
