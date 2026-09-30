// One round of play: brief before starting, brief card while playing, keyword meanings, and the answer check.
import { useEffect, type CSSProperties } from 'react';
import * as audio from '../audio';
import { PROBLEMS } from '../data/problems';
import { levelDef, MAX_LEVEL, STARS_TO_LEVEL_UP } from '../game/levels';
import { TRAY_GLYPHS, useGame } from '../state/store';
import { THEMES } from '../theme/themes';

function Stars({ value, max = 3, size }: { value: number; max?: number; size?: 'lg' }) {
  return (
    <span className={`stars${size === 'lg' ? ' stars-lg' : ''}`} aria-label={`★${value} / ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < value ? 'on' : 'off'} aria-hidden="true">
          ★
        </span>
      ))}
    </span>
  );
}

/** Before each board: read the brief first, so the sorting criterion is clear before any block moves. */
export function BriefingOverlay() {
  const open = useGame((s) => s.briefingOpen);
  const mode = useGame((s) => s.mode);
  const level = useGame((s) => s.level);
  const problemIndex = useGame((s) => s.problemIndex);
  const itemCount = useGame((s) => s.items.length);
  const trays = useGame((s) => s.trays);
  if (!open) return null;
  const problem = PROBLEMS[problemIndex];
  const def = levelDef(level);
  const caps = trays.map((t) => t.capacity).filter((c): c is number => c !== undefined);
  const start = () => {
    useGame.getState().dismissBriefing();
    audio.tick();
  };

  return (
    <div className="briefing" role="dialog" aria-modal="true" aria-label="お題">
      <div className="briefing-card">
        {mode === 'level' ? (
          <p className="kicker">
            LEVEL {level} ・ {def.title}
          </p>
        ) : (
          <p className="kicker">FREE PLAY</p>
        )}
        <h2>{problem.title}</h2>
        <dl className="brief-rows">
          <div>
            <dt>だれが</dt>
            <dd>{problem.brief.user}</dd>
          </div>
          <div>
            <dt>どんなとき</dt>
            <dd>{problem.brief.scene}</dd>
          </div>
          <div>
            <dt>何のため</dt>
            <dd>{problem.brief.goal}</dd>
          </div>
        </dl>
        <p className="briefing-tip">この人になりきって、「この人なら、どこを探す？」で分けてみましょう。</p>
        <p className="briefing-task">
          {mode === 'level' ? `${def.goal}。` : ''}
          キーワード{itemCount}個 → {trays.length}つの箱
          {caps.length ? `（${caps.join('・')}個）` : ''}
        </p>
        <ul className="briefing-controls">
          <li>
            <b>つかんで投げる</b>・<b>タップ → 箱をタップ</b>で入れる
          </li>
          <li>
            キーワードに<b>マウスを乗せる／長押し</b>で意味が見られます
          </li>
        </ul>
        <button type="button" className="btn btn-primary" autoFocus onClick={start}>
          はじめる
        </button>
      </div>
    </div>
  );
}

/** While playing: the brief stays in view (top-left), click to reopen the full brief. */
export function BriefCard() {
  const open = useGame((s) => s.briefingOpen);
  const problemIndex = useGame((s) => s.problemIndex);
  const mode = useGame((s) => s.mode);
  const level = useGame((s) => s.level);
  if (open) return null;
  const problem = PROBLEMS[problemIndex];
  return (
    <button type="button" className="brief-card" onClick={() => useGame.getState().openBriefing()} title="お題をもう一度見る">
      <span className="kicker">{mode === 'level' ? `LV ${level} ・ お題` : 'お題'}</span>
      <b>{problem.title}</b>
      <span>
        {problem.brief.user}が、{problem.brief.scene}
      </span>
    </button>
  );
}

/** Meaning of the keyword under the pointer (hover) or finger (long-press). */
export function KeywordTip() {
  const peek = useGame((s) => s.peek);
  const item = useGame((s) => (s.peek ? s.items.find((i) => i.id === s.peek!.id) : undefined));
  if (!peek || !item) return null;
  const x = Math.min(window.innerWidth - 12, Math.max(12, peek.x));
  const y = Math.max(12, peek.y - 18);
  return (
    <div className="keyword-tip" role="tooltip" style={{ left: x, top: y } as CSSProperties}>
      <b>{item.text}</b>
      <span>{item.desc}</span>
    </div>
  );
}

/** The answer check: stars, which blocks were off and where they belong, model labels, level progress. */
export function ResultPanel() {
  const result = useGame((s) => s.result);
  const open = useGame((s) => s.resultOpen);
  const trays = useGame((s) => s.trays);
  const mode = useGame((s) => s.mode);
  const level = useGame((s) => s.level);
  const levelStars = useGame((s) => s.levelStars);
  const levelUpTo = useGame((s) => s.levelUpTo);
  const theme = THEMES[useGame((s) => s.theme)];

  useEffect(() => {
    if (!result || !open) return;
    audio.stars(result.stars);
    if (levelUpTo) window.setTimeout(() => audio.fanfare(), 700);
    // Only when a new result arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  if (!result || !open) return null;
  const trayById = new Map(trays.map((t) => [t.id, t]));
  const { newRound, closeResult } = useGame.getState();
  const perfect = result.correct === result.total;

  return (
    <div className="result" role="dialog" aria-modal="true" aria-label="答え合わせ">
      <div className="result-card">
        <p className="kicker">RESULT</p>
        <div className="result-head">
          <Stars value={result.stars} size="lg" />
          <div>
            <p className="result-score">
              {result.total}個中 <b className="num">{result.correct}</b>個 正解
            </p>
            <p className="result-comment">
              {perfect ? 'パーフェクト！ 分け方の軸がしっかり通っています。' : result.correct / result.total >= 0.8 ? 'おしい！ 赤く光っているブロックを確認しましょう。' : 'どの軸で分けたかを振り返ってみましょう。お題の「だれが・何のため」がヒントです。'}
            </p>
          </div>
        </div>
        {result.notes.length > 0 && (
          <ul className="result-notes">
            {result.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        )}

        {mode === 'level' &&
          (levelUpTo ? (
            <div className="level-up">
              <p className="level-up-title">LEVEL UP!</p>
              <p>
                <b>LV {levelUpTo}</b> ・ {levelDef(levelUpTo).title}
              </p>
              <p className="level-up-goal">{levelDef(levelUpTo).goal}</p>
            </div>
          ) : (
            <div className="level-progress">
              <span>
                LV {level}
                {level >= MAX_LEVEL ? '（マスター）' : ''}
              </span>
              {level < MAX_LEVEL && (
                <>
                  <span className="level-bar" aria-hidden="true">
                    <i style={{ width: `${(levelStars / STARS_TO_LEVEL_UP) * 100}%` }} />
                  </span>
                  <span className="num">
                    ★{levelStars}/{STARS_TO_LEVEL_UP}
                  </span>
                </>
              )}
            </div>
          ))}

        <div className="result-trays">
          {result.trays.map((gt) => {
            const tray = trayById.get(gt.trayId);
            const color = tray ? theme.trayColors[tray.colorIndex] : undefined;
            return (
              <section key={gt.trayId} className="result-tray" style={{ '--tray': color } as CSSProperties}>
                <header>
                  <span className="tray-glyph">{tray ? TRAY_GLYPHS[tray.colorIndex] : ''}</span>
                  <span>
                    あなた: <b>{gt.label || '（ラベルなし）'}</b>
                  </span>
                  <span className="result-model">
                    模範: <b>{gt.modelLabel}</b>
                  </span>
                </header>
                <ul>
                  {gt.items.map((it) => {
                    const should = it.shouldTrayId ? trayById.get(it.shouldTrayId) : undefined;
                    const shouldLabel = result.trays.find((t) => t.trayId === it.shouldTrayId)?.modelLabel;
                    return (
                      <li key={it.id} className={it.ok ? 'ok' : 'ng'}>
                        <span aria-hidden="true">{it.ok ? '✓' : '✗'}</span> {it.text}
                        {!it.ok && should && (
                          <em>
                            → {TRAY_GLYPHS[should.colorIndex]} {shouldLabel} の箱
                          </em>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
        <p className="result-foot">模範は「一つの設計例」です。違う分け方でも、理由を説明できれば価値があります。</p>
        <div className="result-actions">
          <button type="button" className="btn" onClick={closeResult}>
            盤面を見る
          </button>
          <button type="button" className="btn btn-primary" autoFocus onClick={newRound}>
            次の問題へ
          </button>
        </div>
      </div>
    </div>
  );
}
