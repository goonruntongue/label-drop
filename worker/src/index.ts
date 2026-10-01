// Label Drop API (SPEC 9.4). P3: who am I, how much AI energy is left today, and a problem to play
// (templates for now). AI generation / evaluation come in P4 / P5.
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { requireUser } from './auth';
import { budgetStatus, usedToday } from './budget';
import { HttpError, type Env } from './env';
import { parseRequest, pickProblem } from './problems';

const LOCALHOST = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export const app = new Hono<{ Bindings: Env }>();

app.use('/api/*', async (c, next) => {
  const allowed = c.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
  const localOk = c.env.ALLOW_LOCALHOST === '1';
  return cors({
    origin: (origin) => (allowed.includes(origin) || (localOk && LOCALHOST.test(origin)) ? origin : null),
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    credentials: true, // Access (AUTH_MODE=access) sends its session cookie
    maxAge: 86400,
  })(c, next);
});

app.get('/api/health', (c) => c.json({ ok: true }));

app.get('/api/me', async (c) => {
  const user = await requireUser(c);
  const evalMax = Number(c.env.QUOTA_EVAL_PER_DAY) || 15;
  const genMax = Number(c.env.QUOTA_GEN_PER_DAY) || 3;
  const [evalUsed, genUsed] = await Promise.all([usedToday(c.env, user.id, 'eval'), usedToday(c.env, user.id, 'gen')]);
  return c.json({
    authMode: c.env.AUTH_MODE,
    anonymous: user.anonymous,
    email: user.email,
    name: user.name,
    isAdmin: user.isAdmin,
    quota: user.isAdmin
      ? { evalLeft: null, genLeft: null, evalMax: null, genMax: null }
      : { evalLeft: Math.max(0, evalMax - evalUsed), genLeft: Math.max(0, genMax - genUsed), evalMax, genMax },
  });
});

app.get('/api/status', async (c) => {
  await requireUser(c); // same gate as every other API
  return c.json(await budgetStatus(c.env));
});

app.post('/api/problem', async (c) => {
  await requireUser(c);
  const req = parseRequest(await c.req.json().catch(() => ({})));
  const [problem, budget] = await Promise.all([pickProblem(c.env, req), budgetStatus(c.env)]);
  if (!problem) throw new HttpError(404, 'No problem available');
  return c.json({ problem, budget });
});

app.notFound((c) => c.json({ error: 'Not found' }, 404));

app.onError((err, c) => {
  if (err instanceof HttpError) return c.json({ error: err.message }, err.status);
  console.error(err);
  return c.json({ error: 'Internal error' }, 500);
});

export default app;
