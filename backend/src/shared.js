import { digest, parseCookies } from './security.js';

const SESSION_COOKIE = 'snapkiosk_session';

export async function currentUser(c) {
  const token = parseCookies(c.req.header('Cookie'))[SESSION_COOKIE];
  if (!token) return null;
  const user = await c.env.DB.prepare(`SELECT u.id,u.email,u.display_name FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.status='active'`).bind(await digest(token),new Date().toISOString()).first();
  if (!user) return null;
  const roles = await c.env.DB.prepare('SELECT role FROM user_roles WHERE user_id=?').bind(user.id).all();
  return { id:user.id,email:user.email,displayName:user.display_name,roles:roles.results.map(row=>row.role) };
}

export async function requireUser(c, allowedRoles = []) {
  const user = await currentUser(c);
  if (!user) return { response:c.json({ error:{ code:'unauthenticated',message:'Please sign in.' } },401) };
  if (allowedRoles.length && !user.roles.some(role=>allowedRoles.includes(role))) {
    return { response:c.json({ error:{ code:'forbidden',message:'You do not have permission to perform this action.' } },403) };
  }
  return { user };
}

export async function audit(c, user, action, subjectType, subjectId, metadata = {}) {
  await c.env.DB.prepare('INSERT INTO audit_logs(id,actor_user_id,action,subject_type,subject_id,metadata_json) VALUES(?,?,?,?,?,?)')
    .bind(crypto.randomUUID(),user?.id || null,action,subjectType,subjectId || null,JSON.stringify(metadata)).run();
}

export function failure(c, error, status = 400) {
  const code = error?.code || 'invalid_request';
  const message = error?.message || 'Check the submitted details.';
  return c.json({ error:{ code,message } },status);
}

export function parseJson(c, schema) {
  return c.req.json().catch(()=>null).then(value=>schema.safeParse(value));
}

export function isValidIso(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}
