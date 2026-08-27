import crypto from 'node:crypto';

// Excludes 0/O and 1/I to avoid visual ambiguity when buyers type keys in by hand.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const GROUP_COUNT = 4;
const GROUP_LEN = 5;

export function generateLicenseKey(prefix = 'KEY') {
  const groups = [];
  for (let g = 0; g < GROUP_COUNT; g++) {
    const bytes = crypto.randomBytes(GROUP_LEN);
    let group = '';
    for (let i = 0; i < GROUP_LEN; i++) {
      group += ALPHABET[bytes[i] % ALPHABET.length];
    }
    groups.push(group);
  }
  return `${prefix}-${groups.join('-')}`;
}

function normalize(key) {
  return key.trim().toUpperCase();
}

export function hashKey(key) {
  return crypto.createHash('sha256').update(normalize(key)).digest('hex');
}

export function lastFour(key) {
  return normalize(key).replace(/-/g, '').slice(-4);
}

export function maskKey(prefix, last4) {
  return `${prefix}-****-****-****-${last4}`;
}

const DURATION_RE = /^(\d+)(d|w|m|y)$/i;
const UNIT_MS = {
  d: 24 * 60 * 60 * 1000,
  w: 7 * 24 * 60 * 60 * 1000,
  m: 30 * 24 * 60 * 60 * 1000,
  y: 365 * 24 * 60 * 60 * 1000,
};

/**
 * Returns an absolute expiry timestamp (ms since epoch), or null for a
 * lifetime license. Throws on unrecognized input.
 */
export function parseDuration(input) {
  if (!input || input.trim().toLowerCase() === 'lifetime') return null;
  const match = DURATION_RE.exec(input.trim());
  if (!match) {
    throw new Error(`Invalid duration "${input}". Use formats like 30d, 6m, 1y, or "lifetime".`);
  }
  const [, amount, unit] = match;
  return Date.now() + Number(amount) * UNIT_MS[unit.toLowerCase()];
}
