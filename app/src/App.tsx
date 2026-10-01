import { useEffect, useState } from 'react';
import * as audio from './audio';
import { PROBLEMS } from './data/problems';
import { sendTo } from './game/input';
import { dom } from './game/runtime';
import { Stage } from './game/Stage';
import { FONT_JP, FONT_MONO } from './game/textTexture';
import { useGame } from './state/store';
import { Header } from './ui/Header';
import { HintPanel } from './ui/HintPanel';
import { Inventory } from './ui/Inventory';
import { TuningPanel } from './ui/Overlays';
import { BriefCard, BriefingOverlay, KeywordTip, ResultPanel } from './ui/Round';
import { Celebration } from './ui/Celebration';
import { DebugPanel } from './ui/DebugPanel';
import { RoundEffects } from './ui/RoundEffects';
import { CharacterGallery, CharacterReveal } from './ui/Characters';

// Block textures are baked once, so every glyph subset must be loaded before the stage mounts.
async function preloadFonts() {
  if (!document.fonts) return;
  const text = PROBLEMS.flatMap((p) => p.groups.flatMap((g) => g.items.map((kw) => kw.text))).join('') + 'ラベル未入力';
  const loads = [
    document.fonts.load(`700 40px ${FONT_JP}`, text),
    document.fonts.load(`900 40px ${FONT_JP}`, text),
    document.fonts.load(`500 40px ${FONT_JP}`, 'ラベル未入力'),
    document.fonts.load(`700 40px ${FONT_MONO}`, '0123456789'),
  ];
  await Promise.race([Promise.allSettled(loads), new Promise((resolve) => setTimeout(resolve, 5000))]);
}

function useKeyboard() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const game = useGame.getState();
      if (e.key === 'Escape') {
        game.select(null);
        return;
      }
      if ((e.target as HTMLElement | null)?.closest('input, textarea, select')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (game.undo()) audio.drop();
        return;
      }
      if (e.key.toLowerCase() === 't') {
        game.toggleTuning();
        return;
      }
      if (e.key.toLowerCase() === 'h') {
        game.toggleHint();
        return;
      }
      const n = Number(e.key);
      if (n >= 1 && n <= 5 && game.selected) {
        const tray = game.trays[n - 1];
        if (tray) sendTo(game.selected, tray.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

export default function App() {
  const [ready, setReady] = useState(false);
  const announcement = useGame((s) => s.announcement);
  const theme = useGame((s) => s.theme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    void preloadFonts().then(() => setReady(true));
  }, []);
  useKeyboard();

  return (
    <div className="app">
      <Header />
      <main className="main">
        <section
          className="stage"
          aria-label="3Dステージ"
          ref={(el) => {
            dom.stage = el;
          }}
        >
          {ready ? (
            <Stage />
          ) : (
            <div className="loading" role="status">
              <span className="kicker">LOADING KEYWORDS</span>
              <span className="loading-bar" />
            </div>
          )}
          <BriefCard />
          <TuningPanel />
          <HintPanel />
          <ResultPanel />
          <BriefingOverlay />
        </section>
        <Inventory />
      </main>
      <div
        className="drag-ghost"
        aria-hidden="true"
        ref={(el) => {
          dom.ghost = el;
        }}
      />
      <KeywordTip />
      <RoundEffects />
      <CharacterReveal />
      <CharacterGallery />
      <Celebration />
      <DebugPanel />
      <div className="sr-only" aria-live="polite">
        {announcement}
      </div>
    </div>
  );
}
