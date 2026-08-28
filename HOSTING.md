# Deploying on Bot-Hosting.net (or a similar panel)

This is the exact playbook for this repo on a Pterodactyl-style panel like
Bot-Hosting.net. Everything here is what actually worked, figured out
through real trial and error — follow it in order and you shouldn't need to
guess or manually shuffle files again.

## Why this repo is laid out the way it is

The bot's code sits at the **repo root** (`index.js`, `package.json`,
`api/`, `commands/`, etc.) — not in a subfolder. Cheap bot hosts run a fixed
startup script that expects `package.json` and the entry file right where
the repo lands, so keeping everything at the top level means their default
settings just work without you having to reconfigure anything.

The database (`db.js`) uses Node's **built-in** `node:sqlite` instead of a
separate package — nothing needs to be compiled during install, which is
what used to get blocked by these hosts' install-script security gate.

Both of those were fixed as of the commit that added this file. If you're
looking at an older checkout, `git pull` first.

## One-time setup

1. **Files tab → GitHub tab**: connect it to this repo
   (`garyion1/fasSAdSSADS`), branch `claude/discord-addon-license-bot-m6d19v`
   (or `main` once/if this gets merged there).
2. **Startup tab**: leave it at its default (`index.js`). You should not
   need to change anything here.
3. **Env tab**: set these —

   | Key | Value |
   |---|---|
   | `DISCORD_TOKEN` | your bot's token |
   | `DISCORD_CLIENT_ID` | your bot's application ID |
   | `DISCORD_GUILD_ID` | optional — your server's ID, for instant slash-command updates while testing |
   | `PRODUCT_NAME` | shown to buyers, e.g. `TPA Tools` |
   | `PORT` | must match the port shown in the **Network** tab |
   | `LICENSE_API_KEY` | optional shared secret between the bot and the addon |

4. Press **Start**. That's the whole thing — the bot registers its slash
   commands with Discord automatically every time it starts (look for
   `Slash commands registered: 5 command(s) to guild ...` near the top of
   the console output). No separate command to run, nothing to remember.
5. Upload the built addon jar (see "Making /download work" below) so that
   command has something to serve.

That's it — no `npm install-scripts approve` step, no `npm run
deploy-commands` step, no `cd` into a subfolder, nothing else to configure.

## Making /download work

`/download` sends whoever runs it the addon jar as a Discord attachment.
It needs an actual file to exist first:

1. Build the addon (`addon/` in this repo) into a jar — this needs Fabric
   Loom + Meteor Client set up, which has to happen on your own machine or
   dev environment, not on the bot host.
2. Upload that jar to the bot host's Files tab, at **`releases/latest.jar`**
   (create the `releases` folder if it isn't there). The exact filename
   matters — `latest.jar`, unless you set a `JAR_PATH` env var pointing
   somewhere else.
3. That's it — no restart needed, `/download` reads the file fresh each
   time it's run. To ship a new version, just overwrite that file.

Until step 2 is done, `/download` replies with a friendly "hasn't been
uploaded yet" message instead of erroring.

## Updating later (new code pushed to GitHub)

1. **GitHub tab → Pull/Update** (whatever this panel calls "get the latest
   commit"). Try this first — it should update in place without touching
   your `Env` settings.
2. If something looks broken or mismatched afterward (stray old files sitting
   next to new ones), the reliable fallback is: select everything **except**
   `.git` and delete it, then use the GitHub tab to pull fresh. This
   shouldn't normally be necessary anymore now that the repo structure is
   stable, but it's the "start clean" option if anything ever seems stuck.
3. Press **Start** again.

## If something still goes wrong — reading the error

| Console shows | Means |
|---|---|
| `Cannot find module '.../something.js'` | Files aren't where the code expects — re-pull fresh from GitHub, don't hand-copy individual files |
| `DISCORD_TOKEN must be set` | Env tab is missing a value — check the table above |
| `DiscordAPIError` / `401`/`403` from Discord | Token is wrong or was reset — check it matches the Developer Portal exactly |
| `Could not locate the bindings file` (better-sqlite3) | You're on an old checkout from before the `node:sqlite` switch — pull the latest commit |
| `ExperimentalWarning: SQLite is an experimental feature` | Harmless, ignore it — doesn't affect anything |
| Old/wrong commands show up in Discord, or new ones are missing | Check the console for `Slash commands registered: ...` right after Start — if it's not there, or shows an error instead, that's why. If it IS there and commands still don't show, the bot most likely isn't actually a member of that server yet (see "Bot not invited" below) |
| Bot's commands don't appear in Discord at all, even though the bot is online | The bot needs to be invited/authorized to the server with the `applications.commands` scope, not just `bot` — inviting with only `bot` lets it come online but its slash commands never register there. Re-invite it via `https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands` (swap in your real client ID), picking the same server |
| `/download` says the jar hasn't been uploaded | Expected until you upload it — see "Making /download work" above |

When in doubt: copy the whole console output and share it — that's always
enough to diagnose from, no need to guess at what's wrong first.
