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

`TPABurstAddon.onInitialize()` now calls `LicenseGate.check()` before
registering any modules — see `../bot/` for the Discord bot that issues and
verifies the keys. How it works:

1. On launch, `LicenseGate` reads `config/tpa-tools/license.key` (relative to
   the game's run directory). Buyers paste the key they got via Discord DM
   into that file.
2. It POSTs the key to the bot's `/verify` endpoint via `LicenseChecker`.
3. Valid → modules register normally. Revoked/expired/not found → modules
   are skipped and a warning is logged. Unreachable server → **fails open**
   (allows the session) so a bot outage doesn't lock out paying users
   mid-session; it's re-checked next launch.

Before building: set `LicenseConfig.VERIFY_URL` to wherever the bot is
publicly hosted (see `../bot/README.md`), and `LicenseConfig.API_KEY` if the
bot has `LICENSE_API_KEY` set.

This was written and unit/integration-tested against the real bot API
outside this repo's build (Meteor Client/Fabric/Minecraft dependencies
aren't available in that environment — see `build.gradle`'s note). The three
license files only use `java.net.http`, Gson, and SLF4J, all already on a
Fabric/Meteor addon's classpath, so they should compile as-is; double-check
once you build against your real Meteor Client version.

The key is read from a plain file rather than an in-game command or Meteor
Setting, specifically to avoid guessing at Command/Settings API signatures
that vary by Meteor Client version. A chat-command or in-addon-settings key
entry flow is a reasonable upgrade once someone can compile-check it against
the actual dependency.
