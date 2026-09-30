import * as THREE from 'three';
import {
  BLOCK_D,
  BLOCK_H,
  CAMERA_Z,
  FOV,
  TRAY_BACK_D,
  TRAY_DEPTH,
  TRAY_FLOOR_T,
  TRAY_TOTAL_H,
  TRAY_WALL,
  TRAY_Z,
} from './runtime';

export interface Metrics {
  camZ: number;
  tanHalf: number;
  vh0: number;
  vw0: number;
  vwT: number;
  trayY: number;
  trayGap: number;
  fieldLeft: number;
  fieldRight: number;
  fieldTop: number;
  fieldBottom: number;
}

/** World-space extents of the play area for a canvas of the given CSS size. */
export function metrics(width: number, height: number): Metrics {
  const aspect = width / Math.max(height, 1);
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  // Pull the camera back on narrow screens so all trays stay visible.
  const camZ = aspect < 1.25 ? CAMERA_Z * Math.sqrt(1.25 / aspect) : CAMERA_Z;
  const vh0 = 2 * camZ * tanHalf;
  const vw0 = vh0 * aspect;
  const vhT = 2 * (camZ - TRAY_Z) * tanHalf;
  const vwT = vhT * aspect;
  const trayY = -vhT / 2 + 0.62;
  const trayTopFraction = (trayY + TRAY_TOTAL_H) / (vhT / 2);
  return {
    camZ,
    tanHalf,
    vh0,
    vw0,
    vwT,
    trayY,
    trayGap: 0.35,
    fieldLeft: -vw0 / 2 + 0.6,
    fieldRight: vw0 / 2 - 0.6,
    fieldTop: vh0 / 2 - 0.95, // leaves room for the hint / status banners
    fieldBottom: trayTopFraction * (vh0 / 2) + 0.4,
  };
}

export function trayWidth(m: Metrics, count: number): number {
  return Math.min(2.7, (m.vwT * 0.9 - (count - 1) * m.trayGap) / count);
}

export function trayX(m: Metrics, index: number, count: number, width: number): number {
  return (index - (count - 1) / 2) * (width + m.trayGap);
}

/** Deterministic pseudo-random in [0, 1). */
export function rand(seed: number, k: number): number {
  const x = Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** Stable hash of a string in [0, 1). */
export function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

interface Entry {
  id: string;
  width: number;
  seed: number;
}

function packGreedy(list: Entry[], areaW: number, gapX: number, scale: number): Entry[][] {
  const rows: Entry[][] = [];
  let row: Entry[] = [];
  let w = 0;
  for (const e of list) {
    const ew = e.width * scale;
    const next = row.length ? w + gapX + ew : ew;
    if (row.length && next > areaW) {
      rows.push(row);
      row = [e];
      w = ew;
    } else {
      row.push(e);
      w = next;
    }
  }
  if (row.length) rows.push(row);
  return rows;
}

// Same row count as greedy packing, but with row widths balanced so the last row is not a stub.
function packBalanced(list: Entry[], areaW: number, gapX: number, scale: number): Entry[][] {
  const count = packGreedy(list, areaW, gapX, scale).length;
  if (count <= 1) return [list];
  const total = list.reduce((sum, e) => sum + e.width * scale, 0) + gapX * (list.length - count);
  const target = total / count;
  const rows: Entry[][] = [];
  let row: Entry[] = [];
  let w = 0;
  for (const e of list) {
    const ew = e.width * scale;
    const next = row.length ? w + gapX + ew : ew;
    const full = next > areaW || (next - ew / 2 > target && rows.length < count - 1);
    if (row.length && full) {
      rows.push(row);
      row = [e];
      w = ew;
    } else {
      row.push(e);
      w = next;
    }
  }
  if (row.length) rows.push(row);
  return rows;
}

/** Non-overlapping, loosely jittered home positions for the floating blocks. */
export function layoutField(list: Entry[], m: Metrics): { homes: Map<string, THREE.Vector3>; scale: number } {
  const homes = new Map<string, THREE.Vector3>();
  if (!list.length) return { homes, scale: 1 };
  const areaW = m.fieldRight - m.fieldLeft;
  const areaH = Math.max(1, m.fieldTop - m.fieldBottom);
  const gapX = 0.32;
  const minGapY = 0.28;

  // Start above 1 so a sparse board (10-15 blocks) gets bigger, easier-to-read blocks.
  let scale = 1.25;
  let rows: Entry[][] = [];
  for (;;) {
    rows = packBalanced(list, areaW, gapX, scale);
    const h = rows.length * BLOCK_H * scale + (rows.length - 1) * minGapY;
    if (h <= areaH || scale <= 0.55) break;
    scale -= 0.05;
  }

  const rowH = BLOCK_H * scale;
  const n = rows.length;
  const gapY = n > 1 ? THREE.MathUtils.clamp((areaH - n * rowH) / (n - 1), 0.08, 1.3) : 0;
  const totalH = n * rowH + (n - 1) * gapY;
  const midY = (m.fieldTop + m.fieldBottom) / 2;

  rows.forEach((row, r) => {
    const rowW = row.reduce((sum, e) => sum + e.width * scale, 0) + (row.length - 1) * gapX;
    const slack = Math.max(0, areaW - rowW);
    const extraGap = row.length > 1 ? Math.min(0.6, (slack * 0.5) / (row.length - 1)) : 0;
    const usedW = rowW + extraGap * (row.length - 1);
    let x = m.fieldLeft + (areaW - usedW) / 2 + (rand(r + 1, 7) - 0.5) * Math.min(0.8, areaW - usedW);
    const y = midY + totalH / 2 - rowH / 2 - r * (rowH + gapY);
    for (const e of row) {
      const w = e.width * scale;
      const s = e.seed * 1000;
      const jx = (rand(s, 1) - 0.5) * Math.min(0.16, gapX * 0.5 + extraGap * 0.5);
      const jy = (rand(s, 2) - 0.5) * Math.min(0.2, gapY * 0.6);
      const z = -0.55 + rand(s, 3) * 0.9;
      homes.set(e.id, new THREE.Vector3(x + w / 2 + jx, y + jy, z));
      x += w + gapX + extraGap;
    }
  });
  return { homes, scale };
}

export const TRAY_ROWS = 3;
// Usable cavity: between the back block's front face and the front wall's inner face.
const CAVITY_BACK = -TRAY_DEPTH / 2 + 0.005 + TRAY_BACK_D + 0.03;
const CAVITY_FRONT = TRAY_DEPTH / 2 - TRAY_WALL - 0.03;
const SLOTS_PER_LAYER = TRAY_ROWS * 2;
const LAY_FLAT = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
const yawQ = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);

/**
 * Local position of a block lying face-up on the tray floor: 2 columns × 3 rows filled back to front,
 * then stacked in layers. Returns its scale.
 */
export function slotLocal(index: number, trayW: number, blockW: number, out: THREE.Vector3): number {
  const innerW = trayW - TRAY_WALL * 2;
  const pitch = (CAVITY_FRONT - CAVITY_BACK) / TRAY_ROWS;
  const scale = Math.min(0.5, (innerW * 0.46) / blockW, (pitch * 0.92) / BLOCK_H);
  const layer = Math.floor(index / SLOTS_PER_LAYER);
  const slot = index % SLOTS_PER_LAYER;
  const row = Math.floor(slot / 2);
  const col = slot % 2;
  const thickness = BLOCK_D * scale;
  out.set(
    (col === 0 ? -1 : 1) * innerW * 0.25 + (rand(index, 11) - 0.5) * 0.04,
    TRAY_FLOOR_T + thickness / 2 + layer * thickness * 1.02,
    CAVITY_BACK + pitch * (row + 0.5),
  );
  return scale;
}

/** Local rotation for a slot: lying flat (face up) with a slight natural yaw. */
export function slotRotation(index: number, out: THREE.Quaternion): THREE.Quaternion {
  yawQ.setFromAxisAngle(UP, (rand(index, 13) - 0.5) * 0.14);
  return out.copy(yawQ).multiply(LAY_FLAT);
}
