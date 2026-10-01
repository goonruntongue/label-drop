// The player's character in the corner of the stage, reacting to the game, with a speech bubble
// for moments outside the answer check (everything placed, a new form). During the result it
// stays behind the result card; the comment there speaks for it.
// It stays mounted (hidden with CSS) so the 3D model isn't rebuilt every round.
// While the player is solving it rests small and faint in the corner (and vanishes during a
// drag) so it never gets in the way; it only wakes up to full size to react.
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { currentCharacterIndex } from '../game/characters';
import { useGame } from '../state/store';
import type { Reaction } from '../game/BuddyScene';

const BuddyScene = lazy(() => import('../game/BuddyScene'));
const react = (r: Reaction) => void import('../game/BuddyScene').then((m) => m.cue(r));

type Say = { text: string; id: number } | null;

export function Buddy() {
  const index = useGame(currentCharacterIndex);
  const hidden = useGame((s) => s.briefingOpen || s.celebrating || !!s.reveal);
  const [say, setSay] = useState<Say>(null);
  const sayId = useRef(0);
  const shownIndex = useRef<number | null>(null);
  const [awake, setAwake] = useState(false);
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
      <div className="buddy-figure">
        <Suspense fallback={null}>
          <BuddyScene index={index} />
        </Suspense>
      </div>
    </div>
  );
}
