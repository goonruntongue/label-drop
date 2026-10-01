import { useEffect, useState, type ReactNode } from 'react';
import * as audio from '../audio';
import { PROBLEMS, TIER_LABELS, type Tier } from '../data/problems';
import { LEGEND_TITLE, MAX_LEVEL, STARS_TO_LEVEL_UP, titleFor } from '../game/levels';
import { clampBlockCount, MAX_BLOCKS, MIN_BLOCKS, SAVE_SLOT_COUNT, useGame, type Mode } from '../state/store';
import { THEME_IDS, type ThemeId } from '../theme/themes';
import { currentCharacterIndex } from '../game/characters';
import { useFace } from '../game/faces';
import { DeviceButton } from './DevicePanel';

const ICONS = {
  undo: 'M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
  reset: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5',
  sound: 'M11 5 6 9H2v6h4l5 4V5zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14',
  mute: 'M11 5 6 9H2v6h4l5 4V5zM22 9l-6 6M16 9l6 6',
  tune: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  hint: 'M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2V17h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z',
  save: 'M5 3h12l2 2v16H5V3zm3 0v6h8V3m-7 18v-7h6v7',
};

export function Icon({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function IconButton(props: { label: string; onClick: () => void; disabled?: boolean; pressed?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      className="btn-icon"
      aria-label={props.label}
      title={props.label}
      aria-pressed={props.pressed}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

/** 10–30 blocks. Changing it deals a new board, so confirm first if work would be lost. */
function BlockCountField() {
  const count = useGame((s) => s.blockCount);
  const [draft, setDraft] = useState(String(count));
  useEffect(() => setDraft(String(count)), [count]);

  const apply = (next: number) => {
    const value = clampBlockCount(next);
    const game = useGame.getState();
    const inProgress = game.items.some((item) => game.assign[item.id]);
    if (value === game.blockCount) {
      setDraft(String(value));
      return;
    }
    if (inProgress && !window.confirm(`ブロック数を ${value} 個に変えると、今の仕分けはリセットされます。よろしいですか？`)) {
      setDraft(String(game.blockCount));
      return;
    }
    game.setBlockCount(value);
  };

  return (
    <div className="hud-field hud-stepper" role="group" aria-label="ブロック数">
      <span className="kicker">BLOCKS</span>
      <button type="button" className="btn-mini" aria-label="ブロックを1個減らす" disabled={count <= MIN_BLOCKS} onClick={() => apply(count - 1)}>
        −
      </button>
      <input
        className="num"
        type="number"
        inputMode="numeric"
        min={MIN_BLOCKS}
        max={MAX_BLOCKS}
        value={draft}
        aria-label={`ブロック数（${MIN_BLOCKS}〜${MAX_BLOCKS}）`}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => apply(Number(draft) || count)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) e.currentTarget.blur();
        }}
      />
      <button type="button" className="btn-mini" aria-label="ブロックを1個増やす" disabled={count >= MAX_BLOCKS} onClick={() => apply(count + 1)}>
        ＋
      </button>
    </div>
  );
}

/**
 * The IA intro page (LP) the title links back to. It sits one level above the app on the
 * label-drop site (/label-drop/app/ → /label-drop/index.html) but two levels above it on the
 * portal (/about-ia/app/dist/ → /about-ia/index.html), so decide from where the app is served.
 */
const LP_HREF = typeof location !== 'undefined' && /\/dist\/(index\.html)?$/.test(location.pathname) ? '../../index.html' : '../index.html';
// A query parameter can remain on an installed app's start URL.  The referrer is
// the reliable signal that this browser tab was actually opened from the IA guide.
const OPENED_FROM_IA = typeof document !== 'undefined' && (() => {
  try {
    const referrer = new URL(document.referrer);
    return referrer.origin === location.origin && /\/about-ia\/(index\.html)?$/.test(referrer.pathname);
  } catch {
    return false;
  }
})();

function AppIdentity() {
  const goBack = () => {
    try {
      const referrer = new URL(document.referrer);
      const cameFromGuide = referrer.origin === location.origin && /\/about-ia\/(index\.html)?$/.test(referrer.pathname);
      if (cameFromGuide && history.length > 1) {
        history.back();
        return;
      }
    } catch {
      // A direct visit has no usable referrer: use the safe guide fallback below.
    }
    location.assign(LP_HREF);
  };

  if (OPENED_FROM_IA) {
    return <button type="button" className="brand brand-back" onClick={goBack}>← 前に戻る</button>;
  }
  return <span className="brand" aria-label="Label Drop">Label <b>Drop</b></span>;
}

/** The current character's face (rendered once from its 3D model); null until it exists. */
function Face({ className }: { className: string }) {
  const index = useGame(currentCharacterIndex);
  const face = useFace(index);
  return face ? <img className={className} src={face} alt="" draggable={false} /> : null;
}

/** Level mode: current level and stars collected toward the next one. */
function LevelMeter() {
  const level = useGame((s) => s.level);
  const levelStars = useGame((s) => s.levelStars);
  const clears = useGame((s) => s.clears.count);
  const final = level >= MAX_LEVEL;
  return (
    <div
      className="hud-level"
      title={final ? `最終試験：★を${STARS_TO_LEVEL_UP}個集めるとクリア` : `★を${STARS_TO_LEVEL_UP}個ためるとレベルアップ`}
      aria-label={`レベル${level}、称号 ${titleFor(level)}、星${levelStars}/${STARS_TO_LEVEL_UP}${clears ? `、クリア${clears}回` : ''}`}
    >
      <span className="kicker">LV</span>
      <span className="num hud-level-num">{level}</span>
      <button type="button" className="hud-me" title="魔法使い図鑑を開く" onClick={() => useGame.getState().openGallery()}>
        <Face className="hud-face" />
        <span className="hud-title">{titleFor(level)}</span>
      </button>
      {clears > 0 && (
        <span className="hud-crown" title={`${LEGEND_TITLE}の証（クリア${clears}回）`} aria-hidden="true">
          👑{clears > 1 ? <small>×{clears}</small> : null}
        </span>
      )}
      <span className="hud-level-stars" aria-hidden="true">
        {Array.from({ length: STARS_TO_LEVEL_UP }, (_, i) => (
          <i key={i} className={i < levelStars ? 'on' : undefined}>
            ★
          </i>
        ))}
      </span>
    </div>
  );
}

function SaveSlots({ onClose }: { onClose: () => void }) {
  const slots = useGame((s) => s.saveSlots);
  // Re-render when mode / level change so the "can't load here" reasons stay current.
  useGame((s) => `${s.mode}:${s.level}`);
  const { saveToSlot, loadFromSlot, slotBlocked } = useGame.getState();
  const format = (iso: string) => new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  return (
    <div className="save-slots-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="save-slots" role="dialog" aria-modal="true" aria-labelledby="save-slots-title" onMouseDown={(e) => e.stopPropagation()}>
        <header><div><span className="kicker">LOCAL SAVE</span><h2 id="save-slots-title">セーブスロット</h2></div><button type="button" className="btn-icon" aria-label="閉じる" onClick={onClose}>×</button></header>
        <p>
          保存するのは<b>解いている途中の盤面だけ</b>です（レベル・★・称号・👑は保存しません。いつも今の進み具合のままです）。この端末のブラウザ内にだけ保存します。
        </p>
        <div className="save-slot-list">
          {Array.from({ length: SAVE_SLOT_COUNT }, (_, i) => {
            const slot = slots[i];
            const blocked = slot ? slotBlocked(i) : null;
            const topic = slot ? PROBLEMS[slot.snapshot.problemIndex]?.title : '';
            const placed = slot ? Object.values(slot.snapshot.assign).filter(Boolean).length : 0;
            return (
              <article className="save-slot" key={i}>
                <div>
                  <b>セーブ {i + 1}</b>
                  <small>
                    {slot
                      ? `${format(slot.savedAt)} ・ ${slot.snapshot.mode === 'free' ? '無制限' : `LV ${slot.snapshot.level}`} ・ ${topic} ・ ${placed}/${slot.snapshot.items.length}個`
                      : '空きスロット'}
                  </small>
                  {blocked && <small className="save-slot-blocked">{blocked}</small>}
                </div>
                <div>
                  <button type="button" className="btn" onClick={() => (!slot || window.confirm(`セーブ ${i + 1} を今の盤面で上書きしますか？`)) && saveToSlot(i)}>
                    保存
                  </button>
                  <button type="button" className="btn btn-primary" disabled={!slot || !!blocked} title={blocked ?? undefined} onClick={() => { if (loadFromSlot(i)) onClose(); }}>
                    読み込む
                  </button>
                </div>
              </article>
            );
          })}
        </div>
        <ResetProgress onDone={onClose} />
      </section>
    </div>
  );
}

/** Fix 5: wipe level progress, records, the 👑 badge and gallery unlocks — after a clear warning. */
function ResetProgress({ onDone }: { onDone: () => void }) {
  const level = useGame((s) => s.level);
  const bestLevel = useGame((s) => s.bestLevel);
  const clears = useGame((s) => s.clears.count);
  const run = () => {
    const lines = [
      '進捗をリセットします。元に戻せません。',
      '',
      `・レベル（いま LV ${level}）と ★ → LV 1・★0 に戻ります`,
      `・図鑑の解放（LV ${bestLevel} まで）→ LV 1 だけに戻ります`,
      clears > 0 ? `・👑 クリアの証（${clears}回）→ 消えます` : null,
      '・集めた★・答え合わせの回数の記録 → 0 に戻ります',
      '',
      'セーブスロットの盤面・テーマ・音の設定は残ります。',
      '本当にリセットしますか？',
    ].filter((l) => l !== null);
    if (!window.confirm(lines.join('\n'))) return;
    if (!window.confirm('最終確認：本当に、進捗をすべて消しますか？')) return;
    useGame.getState().resetProgress();
    useGame.setState({ announcement: '進捗をリセットしました' });
    onDone();
  };
  return (
    <div className="danger-zone">
      <div>
        <b>進捗をリセット</b>
        <small>レベル・★・称号・👑・図鑑の解放を最初に戻します</small>
      </div>
      <button type="button" className="btn btn-danger" onClick={run}>
        リセット…
      </button>
    </div>
  );
}

export function Header() {
  const [saveOpen, setSaveOpen] = useState(false);
  const problemIndex = useGame((s) => s.problemIndex);
  const total = useGame((s) => s.items.length);
  const done = useGame((s) => s.items.reduce((n, item) => (s.assign[item.id] ? n + 1 : n), 0));
  const canUndo = useGame((s) => s.history.length > 0);
  const muted = useGame((s) => s.muted);
  const tuningOpen = useGame((s) => s.tuningOpen);
  const theme = useGame((s) => s.theme);
  const hintOpen = useGame((s) => s.hintOpen);
  const mode = useGame((s) => s.mode);
  const { loadProblem, undo, toggleMute, toggleTuning, setTheme, toggleHint, setMode } = useGame.getState();

  return (
    <header className="hud">
      <div className="hud-brand">
        <AppIdentity />
        <span className="badge">P1 · 練習版</span>
      </div>
      <label className="hud-field">
        <span className="kicker">MODE</span>
        <select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
          <option value="level">レベルアップ</option>
          <option value="free">無制限</option>
        </select>
      </label>
      {mode === 'level' && <LevelMeter />}
      <label className="hud-field">
        <span className="kicker">TOPIC</span>
        <select value={problemIndex} onChange={(e) => loadProblem(Number(e.target.value))}>
          {(Object.keys(TIER_LABELS) as Tier[]).map((tier) => (
            <optgroup key={tier} label={TIER_LABELS[tier]}>
              {PROBLEMS.map((p, i) =>
                p.tier === tier ? (
                  <option key={p.id} value={i}>
                    {p.title}
                  </option>
                ) : null,
              )}
            </optgroup>
          ))}
        </select>
      </label>
      {mode === 'free' && <BlockCountField />}
      <label className="hud-field">
        <span className="kicker">DESIGN</span>
        <select value={theme} onChange={(e) => setTheme(e.target.value as ThemeId)}>
          {THEME_IDS.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </label>
      <div className="hud-progress" role="status" aria-label={`分類済み ${done} / ${total}`}>
        <span className="kicker">SORTED</span>
        <span className="num">
          {String(done).padStart(2, '0')}
          <small>/{total}</small>
        </span>
        <span className="bar" aria-hidden="true">
          <i style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
        </span>
      </div>
      <div className="hud-actions">
        <button type="button" className="btn btn-gallery" title="魔法使い図鑑（キャラクター）" onClick={() => useGame.getState().openGallery()}>
          {mode === 'free' ? <Face className="hud-face is-small" /> : null}
          <span aria-hidden="true">📖</span>
          図鑑
        </button>
        <button type="button" className="btn" title="遊び方（アニメーションで説明）" onClick={() => useGame.getState().openTutorial()}>
          ？ 遊び方
        </button>
        <DeviceButton />
        <button
          type="button"
          className={`btn btn-hint${hintOpen ? ' is-on' : ''}`}
          aria-pressed={hintOpen}
          title="考え方ガイド (H)"
          onClick={toggleHint}
        >
          <Icon d={ICONS.hint} />
          ヒント
        </button>
        <IconButton label="元に戻す (Ctrl+Z)" disabled={!canUndo} onClick={() => undo() && audio.drop()}>
          <Icon d={ICONS.undo} />
        </IconButton>
        <IconButton label="最初からやり直す" onClick={() => loadProblem(problemIndex)}>
          <Icon d={ICONS.reset} />
        </IconButton>
        <IconButton label="セーブスロット" pressed={saveOpen} onClick={() => setSaveOpen(true)}>
          <Icon d={ICONS.save} />
        </IconButton>
        <IconButton label={muted ? 'サウンドをオンにする' : 'サウンドをオフにする'} pressed={!muted} onClick={toggleMute}>
          <Icon d={muted ? ICONS.mute : ICONS.sound} />
        </IconButton>
        <IconButton label="チューニング (T)" pressed={tuningOpen} onClick={toggleTuning}>
          <Icon d={ICONS.tune} />
        </IconButton>
      </div>
      {saveOpen && <SaveSlots onClose={() => setSaveOpen(false)} />}
    </header>
  );
}
