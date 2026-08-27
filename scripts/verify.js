// Sanity check used by CI (see ../.github/workflows/ci.yml) and safe to
// run locally: loads the database against a throwaway file, imports every
// command module and confirms its slash-command definition builds, then
// cleans up. Catches syntax errors, bad SlashCommandBuilder calls, and a
// broken schema without needing a real Discord token.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const tmpDb = path.join(os.tmpdir(), `verify-${Date.now()}.db`);
process.env.DB_PATH = tmpDb;
process.env.PRODUCT_NAME = process.env.PRODUCT_NAME || 'CI Check';

function cleanup() {
  for (const suffix of ['', '-wal', '-shm']) {
    fs.rmSync(tmpDb + suffix, { force: true });
  }
}

try {
  const db = (await import('../db.js')).default;

  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name);
  for (const required of ['licenses', 'warnings']) {
    if (!tables.includes(required)) {
      throw new Error(`Expected table "${required}" to exist after db.js runs, got: ${tables.join(', ')}`);
    }
  }

  const commandModules = ['license.js', 'ban.js', 'mute.js', 'warn.js'];
  for (const file of commandModules) {
    const mod = await import(`../commands/${file}`);
    if (typeof mod.execute !== 'function') {
      throw new Error(`${file} does not export an execute() function`);
    }
    const json = mod.data.toJSON();
    if (!json.name) {
      throw new Error(`${file}'s command builder did not produce a valid command (no name)`);
    }
    console.log(`ok: /${json.name}`);
  }

  await import('../api/server.js');
  console.log('ok: api/server.js imports cleanly');

  console.log('verify: all checks passed');
} catch (err) {
  console.error('verify: FAILED —', err.message);
  process.exitCode = 1;
} finally {
  cleanup();
}
