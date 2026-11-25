import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const apiBase = (process.env.SNAPKIOSK_API_URL || 'http://localhost:8787/api/v1').replace(/\/$/, '');
let setupToken = process.env.SETUP_TOKEN;
if (!setupToken) {
  try {
    const vars = await readFile(new URL('../.dev.vars', import.meta.url), 'utf8');
    setupToken = vars.split(/\r?\n/).map(line => line.trim()).find(line => line.startsWith('SETUP_TOKEN='))?.slice('SETUP_TOKEN='.length);
  } catch {
    // The API response below gives a setup-specific error if no token is configured.
  }
}
if (!setupToken || setupToken.startsWith('replace_with_')) {
  console.error('Set a private SETUP_TOKEN in backend/.dev.vars, then restart the API.');
  process.exit(1);
}

const rl = createInterface({ input:stdin, output:stdout });
try {
  const email = (await rl.question('Owner email: ')).trim();
  const displayName = (await rl.question('Owner display name: ')).trim();
  const password = await rl.question('Owner password (12+ characters): ');
  if (password.length < 12) throw new Error('Password must contain at least 12 characters.');
  const response = await fetch(`${apiBase}/auth/setup-owner`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({ setupToken,email,displayName,password }),
  });
  const body = await response.json().catch(()=>({}));
  if (!response.ok) throw new Error(body.error?.message || `Owner setup failed (${response.status}).`);
  console.log(`Owner account created for ${email}. Sign in at http://localhost:5173.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  rl.close();
}
