import { create } from 'zustand';
import { PROBLEMS, topicsOf } from '../data/problems';
import { grade, type Grade } from '../game/grading';
import { balancedSizes, levelDef, MAX_LEVEL, sizesForLevel, STARS_TO_LEVEL_UP } from '../game/levels';
import { THEMES, type ThemeId } from '../theme/themes';

export const TRAY_GLYPHS = ['◆', '●', '▲', '■', '★'] as const;
export const MIN_TRAYS = 3;
export const MAX_TRAYS = 5;

export interface Item {
  id: string;
  text: string;
  desc: string;
}

export interface Tray {
  id: string;
  label: string;
  colorIndex: number;
  /** How many blocks this tray takes, when shown to the player (scaffold for early levels). */
  capacity?: number;
}

export interface Move {
  itemId: string;
  from: string | null;
  to: string | null;
}

export interface Tuning {
  floatAmp: number;
  floatSpeed: number;
  throwSpeed: number;
  aimAngle: number;
  hitExpand: number;
  parallax: number;
  bloom: number;
  guide: boolean;
}

export type Mode = 'level' | 'free';

const reducedMotion =
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export const DEFAULT_TUNING: Tuning = {
  floatAmp: reducedMotion ? 0 : 0.14,
  floatSpeed: 1,
  throwSpeed: 850,
  aimAngle: 22,
  hitExpand: 1.3,
  parallax: reducedMotion ? 0 : 0.5,
  bloom: 0.8,
  guide: true,
};

// ── persistence (all best-effort; storage may be unavailable) ──
function load<T>(key: string, fallback: T, parse: (raw: string) => T | undefined): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) return parse(raw) ?? fallback;
  } catch {
    // Non-critical.
  }
  return fallback;
}
function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Non-critical.
  }
}

const TUNING_KEY = 'practice-ia:p0:tuning';
const THEME_KEY = 'practice-ia:theme';
const BLOCK_COUNT_KEY = 'practice-ia:block-count';
const PROGRESS_KEY = 'practice-ia:progress';
const SAVE_SLOTS_KEY = 'practice-ia:save-slots:v1';
export const SAVE_SLOT_COUNT = 3;

interface Progress {
  mode: Mode;
  level: number;
  levelStars: number;
  /** Lifetime stats in level mode, shown on the clear screen. */
  totalStars: number;
  rounds: number;
}

const CLEARS_KEY = 'practice-ia:clears';

/** Times the Lv10 final exam was cleared (the 👑 badge). Removed together with a progress reset. */
export interface Clears {
  count: number;
  lastAt: string | null;
}

const loadClears = () =>
  load<Clears>(CLEARS_KEY, { count: 0, lastAt: null }, (raw) => {
    const c = JSON.parse(raw) as Partial<Clears>;
    return { count: Math.max(0, Number(c.count) || 0), lastAt: typeof c.lastAt === 'string' ? c.lastAt : null };
  });

export interface SaveSnapshot {
  mode: Mode; level: number; levelStars: number; problemIndex: number;
  items: Item[]; assign: Record<string, string | null>; assignedAt: Record<string, number>;
  trays: Tray[]; history: Move[]; muted: boolean; tuning: Tuning; theme: ThemeId;
  blockCount: number; axisHintShown: boolean; assistUsed: { some: number; all: boolean };
  result: Grade | null; resultOpen: boolean; levelUpTo: number | null; briefingOpen: boolean;
}

export interface SaveSlot { savedAt: string; snapshot: SaveSnapshot }

function loadSaveSlots(): Array<SaveSlot | null> {
  return load<Array<SaveSlot | null>>(SAVE_SLOTS_KEY, Array(SAVE_SLOT_COUNT).fill(null), (raw) => {
    const slots = JSON.parse(raw);
    return Array.isArray(slots)
      ? Array.from({ length: SAVE_SLOT_COUNT }, (_, i) => slots[i]?.snapshot ? slots[i] as SaveSlot : null)
      : undefined;
  });
}

const loadTuning = () => load<Tuning>(TUNING_KEY, DEFAULT_TUNING, (raw) => ({ ...DEFAULT_TUNING, ...(JSON.parse(raw) as Partial<Tuning>) }));
const loadTheme = () => load<ThemeId>(THEME_KEY, 'midnight-blue', (raw) => (raw in THEMES ? (raw as ThemeId) : undefined));
const loadProgress = () =>
  load<Progress>(PROGRESS_KEY, { mode: 'level', level: 1, levelStars: 0, totalStars: 0, rounds: 0 }, (raw) => {
    const p = JSON.parse(raw) as Partial<Progress>;
    return {
      mode: p.mode === 'free' ? 'free' : 'level',
      level: Math.min(MAX_LEVEL, Math.max(1, Number(p.level) || 1)),
      levelStars: Math.max(0, Number(p.levelStars) || 0),
      totalStars: Math.max(0, Number(p.totalStars) || 0),
      rounds: Math.max(0, Number(p.rounds) || 0),
    };
  });

export const MIN_BLOCKS = 10;
export const MAX_BLOCKS = 30;
/** Target items per box (rule of thumb from card sorting: 3–8 per group, ~6 is comfortable). */
export const ITEMS_PER_TRAY = 6;

export function clampBlockCount(n: number): number {
  return Math.min(MAX_BLOCKS, Math.max(MIN_BLOCKS, Math.round(n)));
}
const loadBlockCount = () => load<number>(BLOCK_COUNT_KEY, MAX_BLOCKS, (raw) => (Number(raw) ? clampBlockCount(Number(raw)) : undefined));

/** Free mode: ceil(keywords ÷ 6), kept within 3–5 (10–18 → 3, 19–24 → 4, 25–30 → 5). */
export function trayCountFor(blockCount: number): number {
  return Math.min(MAX_TRAYS, Math.max(MIN_TRAYS, Math.ceil(blockCount / ITEMS_PER_TRAY)));
}

function shuffle<T>(list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

let traySeq = 0;
let moveSeq = 0;

/**
 * A board: one reference group per size in `sizes` (groups chosen at random), `sizes[i]` keywords from each,
 * and exactly as many trays. Capacities are attached to trays (shuffled) only when the level shows them.
 */
function freshBoard(problemIndex: number, sizes: number[], showCapacity: boolean) {
  const problem = PROBLEMS[problemIndex];
  const groups = shuffle(problem.groups.map((group, gi) => ({ group, gi }))).slice(0, sizes.length);
  const items = shuffle(
    groups.flatMap(({ group, gi }, i) =>
      shuffle(group.items.map((kw, ii) => ({ id: `${problem.id}-${gi}-${ii}`, text: kw.text, desc: kw.desc }))).slice(0, sizes[i]),
    ),
  );
  const capacities = shuffle(sizes);
  return {
    problemIndex,
    items,
    assign: Object.fromEntries(items.map((item) => [item.id, null])) as Record<string, string | null>,
    assignedAt: {} as Record<string, number>,
    trays: sizes.map((_, i): Tray => ({
      id: `tray-${++traySeq}`,
      label: '',
      colorIndex: i,
      capacity: showCapacity ? capacities[i] : undefined,
    })),
    selected: null as string | null,
    history: [] as Move[],
    dragTarget: null as string | null,
    axisHintShown: false,
    assistUsed: { some: 0, all: false },
    result: null as Grade | null,
    resultOpen: false,
    levelUpTo: null as number | null,
    briefingOpen: true,
  };
}

function boardFor(mode: Mode, level: number, problemIndex: number, blockCount: number) {
  if (mode === 'level') {
    const def = levelDef(level);
    return freshBoard(problemIndex, sizesForLevel(level), def.showCapacity);
  }
  return freshBoard(problemIndex, balancedSizes(blockCount, trayCountFor(blockCount)), false);
}

/**
 * Level mode picks a fresh topic each round, widening with level so domain knowledge never blocks early practice:
 * Lv1–3 everyday things, Lv4–6 + everyday services/apps, Lv7+ everything including professional web IA.
 */
function topicFor(mode: Mode, level: number, current: number): number {
  if (mode !== 'level') return current;
  const pool = level <= 3 ? topicsOf('everyday') : level <= 6 ? topicsOf('everyday', 'service') : PROBLEMS.map((_, i) => i);
  const others = pool.filter((i) => i !== current);
  const choices = others.length ? others : pool;
  return choices[Math.floor(Math.random() * choices.length)];
}

export interface GameState {
  mode: Mode;
  level: number;
  /** Stars collected toward the next level. */
  levelStars: number;
  problemIndex: number;
  items: Item[];
  assign: Record<string, string | null>;
  assignedAt: Record<string, number>;
  trays: Tray[];
  selected: string | null;
  history: Move[];
  dragTarget: string | null;
  muted: boolean;
  tuning: Tuning;
  tuningOpen: boolean;
  announcement: string;
  theme: ThemeId;
  blockCount: number;
  hintOpen: boolean;
  axisHintShown: boolean;
  assistUsed: { some: number; all: boolean };
  /** Answer check for the current board (null while playing). Once set, the board is locked until the next round. */
  result: Grade | null;
  resultOpen: boolean;
  openResult(): void;
  /** Set when the last submit raised the level. */
  levelUpTo: number | null;
  /** The brief is shown before each board starts. */
  briefingOpen: boolean;
  /** Keyword whose meaning is being shown (hover / long-press). */
  peek: { id: string; x: number; y: number } | null;
  /** Lifetime level-mode stats (shown on the clear screen). */
  totalStars: number;
  rounds: number;
  /** 👑 badge: how many times the Lv10 final exam was cleared. */
  clears: Clears;
  /** Bumped on every answer check (not on loading a save), so effects play only for fresh results. */
  submitSeq: number;
  /** The clear celebration is on screen. */
  celebrating: boolean;
  /** After the celebration: back to Lv1 with a fresh board (the badge stays). */
  finishCelebration(): void;
  /** Debug (?debug): jump to a level / star count, replay the celebration, remove the badge. */
  debugSetProgress(level: number, levelStars: number): void;
  debugCelebrate(): void;
  debugClearBadge(): void;

  setMode(mode: Mode): void;
  newRound(): void;
  submit(): void;
  closeResult(): void;
  dismissBriefing(): void;
  openBriefing(): void;
  resetProgress(): void;
  setPeek(peek: { id: string; x: number; y: number } | null): void;
  toggleHint(): void;
  revealAxisHint(): void;
  recordAssist(kind: 'some' | 'all'): void;
  setTheme(theme: ThemeId): void;
  setBlockCount(count: number): void;
  loadProblem(index: number): void;
  moveItem(itemId: string, to: string | null, record?: boolean): void;
  undo(): Move | null;
  setLabel(id: string, label: string): void;
  select(id: string | null): void;
  setDragTarget(id: string | null): void;
  setTuning(patch: Partial<Tuning>): void;
  resetTuning(): void;
  toggleMute(): void;
  toggleTuning(): void;
  saveSlots: Array<SaveSlot | null>;
  saveToSlot(slot: number): void;
  loadFromSlot(slot: number): boolean;
}

const initialProgress = loadProgress();
const initialBlockCount = loadBlockCount();
const initialTopic = topicFor(initialProgress.mode, initialProgress.level, -1);
const initialSaveSlots = loadSaveSlots();

export const useGame = create<GameState>()((set, get) => {
  const saveProgress = () => {
    const { mode, level, levelStars, totalStars, rounds } = get();
    save(PROGRESS_KEY, JSON.stringify({ mode, level, levelStars, totalStars, rounds }));
  };
  const saveClears = () => save(CLEARS_KEY, JSON.stringify(get().clears));

  return {
    ...initialProgress,
    ...boardFor(initialProgress.mode, initialProgress.level, initialTopic, initialBlockCount),
    muted: false,
    tuning: loadTuning(),
    tuningOpen: false,
    announcement: '',
    theme: loadTheme(),
    blockCount: initialBlockCount,
    hintOpen: false,
    peek: null,
    saveSlots: initialSaveSlots,
    clears: loadClears(),
    submitSeq: 0,
    celebrating: false,

    finishCelebration: () => {
      set({ celebrating: false, level: 1, levelStars: 0 });
      saveProgress();
      get().newRound();
    },
    debugSetProgress: (level, levelStars) => {
      set({ mode: 'level', level: Math.min(MAX_LEVEL, Math.max(1, level)), levelStars: Math.max(0, Math.min(STARS_TO_LEVEL_UP - 1, levelStars)) });
      saveProgress();
      get().newRound();
    },
    debugCelebrate: () => {
      set({ celebrating: true, clears: { count: get().clears.count + 1, lastAt: new Date().toISOString() } });
      saveClears();
    },
    debugClearBadge: () => {
      set({ clears: { count: 0, lastAt: null } });
      saveClears();
    },

    setMode: (mode) => {
      const { level, problemIndex, blockCount } = get();
      const topic = topicFor(mode, level, problemIndex);
      set({ mode, ...boardFor(mode, level, topic, blockCount) });
      saveProgress();
    },

    newRound: () => {
      const { mode, level, problemIndex, blockCount } = get();
      set(boardFor(mode, level, topicFor(mode, level, problemIndex), blockCount));
    },

    submit: () => {
      const s = get();
      if (s.result) return;
      const g = grade({
        problemIndex: s.problemIndex,
        items: s.items,
        trays: s.trays,
        assign: s.assign,
        labelsRequired: s.mode === 'free' || levelDef(s.level).labelsRequired,
        axisHintShown: s.axisHintShown,
        assistUsed: s.assistUsed,
      });
      let { level, levelStars, totalStars, rounds, clears } = s;
      let levelUpTo: number | null = null;
      let celebrating = false;
      if (s.mode === 'level') {
        rounds += 1;
        totalStars += g.stars;
        levelStars += g.stars;
        if (levelStars >= STARS_TO_LEVEL_UP) {
          if (level < MAX_LEVEL) {
            level += 1;
            levelStars = 0;
            levelUpTo = level;
          } else {
            // Lv10 final exam passed: celebrate and award the 👑 badge.
            levelStars = STARS_TO_LEVEL_UP;
            celebrating = true;
            clears = { count: clears.count + 1, lastAt: new Date().toISOString() };
          }
        }
      }
      set({
        result: g,
        resultOpen: !celebrating,
        level,
        levelStars,
        levelUpTo,
        totalStars,
        rounds,
        clears,
        celebrating,
        submitSeq: s.submitSeq + 1,
        selected: null,
        hintOpen: false,
      });
      saveProgress();
      if (celebrating) saveClears();
    },

    closeResult: () => set({ resultOpen: false }),
    openResult: () => set({ resultOpen: true }),
    dismissBriefing: () => set({ briefingOpen: false }),
    openBriefing: () => set({ briefingOpen: true }),
    resetProgress: () => {
      // Full reset (decided 2026-10-01): level, stars, stats and the 👑 badge.
      set({ level: 1, levelStars: 0, totalStars: 0, rounds: 0, clears: { count: 0, lastAt: null }, celebrating: false });
      saveProgress();
      saveClears();
      get().newRound();
    },
    setPeek: (peek) => {
      const cur = get().peek;
      if (cur?.id === peek?.id && cur?.x === peek?.x && cur?.y === peek?.y) return;
      set({ peek });
    },

    toggleHint: () => set({ hintOpen: !get().hintOpen }),
    revealAxisHint: () => set({ axisHintShown: true }),
    recordAssist: (kind) => {
      const used = get().assistUsed;
      set({ assistUsed: kind === 'all' ? { ...used, all: true } : { ...used, some: used.some + 1 } });
    },

    setBlockCount: (count) => {
      const blockCount = clampBlockCount(count);
      save(BLOCK_COUNT_KEY, String(blockCount));
      const { mode, level, problemIndex } = get();
      set({ blockCount, ...(mode === 'free' ? boardFor(mode, level, problemIndex, blockCount) : {}) });
    },

    setTheme: (theme) => {
      save(THEME_KEY, theme);
      set({ theme });
    },

    loadProblem: (index) => {
      const { mode, level, blockCount } = get();
      set(boardFor(mode, level, index, blockCount));
    },

    moveItem: (itemId, to, record = true) => {
      const { assign, assignedAt, history, selected, items, trays } = get();
      const from = assign[itemId] ?? null;
      if (from === to) return;
      const text = items.find((item) => item.id === itemId)?.text ?? '';
      const trayIndex = trays.findIndex((tray) => tray.id === to);
      set({
        assign: { ...assign, [itemId]: to },
        assignedAt: { ...assignedAt, [itemId]: ++moveSeq },
        history: record ? [...history, { itemId, from, to }] : history,
        selected: selected === itemId ? null : selected,
        announcement: to === null ? `${text} をペンディングエリアに戻しました` : `${text} をトレイ${trayIndex + 1}に入れました`,
      });
    },

    undo: () => {
      const { history, trays, result } = get();
      const last = history[history.length - 1];
      if (!last || result) return null;
      set({ history: history.slice(0, -1) });
      const target = last.from && trays.some((tray) => tray.id === last.from) ? last.from : null;
      get().moveItem(last.itemId, target, false);
      return last;
    },

    setLabel: (id, label) => set({ trays: get().trays.map((tray) => (tray.id === id ? { ...tray, label } : tray)) }),
    select: (id) => set({ selected: id }),
    setDragTarget: (id) => {
      if (get().dragTarget !== id) set({ dragTarget: id });
    },
    setTuning: (patch) => {
      const tuning = { ...get().tuning, ...patch };
      save(TUNING_KEY, JSON.stringify(tuning));
      set({ tuning });
    },
    resetTuning: () => {
      save(TUNING_KEY, JSON.stringify(DEFAULT_TUNING));
      set({ tuning: DEFAULT_TUNING });
    },
    toggleMute: () => set({ muted: !get().muted }),
    toggleTuning: () => set({ tuningOpen: !get().tuningOpen }),
    saveToSlot: (slot) => {
      if (slot < 0 || slot >= SAVE_SLOT_COUNT) return;
      const s = get();
      const snapshot: SaveSnapshot = {
        mode: s.mode, level: s.level, levelStars: s.levelStars, problemIndex: s.problemIndex,
        items: s.items, assign: s.assign, assignedAt: s.assignedAt, trays: s.trays, history: s.history,
        muted: s.muted, tuning: s.tuning, theme: s.theme, blockCount: s.blockCount,
        axisHintShown: s.axisHintShown, assistUsed: s.assistUsed, result: s.result,
        resultOpen: s.resultOpen, levelUpTo: s.levelUpTo, briefingOpen: s.briefingOpen,
      };
      const saveSlots = [...s.saveSlots];
      saveSlots[slot] = { savedAt: new Date().toISOString(), snapshot };
      save(SAVE_SLOTS_KEY, JSON.stringify(saveSlots));
      set({ saveSlots, announcement: `セーブ${slot + 1}に保存しました` });
    },
    loadFromSlot: (slot) => {
      const saved = get().saveSlots[slot];
      if (!saved) return false;
      const snapshot = saved.snapshot;
      save(PROGRESS_KEY, JSON.stringify({ mode: snapshot.mode, level: snapshot.level, levelStars: snapshot.levelStars }));
      save(THEME_KEY, snapshot.theme);
      save(BLOCK_COUNT_KEY, String(snapshot.blockCount));
      save(TUNING_KEY, JSON.stringify(snapshot.tuning));
      set({
        ...snapshot, selected: null, dragTarget: null, hintOpen: false, tuningOpen: false, peek: null,
        announcement: `セーブ${slot + 1}を読み込みました`,
      });
      return true;
    },
  };
});
