# Addon License Bot

A Discord bot that issues and verifies license keys for a Minecraft client mod.

- **`bot/`** — the Discord bot (Node.js, discord.js) plus a small HTTP API the
  mod calls to verify a key at launch. Slash commands are admin-only
  (`Administrator` permission by default).
- **`mod-integration/`** — an example `LicenseChecker.java` showing how the
  mod side calls the verify API. Adapt it into your mod's codebase.

## How it works

1. An admin runs `/license create @buyer [duration]` in Discord.
2. The bot generates a random key, stores its SHA-256 hash (never the raw
   key) in SQLite, and DMs the buyer the raw key once.
3. The buyer enters the key into the mod (however you choose to prompt for
   it — config file, in-game screen, etc.).
4. On launch, the mod POSTs the key to the bot's `/verify` endpoint. The bot
   hashes it, looks it up, and returns whether it's valid, revoked, or
   expired.
5. If a key leaks or a buyer requests a chargeback, `/license revoke` (or
   `/license reissue` to rotate it) takes effect immediately — the next
   launch will fail verification.

## Setup

```bash
cd bot
npm install
cp .env.example .env
```

Fill in `.env`:

- `DISCORD_TOKEN` / `DISCORD_CLIENT_ID` — from the
  [Discord Developer Portal](https://discord.com/developers/applications).
  Invite the bot with the `applications.commands` and `bot` scopes.
- `DISCORD_GUILD_ID` — optional, set during development so slash commands
  register instantly to one server instead of waiting ~1 hour for a global
  rollout.
- `PRODUCT_NAME` — shown to buyers and used as the license key prefix.
- `LICENSE_API_KEY` — optional shared secret the mod sends as `X-Api-Key`.
  Filters out casual scanning of the endpoint; see the caveat below.

Register the slash command, then start the bot:

```bash
npm run deploy-commands
npm start
```

By default only server members with the `Administrator` permission can run
`/license`. To allow a specific role instead, go to **Server Settings →
Integrations → your bot → /license** in Discord and adjust permissions there
— no code change needed.

## Deploying the API publicly

The mod needs to reach `/verify` over the internet, so `bot/` needs to run
somewhere with a public URL (a VPS, Railway, Fly.io, etc.), not just on your
laptop. Put it behind HTTPS (a reverse proxy like Caddy/nginx, or the
platform's built-in TLS) — sending license keys over plain HTTP exposes them
to anyone on the network path.

## Limitation: this cannot be made fully crack-proof

`/verify` runs from a call embedded in a **client-side** mod, which anyone
can decompile. A motivated person can patch the jar to skip the check
entirely or hardcode `valid: true`. What this system *does* give you:

- No public keygen — keys only come from you, so casual sharing/resale is
  the main thing this stops.
- Remote revocation — a leaked or charged-back key stops working on the next
  launch, without shipping a new mod version.

If you want to raise the bar further later, common next steps are bytecode
obfuscation (e.g. ProGuard) and binding a key to a hardware ID on first use
(`/license` and `/verify` can be extended to store and check an `hwid`
field) — happy to add either when you're ready.

## Database

SQLite via `better-sqlite3`, stored at `bot/licenses.db` (path configurable
via `DB_PATH`). It's gitignored — back it up yourself; it's the only record
of who owns which license.
