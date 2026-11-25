import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import { digest, hashPassword, parseCookies, randomToken, verifyPassword } from './security.js';
import { currentUser } from './shared.js';
import operations from './operations.js';
import devices from './devices.js';
import digital, { scheduledCleanup } from './digital.js';
import templates from './templates.js';
import integrations, { scheduledExports, scheduledDeletionRequests } from './integrations.js';

const app = new Hono().basePath('/api/v1');
const COOKIE = 'snapkiosk_session';
const SESSION_DAYS = 7;
const loginSchema = z.object({ email: z.string().email().max(254), password: z.string().min(1).max(256) });
const ownerSchema = z.object({ setupToken: z.string().min(1), email: z.string().email().max(254), displayName: z.string().trim().min(1).max(80), password: z.string().min(12).max(128) });

app.use('*', async (c, next) => {
  const origins = [c.env.ADMIN_ORIGIN, c.env.GALLERY_ORIGIN].filter(Boolean);
  const isLocalDevOrigin = origin => {
    if (c.env.APP_ENV !== 'development') return false;
    try {
      const url = new URL(origin);
      const host = url.hostname;
      const localHost = ['localhost', '127.0.0.1', '::1'].includes(host) || host.endsWith('.local') || /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host);
      return url.protocol === 'http:' && ['5173', '5174'].includes(url.port) && localHost;
    } catch { return false; }
  };
  return cors({ origin: origin => origins.includes(origin) || isLocalDevOrigin(origin) ? origin : '', credentials: true, allowHeaders: ['Content-Type','Authorization','X-Upload-Token','X-Content-SHA256'], allowMethods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'], maxAge: 600 })(c, next);
});

app.onError((error, c) => {
  const safePath=c.req.path.replace(/(\/gallery\/(?:guest|client)\/)[^/]+/g,'$1[redacted]');
  console.error(JSON.stringify({ event: 'api_error', path: safePath, message: error.message }));
  return c.json({ error: { code: 'internal_error', message: 'The request could not be completed.' } }, 500);
});

app.get('/health', c => c.json({ data: { status: 'ok' } }));

app.post('/auth/setup-owner', async c => {
  const body = await c.req.json().catch(() => null);
  const input = ownerSchema.safeParse(body);
  if (!input.success) return c.json({ error: { code: 'invalid_request', message: 'Check the owner setup details.' } }, 400);
  if (!c.env.SETUP_TOKEN || input.data.setupToken !== c.env.SETUP_TOKEN) return c.json({ error: { code: 'forbidden', message: 'Owner setup is unavailable.' } }, 403);
  const count = await c.env.DB.prepare('SELECT COUNT(*) AS count FROM users').first();
  if (count?.count) return c.json({ error: { code: 'setup_complete', message: 'An owner account already exists.' } }, 409);
  const id = crypto.randomUUID();
  const results = await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO users(id,email,display_name,password_hash) SELECT ?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM users)').bind(id,input.data.email,input.data.displayName,await hashPassword(input.data.password)),
    c.env.DB.prepare('INSERT INTO user_roles(user_id,role) SELECT ?,? WHERE EXISTS (SELECT 1 FROM users WHERE id=?)').bind(id,'owner',id),
    c.env.DB.prepare('INSERT INTO audit_logs(id,actor_user_id,action,subject_type,subject_id) SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM users WHERE id=?)').bind(crypto.randomUUID(),id,'owner.created','user',id,id),
  ]);
  if (!results[0]?.meta?.changes) return c.json({ error: { code: 'setup_complete', message: 'An owner account already exists.' } }, 409);
  return c.json({ data: { created: true } }, 201);
});

app.post('/auth/login', async c => {
  const body = await c.req.json().catch(() => null);
  const input = loginSchema.safeParse(body);
  if (!input.success) return c.json({ error: { code: 'invalid_request', message: 'Enter a valid email and password.' } }, 400);
  const clientKey = await digest(`${c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For')?.split(',')[0] || 'local'}:${input.data.email.toLowerCase()}`);
  const attempt = await c.env.DB.prepare('SELECT failures,window_started_at,blocked_until FROM auth_attempts WHERE key_hash=?').bind(clientKey).first();
  if (attempt?.blocked_until && new Date(attempt.blocked_until).getTime() > Date.now()) return c.json({ error: { code: 'rate_limited', message: 'Too many sign-in attempts. Try again later.' } }, 429);
  const expiredAttemptWindow = Boolean(attempt?.window_started_at && Date.now() - new Date(attempt.window_started_at).getTime() > 15 * 60_000);
  if (expiredAttemptWindow) {
    await c.env.DB.prepare('DELETE FROM auth_attempts WHERE key_hash=?').bind(clientKey).run();
  }
  const user = await c.env.DB.prepare('SELECT id,email,display_name,password_hash,status FROM users WHERE email=? COLLATE NOCASE').bind(input.data.email).first();
  if (!user || user.status !== 'active' || !(await verifyPassword(input.data.password,user.password_hash))) {
    const failures = (expiredAttemptWindow ? 0 : attempt?.failures || 0) + 1;
    const blockedUntil = failures >= 8 ? new Date(Date.now() + 15 * 60_000).toISOString() : null;
    const now = new Date().toISOString();
    await c.env.DB.prepare('INSERT INTO auth_attempts(key_hash,failures,window_started_at,blocked_until) VALUES(?,?,?,?) ON CONFLICT(key_hash) DO UPDATE SET failures=excluded.failures,window_started_at=excluded.window_started_at,blocked_until=excluded.blocked_until').bind(clientKey,failures,expiredAttemptWindow ? now : attempt?.window_started_at || now,blockedUntil).run();
    return c.json({ error: { code: 'invalid_credentials', message: 'Email or password is incorrect.' } }, 401);
  }
  await c.env.DB.prepare('DELETE FROM auth_attempts WHERE key_hash=?').bind(clientKey).run();
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  await c.env.DB.prepare('INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES(?,?,?,?)').bind(crypto.randomUUID(),user.id,await digest(token),expiresAt).run();
  const roles = await c.env.DB.prepare('SELECT role FROM user_roles WHERE user_id=?').bind(user.id).all();
  c.header('Set-Cookie', `${COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_DAYS*86400}${c.env.APP_ENV === 'production' ? '; Secure' : ''}`);
  return c.json({ data: { user: { id:user.id,email:user.email,displayName:user.display_name,roles:roles.results.map(row=>row.role) } } });
});

app.post('/auth/logout', async c => {
  const token = parseCookies(c.req.header('Cookie'))[COOKIE];
  if (token) await c.env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await digest(token)).run();
  c.header('Set-Cookie', `${COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${c.env.APP_ENV === 'production' ? '; Secure' : ''}`);
  return c.json({ data: { loggedOut: true } });
});

app.route('/', operations);
app.route('/', devices);
app.route('/', digital);
app.route('/', templates);
app.route('/', integrations);

app.get('/auth/me', async c => {
  const user = await currentUser(c);
  return user ? c.json({ data: { user } }) : c.json({ error: { code: 'unauthenticated', message: 'Please sign in.' } }, 401);
});

app.get('/dashboard/summary', async c => {
  const user=await currentUser(c);
  if (!user) return c.json({ error: { code:'unauthenticated',message:'Please sign in.' } },401);
  const staffOnly=user.roles.includes('event_staff')&&!user.roles.some(role=>['owner','administrator'].includes(role));
  const [devices, events, bookings, uploads] = await Promise.all([
    staffOnly?c.env.DB.prepare("SELECT COUNT(DISTINCT d.id) AS total FROM devices d JOIN event_devices ed ON ed.device_id=d.id JOIN event_staff_assignments sa ON sa.event_id=ed.event_id WHERE d.status!='revoked' AND sa.user_id=?").bind(user.id).first():c.env.DB.prepare("SELECT COUNT(*) AS total FROM devices WHERE status!='revoked'").first(),
    staffOnly?c.env.DB.prepare("SELECT COUNT(*) AS total FROM events e JOIN event_staff_assignments sa ON sa.event_id=e.id WHERE e.status='active' AND sa.user_id=?").bind(user.id).first():c.env.DB.prepare("SELECT COUNT(*) AS total FROM events WHERE status='active'").first(),
    staffOnly?c.env.DB.prepare("SELECT COUNT(*) AS total FROM bookings b WHERE b.starts_at>=? AND b.status IN ('reserved','confirmed') AND EXISTS(SELECT 1 FROM events e JOIN event_staff_assignments sa ON sa.event_id=e.id WHERE e.booking_id=b.id AND sa.user_id=?)").bind(new Date().toISOString(),user.id).first():c.env.DB.prepare("SELECT COUNT(*) AS total FROM bookings WHERE starts_at>=? AND status IN ('reserved','confirmed')").bind(new Date().toISOString()).first(),
    staffOnly?c.env.DB.prepare("SELECT COUNT(*) AS total FROM upload_jobs j JOIN photo_sessions s ON s.id=j.session_id JOIN event_staff_assignments sa ON sa.event_id=s.event_id WHERE j.status IN ('pending','uploading','retrying','failed') AND sa.user_id=?").bind(user.id).first():c.env.DB.prepare("SELECT COUNT(*) AS total FROM upload_jobs WHERE status IN ('pending','uploading','retrying','failed')").first(),
  ]);
  return c.json({ data: { registeredKiosks:devices?.total ?? 0,activeEvents:events?.total ?? 0,upcomingBookings:bookings?.total ?? 0,pendingUploads:uploads?.total ?? 0 } });
});

app.notFound(c => c.json({ error: { code: 'not_found', message: 'The requested resource was not found.' } },404));

export default {
  fetch: app.fetch.bind(app),
  async scheduled(_controller, env) {
    const now = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare('DELETE FROM sessions WHERE expires_at<=?').bind(now),
      env.DB.prepare('DELETE FROM auth_attempts WHERE (blocked_until IS NULL AND window_started_at<?) OR (blocked_until IS NOT NULL AND blocked_until<=?)').bind(new Date(Date.now()-15*60_000).toISOString(),now),
    ]);
    await scheduledCleanup(env);
    await scheduledExports(env);
    await scheduledDeletionRequests(env);
  },
};
