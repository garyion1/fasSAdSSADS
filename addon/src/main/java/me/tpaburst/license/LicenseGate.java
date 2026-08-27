package me.tpaburst.license;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Gates TPA Tools' modules behind a license key.
 *
 * The key is read from config/tpa-tools/license.key (relative to the game's
 * run directory) rather than an in-game command/setting, so this integrates
 * without depending on Meteor Client's Command/Settings APIs (which vary
 * across versions and couldn't be compile-checked in the environment this
 * was written in). Ship instructions telling buyers to paste the key they
 * received via Discord DM into that file. A nicer in-game entry flow (chat
 * command, or a Setting on a "License" module) is a reasonable follow-up
 * once this is verified against the exact Meteor Client version in use.
 */
public final class LicenseGate {

    private static final Logger LOGGER = LoggerFactory.getLogger("TPA Tools License");
    private static final Path KEY_FILE = Path.of("config", "tpa-tools", "license.key");

    private LicenseGate() {}

    /** Returns true if TPA Tools' modules should be registered this session. */
    public static boolean check() {
        String key = readKey();
        if (key == null) {
            LOGGER.warn("No license key found at {}. Paste the key from your Discord DM into that file "
                    + "and restart — modules are disabled until then.", KEY_FILE);
            return false;
        }

        LicenseChecker.Result result = LicenseChecker.verify(key);
        if (result.valid()) {
            LOGGER.info("License OK.");
            return true;
        }

        String reason = result.reason() == null ? "unknown" : result.reason();
        if (reason.startsWith("network_error")) {
            // Fail open on connectivity issues so a bot outage doesn't lock out
            // paying users mid-session; the key is re-checked next launch.
            LOGGER.warn("Could not reach the license server ({}). Allowing this session.", reason);
            return true;
        }

        // Fail closed on an explicit answer from the server (not_found, revoked, expired).
        LOGGER.warn("License invalid ({}). Modules disabled. Contact the seller if this is a mistake.", reason);
        return false;
    }

    private static String readKey() {
        try {
            if (!Files.exists(KEY_FILE)) return null;
            String key = Files.readString(KEY_FILE, StandardCharsets.UTF_8).trim();
            return key.isEmpty() ? null : key;
        } catch (IOException e) {
            LOGGER.warn("Failed to read {}: {}", KEY_FILE, e.getMessage());
            return null;
        }
    }
}
