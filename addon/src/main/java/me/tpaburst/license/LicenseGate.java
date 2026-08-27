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
 * The key is persisted at config/tpa-tools/license.key (relative to the
 * game's run directory) so it survives restarts, but buyers set it in-game
 * via the "/key <license>" client command (see KeyCommand) rather than
 * editing the file by hand. check() runs once at startup against whatever
 * is already saved; activate() is called by "/key" to save a new key and
 * verify it immediately.
 *
 * Every verify call also sends this installation's DeviceId. The bot locks
 * a key to whichever device first verifies it, so a "hwid_mismatch" reason
 * means the key is already bound elsewhere — that's fixed with the bot's
 * /license reset-hwid, not anything the player can do locally.
 */
public final class LicenseGate {

    private static final Logger LOGGER = LoggerFactory.getLogger("TPA Tools License");
    private static final Path KEY_FILE = Path.of("config", "tpa-tools", "license.key");

    private LicenseGate() {}

    public record Activation(boolean valid, String reason) {}

    /** Returns true if TPA Tools' modules should be registered this session. */
    public static boolean check() {
        String key = readKey();
        if (key == null) {
            LOGGER.warn("No license key saved yet. Run /key <your license> in-game to activate — "
                    + "modules are disabled until then.");
            return false;
        }

        return isValidOrFailOpen(verify(key));
    }

    /**
     * Saves {@code key} and verifies it right away. Used by "/key". Unlike
     * check(), this always persists the key so it's picked up on the next
     * launch even if verification fails right now (e.g. the bot is briefly
     * unreachable).
     */
    public static Activation activate(String key) {
        if (key == null || key.isBlank()) {
            return new Activation(false, "empty_key");
        }

        String trimmed = key.trim();
        writeKey(trimmed);

        LicenseChecker.Result result = verify(trimmed);
        boolean valid = isValidOrFailOpen(result);
        String reason = result.valid() ? null : (result.reason() == null ? "unknown" : result.reason());
        return new Activation(valid, reason);
    }

    private static LicenseChecker.Result verify(String key) {
        return LicenseChecker.verify(key, DeviceId.get());
    }

    /** Fails open only on a network error, so a bot outage never locks out a paying user mid-session. */
    private static boolean isValidOrFailOpen(LicenseChecker.Result result) {
        if (result.valid()) {
            LOGGER.info("License OK.");
            return true;
        }

        String reason = result.reason() == null ? "unknown" : result.reason();
        if (reason.startsWith("network_error")) {
            LOGGER.warn("Could not reach the license server ({}). Allowing this session; will re-verify next launch.", reason);
            return true;
        }

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

    private static void writeKey(String key) {
        try {
            Files.createDirectories(KEY_FILE.getParent());
            Files.writeString(KEY_FILE, key, StandardCharsets.UTF_8);
        } catch (IOException e) {
            LOGGER.warn("Failed to save license key to {}: {}", KEY_FILE, e.getMessage());
        }
    }
}
