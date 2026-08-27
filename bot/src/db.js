import Database from 'better-sqlite3';
import path from 'node:path';
import 'dotenv/config';

const dbPath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.resolve('licenses.db');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

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
`);

// Lightweight migration for databases created before hwid locking existed.
try {
  db.exec('ALTER TABLE licenses ADD COLUMN hwid_hash TEXT');
} catch (err) {
  if (!/duplicate column/i.test(err.message)) throw err;
}

export default db;
