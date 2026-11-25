const encoder = new TextEncoder();
const HEX = [...Array(256).keys()].map(value => value.toString(16).padStart(2, '0'));

export function randomToken(bytes = 32) {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return [...value].map(byte => HEX[byte]).join('');
}

export async function digest(value) {
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return [...new Uint8Array(hash)].map(byte => HEX[byte]).join('');
}

export async function hashPassword(password, salt = randomToken(16)) {
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations: 310_000 }, material, 256);
  const value = [...new Uint8Array(bits)].map(byte => HEX[byte]).join('');
  return `pbkdf2-sha256$310000$${salt}$${value}`;
}

export async function verifyPassword(password, encoded) {
  const [algorithm, roundsText, salt, expected] = (encoded || '').split('$');
  if (algorithm !== 'pbkdf2-sha256' || Number(roundsText) !== 310_000 || !salt || !expected) return false;
  const actual = (await hashPassword(password, salt)).split('$')[3];
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i += 1) diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map(part => part.trim().split(/=(.*)/s, 2)).filter(([key, value]) => key && value !== undefined).map(([key, value]) => [key, decodeURIComponent(value)]));
}
