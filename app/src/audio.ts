// Tiny synthesized sound set (no assets). The context is created lazily on the first gesture.
import { useGame } from './state/store';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;

function audio(): { ctx: AudioContext; out: GainNode } | null {
  if (useGame.getState().muted) return null;
  if (!ctx) {
    if (typeof AudioContext === 'undefined') return null;
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return master ? { ctx, out: master } : null;
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, delay = 0, slideTo?: number) {
  const a = audio();
  if (!a) return;
  const t0 = a.ctx.currentTime + delay;
  const osc = a.ctx.createOscillator();
  const env = a.ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(env).connect(a.out);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const pick = () => tone(740, 0.06, 'sine', 0.08, 0, 520);
export const tick = () => tone(1250, 0.04, 'triangle', 0.05);
export const drop = () => tone(430, 0.09, 'sine', 0.07, 0, 300);
export const miss = () => tone(170, 0.18, 'sine', 0.12, 0, 80);

export function whoosh(speed: number) {
  const a = audio();
  if (!a) return;
  const t0 = a.ctx.currentTime;
  const dur = 0.3;
  const src = a.ctx.createBufferSource();
  src.buffer = noiseBuffer(a.ctx);
  const band = a.ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.Q.value = 1.2;
  band.frequency.setValueAtTime(500, t0);
  band.frequency.exponentialRampToValueAtTime(2600, t0 + dur);
  const env = a.ctx.createGain();
  const peak = Math.min(0.22, 0.06 + speed / 12000);
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(peak, t0 + 0.06);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(band).connect(env).connect(a.out);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

function noiseBuffer(ctx: AudioContext): AudioBuffer {
  if (!noise) {
    noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noise;
}

/** One knock: a filtered noise click (the contact) plus a short falling thump (the box body). */
function knock(a: { ctx: AudioContext; out: GainNode }, delay: number, level: number) {
  const t0 = a.ctx.currentTime + delay;
  const vary = 0.88 + Math.random() * 0.24; // no two drops sound identical

  const src = a.ctx.createBufferSource();
  src.buffer = noiseBuffer(a.ctx);
  const band = a.ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 1500 * vary;
  band.Q.value = 2.2;
  const click = a.ctx.createGain();
  click.gain.setValueAtTime(0.0001, t0);
  click.gain.exponentialRampToValueAtTime(0.4 * level, t0 + 0.002);
  click.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
  src.connect(band).connect(click).connect(a.out);
  src.start(t0, Math.random() * 0.3);
  src.stop(t0 + 0.06);

  const body = a.ctx.createOscillator();
  body.type = 'sine';
  body.frequency.setValueAtTime(210 * vary, t0);
  body.frequency.exponentialRampToValueAtTime(115 * vary, t0 + 0.07);
  const thump = a.ctx.createGain();
  thump.gain.setValueAtTime(0.0001, t0);
  thump.gain.exponentialRampToValueAtTime(0.3 * level, t0 + 0.003);
  thump.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
  body.connect(thump).connect(a.out);
  body.start(t0);
  body.stop(t0 + 0.1);
}

/** Answer check: one bright ping per star earned (a soft low tone for zero). */
export function stars(count: number) {
  if (count <= 0) {
    tone(330, 0.3, 'sine', 0.06);
    return;
  }
  const notes = [659.25, 783.99, 1046.5];
  for (let i = 0; i < count; i++) tone(notes[i], 0.35, 'triangle', 0.08, 0.18 + i * 0.16);
}

/** Level up: a short rising arpeggio. */
export function fanfare() {
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i === 3 ? 0.7 : 0.22, 'triangle', 0.09, i * 0.11));
}

/** "Koto": a block set down inside the tray, with a small settle bounce. No musical pitch. */
export function clack() {
  const a = audio();
  if (!a) return;
  knock(a, 0, 1);
  knock(a, 0.055 + Math.random() * 0.02, 0.28);
}
