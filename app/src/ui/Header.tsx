import { useEffect, useState, type ReactNode } from 'react';
import * as audio from '../audio';
import { PROBLEMS, TIER_LABELS, type Tier } from '../data/problems';
import { MAX_LEVEL, STARS_TO_LEVEL_UP } from '../game/levels';
import { clampBlockCount, MAX_BLOCKS, MIN_BLOCKS, useGame, type Mode } from '../state/store';
import { THEME_IDS, type ThemeId } from '../theme/themes';
import { DeviceButton } from './DevicePanel';

const ICONS = {
  undo: 'M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
  reset: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5',
  sound: 'M11 5 6 9H2v6h4l5 4V5zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14',
  mute: 'M11 5 6 9H2v6h4l5 4V5zM22 9l-6 6M16 9l6 6',
  tune: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  hint: 'M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2V17h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z',
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

/** Level mode: current level and stars collected toward the next one. */
function LevelMeter() {
  const level = useGame((s) => s.level);
  const levelStars = useGame((s) => s.levelStars);
  const max = level >= MAX_LEVEL;
  return (
    <div
      className="hud-level"
      title={max ? 'マスターレベルです' : `★を${STARS_TO_LEVEL_UP}個ためるとレベルアップ`}
      aria-label={`レベル${level}、星${levelStars}/${STARS_TO_LEVEL_UP}`}
    >
      <span className="kicker">LV</span>
      <span className="num hud-level-num">{level}</span>
      {!max && (
        <span className="hud-level-stars" aria-hidden="true">
          {Array.from({ length: STARS_TO_LEVEL_UP }, (_, i) => (
            <i key={i} className={i < levelStars ? 'on' : undefined}>
              ★
            </i>
          ))}
        </span>
      )}
    </div>
  );
}

export function Header() {
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
        <a className="brand" href="../index.html" title="practice IA シリーズ">
          Label <b>Drop</b>
        </a>
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
        <IconButton label={muted ? 'サウンドをオンにする' : 'サウンドをオフにする'} pressed={!muted} onClick={toggleMute}>
          <Icon d={muted ? ICONS.mute : ICONS.sound} />
        </IconButton>
        <IconButton label="チューニング (T)" pressed={tuningOpen} onClick={toggleTuning}>
          <Icon d={ICONS.tune} />
        </IconButton>
      </div>
    </header>
  );
}
