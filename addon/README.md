# TPA Tools source recovery

Recovered from the uploaded `tpa tools.jar.disabled`.

## What is included

- Original `fabric.mod.json` and manifest/resources.
- Every original `.class` file.
- `javap -c -p -l -s` output for every class, preserving the exact compiled
  method signatures, descriptors, control flow instructions, and line tables.
- A Gradle-style source tree and simple reconstructed source for the addon
  entrypoint/shared state.
- Placeholders for complex classes that point to their exact bytecode reference.

## Important limitation

A compiled JAR does **not** contain the original Java source. Comments, some local
variable names, formatting, and source-level constructs are lost during compilation.
This package therefore does not pretend that invented Java is the original source.

For the highest-quality Java reconstruction, open the original JAR in IntelliJ
(built-in FernFlower decompiler), CFR, or Vineflower and copy the decompiled output
into the matching files under `src/main/java`.

The uploaded mod identifies itself as TPA Tools 1.6.1 for Minecraft 1.21.11,
Java 21, and Meteor Client, with `me.tpaburst.TPABurstAddon` as the Meteor entrypoint.

## License gate (`src/main/java/me/tpaburst/license/`)

`TPABurstAddon.onInitialize()` gates module registration on a license check
— see the repo root for the Discord bot that issues and verifies the keys.
Buyers activate in-game with:

```
/key TPA-XXXXX-XXXXX-XXXXX-XXXXX
```

How it works:

1. `/key` is a **Fabric client command** (`KeyCommand`, via
   `fabric-command-api-v2`) — it's intercepted and consumed on the client
   and never sent to the server, so the license key never ends up in a
   server's chat log.
2. `LicenseGate.activate()` saves the key to `config/tpa-tools/license.key`
   (relative to the game's run directory) and immediately calls the bot's
   `/verify` endpoint via `LicenseChecker`.
3. Valid → modules register right away, in that same session. Revoked/
   expired/not found → an in-game error, modules stay off. Unreachable
   server → **fails open** (key is saved, modules enabled for this session,
   re-verified next launch) so a bot outage never locks out a paying user.
4. On every subsequent launch, `LicenseGate.check()` re-reads the saved key
   and re-verifies it the same way, without needing `/key` again.

### Device locking

Every verify call also sends a `DeviceId` — a random ID generated once and
saved to `config/tpa-tools/device.id`, not a true hardware fingerprint (see
the class doc for why). The bot (`api/server.js` in the repo root) locks
each key to the first device that verifies it:

- First activation on a key with no device bound yet → binds it, valid.
- Same device again → still valid.
- A *different* device using the same key → rejected with `hwid_mismatch`,
  surfaced in-game as "already activated on another device."
- `/license reset-hwid <key>` (Discord, admin-only) clears the binding —
  use it when a buyer gets a new PC, or to move the key at your discretion.

Not tamper-proof — someone could delete `device.id` to get a fresh random
ID — but the bot still remembers the *original* binding, so that alone
doesn't let a shared key work on a second PC without an admin resetting it.

### Anti-removal / anti-tamper

Nothing running client-side can be made literally impossible to strip out —
anyone with enough skill can eventually decompile and patch bytecode. What's
realistic is raising the cost of doing that. Two things do that here, plus a
third that isn't wired up yet:

- **`LicenseState` — a time-based flag, not a plain boolean.** A field like
  `public static boolean licensed` is one of the first things someone
  patching a jar searches for — flip one byte and it's always `true`
  forever. Instead, `LicenseState.isLicensed()` means "now is before
  `validUntil`", and `validUntil` only moves forward when a real check
  succeeds. So even if someone finds and deletes the check itself, nothing
  is left extending `validUntil` and it goes false a little while later.
  Still ultimately a comparison sitting in bytecode — just a harder one to
  find and a harder one to fully defeat than a single flag.
- **`PeriodicRecheck` — verifies every 15 minutes, not just at boot.** A
  check that only ever runs once at startup is one call site to patch out.
  One that keeps running for as long as the game session lasts is a moving
  target, and it's what keeps `LicenseState` alive (see above).
- **Not yet possible: wiring the check into each module.** Right now only
  `TPABurstAddon` (the entrypoint) gates registration — the module classes
  (`TPABurst.java`, `AutoLootSell.java`, etc.) are still 20-line bytecode-
  reference placeholders, not real source (see "Important limitation"
  above), so there's no real method body to add a check *inside*. Once
  they're properly decompiled, the highest-value next step is having each
  module's own activation/tick logic call `LicenseState.isLicensed()`
  directly — that turns "one gate at startup" into "every feature keeps
  checking for itself," which is a meaningfully harder thing to patch
  around than a single entrypoint.

### Obfuscation (`proguard-rules.pro`)

The *original* jar you uploaded wasn't obfuscated at all — that's the whole
reason the source recovery in this folder was possible: decompiling it gave
back nearly-readable code. `proguard-rules.pro` (next to this file) has
ProGuard rules ready for the real build once it exists: keep
`me.tpaburst.TPABurstAddon` by its exact name (Meteor looks it up via
`fabric.mod.json`), and let everything else — including the whole license
package — get renamed and folded into something much less readable.
`build.gradle` has a commented block showing how to wire it in as a
post-`remapJar` step. **Not active or tested** — there's no Loom/Meteor
build configured in this project yet (see `build.gradle`'s existing note),
so this is groundwork for when you do have one, not something already
running.

Before building: set `LicenseConfig.VERIFY_URL` to wherever the bot is
publicly hosted (see `../README.md`), and `LicenseConfig.API_KEY` if the bot
has `LICENSE_API_KEY` set.

**Verification status.** `LicenseChecker`, `LicenseGate`, `DeviceId`,
`LicenseState`, and `PeriodicRecheck` were compiled against real Gson/SLF4J
jars and integration-tested end to end against the bot's actual `/verify`
endpoint — missing key, valid key, revoked key, unreachable server, the full
device-lock lifecycle (device A binds, device B rejected, admin reset,
device B takes over, device A then rejected), and `LicenseState` correctly
going true on a valid check, true on a network error (fail-open), and false
immediately on an explicit revoke — all confirmed. `build.gradle` was
parsed with the real `gradle` CLI to confirm the new comment block doesn't
break anything (there's still no Loom build configured to actually run).
`KeyCommand` and the
`ClientCommandRegistrationCallback` registration in `TPABurstAddon` could
**not** be compile-checked the same way: they depend on Fabric API,
Minecraft, and Meteor Client, none of which are configured in this
project's `build.gradle` yet (intentionally — see the note there) and
weren't available in the environment this was written in. They're written
against the standard, documented `fabric-command-api-v2` signatures, but
treat them as unverified until you build this for real against Minecraft
1.21.11 / your Meteor Client version — the signatures for
`ClientCommandRegistrationCallback` and `CommandRegistryAccess` have shifted
across Fabric API versions before, so a small adjustment there wouldn't be
surprising.
