// Opening: the title screen waits for 「はじめる」. Pressing it plays the movie: a short story of what
// information architecture is, then the two things this game makes you practise, then the game.
// White mincho type on black, typed out line by line. Each scene stays until a tap, Enter or Space
// (or 30 seconds); "スキップ" or Esc goes straight to the game. The music loops for as long as it takes. Someone who has seen the movie before can also start without it.
//
// Each story scene may have a picture behind the text: public/intro/scene-1.webp … scene-5.webp.
// They are optional. A scene whose picture is missing is simply black.
import { useCallback, useEffect, useRef, useState } from 'react';
import * as audio from '../audio';
import { useGame } from '../state/store';

const SEEN_KEY = 'practice-ia:intro-seen';
const TYPE_MS = 62;
/** Every scene of the movie waits for a tap; left alone, it moves on by itself after this long. */
const SCENE_MS = 30_000;
const FADE_MS = 500;

/**
 * The story, two lines to a scene at most. `|` marks where a line may wrap on a narrow screen:
 * a phrase is never broken in the middle (no 「情報アーキ／テクチャ」).
 */
const STORY: string[][] = [
  // The world of the game's characters (apprentice mage … grand sage): an archive where words sleep as
  // crystals (the glass blocks), and mages whose only two spells are sorting and naming.
  ['ここは、|ことばの書庫。', '世界じゅうのことばが、|結晶になって|眠っている。'],
  ['ある夜、|棚がくずれ、|結晶は散らばった。', '探しものは、|もう見つからない。'],
  ['書庫を守るのは、|魔法使いたち。', '使える魔法は、|二つだけ。'],
  ['仕分けの魔法。|使う人のために、|分ける。', '名付けの魔法。|開ける前に、|中身を伝える。'],
  ['人はこの魔法を、|情報アーキテクチャ|― IA と呼ぶ。', '見習い魔法使いよ、|杖をとれ。'],
];
const plain = (line: string) => line.replaceAll('|', '');

function seenBefore(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

/** Scenes: 0 = title, 1..STORY.length = story, last = the catch phrase. */
const CATCH = STORY.length + 1;

export function Intro() {
  const open = useGame((s) => s.introOpen);
  const replay = useGame((s) => s.introReplay);
  const still = useGame((s) => s.prefs.motion !== 'full');
  // Has this player seen the movie before? Then the title screen also offers to start without it.
  const [seen] = useState(() => seenBefore() && !new URLSearchParams(location.search).has('intro'));
  // Replayed from the settings: straight into the movie.
  const [scene, setScene] = useState(replay ? 1 : 0);
  const [typed, setTyped] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  const lines = scene >= 1 && scene < CATCH ? STORY[scene - 1] : [];
  const total = plain(lines.join('')).length;
  const done = typed >= total;

  const finish = useCallback(() => {
    if (leaving) return;
    setLeaving(true);
    audio.stopBgm();
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {
      // Non-critical: the story will simply play again next time.
    }
    window.setTimeout(() => useGame.getState().closeIntro(), FADE_MS);
  }, [leaving]);

  const next = useCallback(() => {
    if (leaving) return;
    if (scene >= CATCH) {
      finish();
      return;
    }
    setTyped(0);
    setScene(scene + 1);
  }, [finish, leaving, scene]);

  /** はじめる: a "pico!", then the movie with its music. */
  const start = useCallback(() => {
    audio.pico();
    audio.playBgm();
    next();
  }, [next]);

  // The music is fetched while the title is up, so it starts on the beat of the button. Replayed from
  // the settings, the movie starts by itself: so does the music (that click was the user's gesture).
  useEffect(() => {
    if (!open) return;
    audio.preloadBgm();
    if (replay) audio.playBgm();
    return () => audio.stopBgm(400);
    // Once per showing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /** A tap: finish the line being typed, or go to the next scene. The title screen waits for its button. */
  const advance = useCallback(() => {
    if (scene === 0) return;
    if (scene >= 1 && scene < CATCH && !done) setTyped(total);
    else next();
  }, [done, next, scene, total]);

  // Typing.
  useEffect(() => {
    if (!open || leaving || scene < 1 || scene >= CATCH || done) return;
    if (still) {
      setTyped(total); // motion setting: no typing, the whole scene at once
      return;
    }
    const id = window.setTimeout(() => setTyped((n) => n + 1), TYPE_MS);
    return () => window.clearTimeout(id);
  }, [open, leaving, scene, typed, done, total, still]);

  // A scene stays until it is tapped, or for SCENE_MS (counted from when it appears). The title waits for its button.
  useEffect(() => {
    if (!open || leaving || scene === 0) return;
    const id = window.setTimeout(next, SCENE_MS);
    return () => window.clearTimeout(id);
  }, [open, leaving, scene, next]);

  // Keys belong to the opening while it is up (the game underneath has shortcuts of its own).
  useEffect(() => {
    if (!open) return;
    root.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Escape') finish();
      else if (e.key === 'Enter' || e.key === ' ') {
        // The skip button handles its own Enter / Space.
        if (e.target instanceof Element && e.target.closest('button')) return;
        e.preventDefault();
        if (scene === 0) start(); // the same as pressing はじめる
        else advance();
      } else if (e.key !== 'Tab') e.preventDefault();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, advance, finish, start, scene]);

  if (!open) return null;

  // Characters typed so far, dealt out phrase by phrase. The caret sits right after the last typed character.
  let before = 0;
  let caretPlaced = false;
  const typedLines = lines.map((line) =>
    line.split('|').map((phrase) => {
      const shown = phrase.slice(0, Math.max(0, typed - before));
      before += phrase.length;
      const caret = !caretPlaced && typed <= before;
      if (caret) caretPlaced = true;
      return { shown, rest: phrase.slice(shown.length), caret };
    }),
  );

  return (
    <div
      ref={root}
      className={`intro${leaving ? ' is-leaving' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="オープニング"
      tabIndex={-1}
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest('button')) advance();
      }}
    >
      {scene === 0 && (
        <div className="intro-title" key="title">
          <p className="intro-kicker">practice IA</p>
          <h1>
            Label <span>Drop</span>
          </h1>
          <p className="intro-sub">仕分けて、名付ける。</p>
          <div className="intro-start">
            <button type="button" className="intro-start-button" autoFocus onClick={start}>
              はじめる
            </button>
            {seen && (
              <button type="button" className="intro-start-skip" onClick={finish}>
                ムービーをとばして始める
              </button>
            )}
          </div>
        </div>
      )}

      {scene >= 1 && scene < CATCH && (
        <div className="intro-story" key={scene}>
          {/* The still picture is kept moving (Ken Burns: a slow zoom and pan, different for each scene).
              Optional: a missing file is hidden, not shown as broken. */}
          <img className={`intro-art is-kb${scene}`} src={`./intro/scene-${scene}.webp`} alt="" draggable={false} onError={(e) => (e.currentTarget.hidden = true)} />
          {/* The whole text is laid out from the start (invisible), so lines don't jump as they are typed. */}
          <p className="intro-lines" aria-hidden="true">
            {typedLines.map((phrases, i) => (
              <span key={i} className="intro-line">
                {phrases.map((p, k) => (
                  <span key={k} className="intro-phrase">
                    {p.shown}
                    {p.caret && <i className="intro-caret" />}
                    <span className="intro-rest">{p.rest}</span>
                  </span>
                ))}
              </span>
            ))}
          </p>
          <p className="sr-only" aria-live="polite">
            {plain(lines.join(' '))}
          </p>
        </div>
      )}

      {scene >= CATCH && (
        <div className="intro-catch" key="catch">
          <p className="intro-catch-line">仕分けろ。</p>
          <p className="intro-catch-line">名付けろ。</p>
          <p className="intro-catch-sub">GROUPING &amp; LABELING</p>
        </div>
      )}

      {scene > 0 && (
        <div className="intro-foot">
          {scene >= 1 && scene < CATCH && (
            <span className="intro-progress" aria-hidden="true">
              {STORY.map((_, i) => (
                <i key={i} className={i < scene ? 'on' : undefined} />
              ))}
            </span>
          )}
          {/* Shown once the scene has been read out: nothing moves on by itself for a while. */}
          {(scene >= CATCH || done) && (
            <span className="intro-next" aria-hidden="true">
              タップで次へ <i>▶</i>
            </span>
          )}
          <button type="button" className="intro-skip" onClick={finish}>
            スキップ <span aria-hidden="true">▶▶</span>
          </button>
        </div>
      )}
    </div>
  );
}
