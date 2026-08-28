import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import 'dotenv/config';

// Built into Node.js itself (18.5+ behind a flag, unflagged by 23.4+) — no
// native module to compile, so nothing for a host's install-script gate to
// block. Its API is intentionally modeled on better-sqlite3 (same .prepare()
// / .get() / .all() / .run() shapes), which is what this file used before.
const dbPath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.resolve('licenses.db');

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS licenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_hash TEXT NOT NULL UNIQUE,
    key_last4 TEXT NOT NULL,
    discord_user_id TEXT NOT NULL,
    product TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at INTEGER NOT NULL,
    expires_at INTEGER,
    last_verified_at INTEGER,
    hwid_hash TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_licenses_user ON licenses(discord_user_id);

  CREATE TABLE IF NOT EXISTS warnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    discord_user_id TEXT NOT NULL,
    moderator_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_warnings_user ON warnings(guild_id, discord_user_id);
`);

// Lightweight migration for databases created before hwid locking existed.
try {
  db.exec('ALTER TABLE licenses ADD COLUMN hwid_hash TEXT');
} catch (err) {
  if (!/duplicate column/i.test(err.message)) throw err;
}

export default db;
