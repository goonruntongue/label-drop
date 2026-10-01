// The shared daily AI budget and what the AI ENERGY meter shows (SPEC 4.8, 8.3).
// Reads never write: a day without a row simply has nothing used yet.
import { utcDay, type Env } from './env';

export type AiMode = 'full' | 'saver' | 'offline';

export interface BudgetStatus {
  day: string;
  mode: AiMode;
  /** 0–100, shared by everyone. */
  remainingPct: number;
  /** About how many more generations / evaluations today (0 when the mode doesn't allow them). */
  estGen: number;
  estEval: number;
  /** Next reset (00:00 UTC = 09:00 JST), ISO string. */
  resetAt: string;
}

/** FULL ≥ 30% (generate + evaluate), SAVER 10–30% (evaluate only), OFFLINE < 10% or exhausted. */
export const SAVER_BELOW = 0.3;
export const OFFLINE_BELOW = 0.1;

export async function budgetStatus(env: Env, now = new Date()): Promise<BudgetStatus> {
  const day = utcDay(now);
  const fallbackCap = Number(env.DAILY_CAP) || 9000;
  const row = await env.DB.prepare('SELECT cap, used, exhausted FROM ai_budget WHERE day = ?1')
    .bind(day)
    .first<{ cap: number; used: number; exhausted: number }>();
  const cap = row?.cap ?? fallbackCap;
  const remaining = row?.exhausted ? 0 : Math.max(0, cap - (row?.used ?? 0));
  const share = cap > 0 ? remaining / cap : 0;
  const mode: AiMode = row?.exhausted || share < OFFLINE_BELOW ? 'offline' : share < SAVER_BELOW ? 'saver' : 'full';
  const per = (v: string, fallback: number) => Math.max(1, Number(v) || fallback);
  const estGen = mode === 'full' ? Math.floor(Math.max(0, remaining - cap * SAVER_BELOW) / per(env.EST_GEN_NEURONS, 220)) : 0;
  const estEval = mode === 'offline' ? 0 : Math.floor(Math.max(0, remaining - cap * OFFLINE_BELOW) / per(env.EST_EVAL_NEURONS, 90));
  const reset = new Date(now);
  reset.setUTCHours(24, 0, 0, 0);
  return { day, mode, remainingPct: Math.round(share * 100), estGen, estEval, resetAt: reset.toISOString() };
}

/** Today's successful AI calls of one kind for one player (quotas count these; no extra table). */
export async function usedToday(env: Env, userId: string, kind: 'gen' | 'eval', now = new Date()): Promise<number> {
  const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM ai_calls WHERE user_id = ?1 AND day = ?2 AND kind = ?3 AND ok = 1')
    .bind(userId, utcDay(now), kind)
    .first<{ n: number }>();
  return row?.n ?? 0;
}
