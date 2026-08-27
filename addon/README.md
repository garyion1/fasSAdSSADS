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
— see `../bot/` for the Discord bot that issues and verifies the keys.
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

Before building: set `LicenseConfig.VERIFY_URL` to wherever the bot is
publicly hosted (see `../bot/README.md`), and `LicenseConfig.API_KEY` if the
bot has `LICENSE_API_KEY` set.

**Verification status.** `LicenseChecker` and `LicenseGate` were compiled
against real Gson/SLF4J jars and integration-tested end to end against the
bot's actual `/verify` endpoint (missing key, valid key, revoked key,
unreachable server) — all four checked out. `KeyCommand` and the
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
