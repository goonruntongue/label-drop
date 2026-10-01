// The player's character in the corner of the stage, reacting to the game, with a speech bubble
// for moments outside the answer check (everything placed, a new form). During the result it
// stays behind the result card; the comment there speaks for it.
// It stays mounted (hidden with CSS) so the 3D model isn't rebuilt every round.
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
          react(stars >= 3 ? 'spin' : stars >= 1 ? 'hop' : 'sad');
          return;
        }
        // A block landed in a tray.
        if (s.assign !== prev.assign && !s.result) {
          const placed = (st: typeof s) => st.items.reduce((n, it) => (st.assign[it.id] ? n + 1 : n), 0);
          const now = placed(s);
          if (now > placed(prev)) {
            react('nod');
            if (now === s.items.length) speak('全部置けたね！ 答え合わせしてみよう', 3600);
          }
        }
      }),
    [speak],
  );

  // Pop in when first shown, and again (with a line) after changing into a new form.
  useEffect(() => {
    if (hidden || shownIndex.current === index) return;
    const changed = shownIndex.current !== null;
    shownIndex.current = index;
    react('appear');
    if (changed) speak('新しい姿になったよ！', 3200);
  }, [hidden, index, speak]);

  return (
    <div className={`buddy${hidden ? ' is-hidden' : ''}`} aria-hidden="true">
      {say && !hidden && (
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
