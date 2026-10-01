// Picking a problem to play (SPEC 9.4 POST /api/problem). P3 serves the templates seeded from the
// game's own data (scripts/seed-templates.mjs); P4 adds AI-made ones to the same table.
// The answer (which keywords go together, the model labels) never leaves the server here.
import { HttpError, type Env } from './env';

export const TIERS = ['everyday', 'service', 'web'] as const;
export type Tier = (typeof TIERS)[number];

interface Keyword {
  text: string;
  desc: string;
}
/** The stored problem (same shape as app/src/data/problems.ts). */
interface Problem {
  id: string;
  title: string;
  tier: Tier;
  brief: { user: string; scene: string; goal: string };
  axisHint: string;
  groups: { label: string; items: Keyword[] }[];
}

/** What the player may see before answering: keywords shuffled, groups and labels left out. */
export interface ProblemView {
  id: string;
  source: 'template' | 'ai';
  title: string;
  tier: Tier;
  brief: Problem['brief'];
  axisHint: string;
  groupCount: number;
  keywords: Keyword[];
}

export interface ProblemRequest {
  tiers?: Tier[];
  exclude?: string[];
}

const MAX_EXCLUDE = 100;

export function parseRequest(body: unknown): Required<ProblemRequest> {
  const b = (body ?? {}) as Record<string, unknown>;
  const tiers = Array.isArray(b.tiers) ? b.tiers : TIERS;
  if (!tiers.length || !tiers.every((t) => (TIERS as readonly unknown[]).includes(t))) throw new HttpError(400, 'tiers must be some of everyday, service, web');
  const exclude = Array.isArray(b.exclude) ? b.exclude : [];
  if (exclude.length > MAX_EXCLUDE || !exclude.every((id) => typeof id === 'string' && id.length <= 80)) throw new HttpError(400, 'exclude must be up to 100 ids');
  return { tiers: tiers as Tier[], exclude: exclude as string[] };
}

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function toView(id: string, source: ProblemView['source'], p: Problem): ProblemView {
  return {
    id,
    source,
    title: p.title,
    tier: p.tier,
    brief: p.brief,
    axisHint: p.axisHint,
    groupCount: p.groups.length,
    keywords: shuffle(p.groups.flatMap((g) => g.items)),
  };
}

/**
 * The least-played ready problem among the requested tiers, skipping the excluded ids (random among
 * ties). If everything was excluded, the exclusion is dropped rather than leaving the player stuck.
 */
export async function pickProblem(env: Env, req: Required<ProblemRequest>): Promise<ProblemView | null> {
  const tierMarks = req.tiers.map((_, i) => `?${i + 1}`).join(', ');
  const query = (withExclude: boolean) => {
    const ex = withExclude && req.exclude.length ? req.exclude : [];
    const exMarks = ex.map((_, i) => `?${req.tiers.length + i + 1}`).join(', ');
    return env.DB.prepare(
      `SELECT id, source, body FROM problems
       WHERE status = 'ready' AND difficulty IN (${tierMarks})${ex.length ? ` AND id NOT IN (${exMarks})` : ''}
       ORDER BY play_count ASC, RANDOM() LIMIT 1`,
    )
      .bind(...req.tiers, ...ex)
      .first<{ id: string; source: ProblemView['source']; body: string }>();
  };
  const row = (await query(true)) ?? (req.exclude.length ? await query(false) : null);
  if (!row) return null;
  await env.DB.prepare('UPDATE problems SET play_count = play_count + 1 WHERE id = ?1').bind(row.id).run();
  return toView(row.id, row.source, JSON.parse(row.body) as Problem);
}
