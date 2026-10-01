// The player's character in the corner of the stage, reacting to the game, with a speech bubble
// for moments outside the answer check (everything placed, a new form). During the result it
// stays behind the result card; the comment there speaks for it.
// It stays mounted (hidden with CSS) so the 3D model isn't rebuilt every round.
// The block field keeps a column free for it (see buddyReservePx), so it stays visible without
// covering blocks. "awake" only gates the speech bubble.
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { currentCharacterIndex } from '../game/characters';
import { useGame } from '../state/store';
import type { Reaction } from '../game/BuddyScene';

const BuddyScene = lazy(() => import('../game/BuddyScene'));
const scene = () => import('../game/BuddyScene');
const react = (r: Reaction) => void scene().then((m) => m.cue(r));

/** Drag / swipe sideways to turn (pan) the character, up/down to tilt it; a tap makes it hop. */
function useTurn() {
  const last = useRef({ x: 0, y: 0, t: 0, moved: 0 });
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (document.body.classList.contains('is-dragging')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    last.current = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 };
    void scene().then(({ buddySpin }) => {
      buddySpin.dragging = true;
      buddySpin.vel = 0;
      buddySpin.lastTouch = performance.now();
    });
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const now = performance.now();
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    const dtS = Math.max(0.001, (now - last.current.t) / 1000);
    last.current = { x: e.clientX, y: e.clientY, t: now, moved: last.current.moved + Math.abs(dx) + Math.abs(dy) };
    void scene().then(({ buddySpin, PITCH_MIN, PITCH_MAX }) => {
      buddySpin.yaw += dx * 0.014;
      buddySpin.pitch = Math.min(PITCH_MAX, Math.max(PITCH_MIN, buddySpin.pitch + dy * 0.01));
      buddySpin.vel = (dx * 0.014) / dtS;
      buddySpin.lastTouch = now;
    });
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    const tapped = last.current.moved < 6;
    void scene().then(({ buddySpin, cue }) => {
      buddySpin.dragging = false;
      buddySpin.lastTouch = performance.now();
      if (performance.now() - last.current.t > 120) buddySpin.vel = 0; // held still before letting go
      if (tapped) cue('hop');
    });
  };
  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp };
}

type Say = { text: string; id: number } | null;

export function Buddy() {
  const index = useGame(currentCharacterIndex);
  const hidden = useGame((s) => s.briefingOpen || s.celebrating || !!s.reveal);
  const [say, setSay] = useState<Say>(null);
  const sayId = useRef(0);
  const shownIndex = useRef<number | null>(null);
  const [awake, setAwake] = useState(false);
  const turn = useTurn();
  const sleepTimer = useRef(0);

  const wake = useCallback((ms: number) => {
    setAwake(true);
    window.clearTimeout(sleepTimer.current);
    sleepTimer.current = window.setTimeout(() => setAwake(false), ms);
  }, []);

  const speak = useCallback((text: string, ms: number) => {
    const my = ++sayId.current;
    setSay({ text, id: my });
    window.setTimeout(() => setSay((cur) => (cur?.id === my ? null : cur)), ms);
  }, []);

  useEffect(
    () =>
      useGame.subscribe((s, prev) => {
        // Answer check.
        if (s.submitSeq !== prev.submitSeq && s.result && !s.celebrating) {
          const stars = s.result.stars;
          wake(2600);
          react(stars >= 3 ? 'spin' : stars >= 1 ? 'hop' : 'sad');
          return;
        }
        // A block landed in a tray.
        if (s.assign !== prev.assign && !s.result) {
          const placed = (st: typeof s) => st.items.reduce((n, it) => (st.assign[it.id] ? n + 1 : n), 0);
          const now = placed(s);
          if (now > placed(prev)) {
            react('nod'); // a small nod in the resting pose; no need to wake up
            if (now === s.items.length) {
              wake(3600);
              speak('全部置けたね！ 答え合わせしてみよう', 3600);
            }
          }
        }
      }),
    [speak, wake],
  );

  // Pop in when first shown, and again (with a line) after changing into a new form.
  useEffect(() => {
    if (hidden || shownIndex.current === index) return;
    const changed = shownIndex.current !== null;
    shownIndex.current = index;
    react('appear');
    if (changed) {
      wake(3200);
      speak('新しい姿になったよ！', 3200);
    }
  }, [hidden, index, speak, wake]);

  return (
    <div className={`buddy${hidden ? ' is-hidden' : ''}${awake ? '' : ' is-resting'}`} aria-hidden="true">
      {say && !hidden && awake && (
        <p key={say.id} className="buddy-say">
          {say.text}
        </p>
      )}
      <div className="buddy-figure" title="ドラッグ／スワイプで回せます" {...turn}>
        <Suspense fallback={null}>
          <BuddyScene index={index} />
        </Suspense>
      </div>
    </div>
  );
}
