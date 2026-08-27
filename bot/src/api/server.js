import express from 'express';
import rateLimit from 'express-rate-limit';
import db from '../db.js';
import { hashKey, hashHwid } from '../licenseUtils.js';

export function createServer() {
  const app = express();
  app.use(express.json());

  const verifyLimiter = rateLimit({
    windowMs: 60_000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.post('/verify', verifyLimiter, (req, res) => {
    const requiredApiKey = process.env.LICENSE_API_KEY;
    if (requiredApiKey && req.get('x-api-key') !== requiredApiKey) {
      return res.status(401).json({ valid: false, reason: 'unauthorized' });
    }

    const { key, hwid } = req.body ?? {};
    if (!key || typeof key !== 'string') {
      return res.status(400).json({ valid: false, reason: 'missing_key' });
    }

    const row = db.prepare('SELECT * FROM licenses WHERE key_hash = ?').get(hashKey(key));
    if (!row) return res.json({ valid: false, reason: 'not_found' });
    if (row.status === 'revoked') return res.json({ valid: false, reason: 'revoked' });
    if (row.expires_at && row.expires_at < Date.now()) return res.json({ valid: false, reason: 'expired' });

    if (hwid && typeof hwid === 'string' && hwid.trim()) {
      const hwidHash = hashHwid(hwid);
      if (!row.hwid_hash) {
        // First device to verify this key claims it.
        db.prepare('UPDATE licenses SET hwid_hash = ? WHERE id = ?').run(hwidHash, row.id);
      } else if (row.hwid_hash !== hwidHash) {
        return res.json({ valid: false, reason: 'hwid_mismatch' });
      }
    }

    db.prepare('UPDATE licenses SET last_verified_at = ? WHERE id = ?').run(Date.now(), row.id);

    return res.json({
      valid: true,
      product: row.product,
      expiresAt: row.expires_at,
    });
  });

  return app;
}
