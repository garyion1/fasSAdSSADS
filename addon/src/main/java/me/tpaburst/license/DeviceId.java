package me.tpaburst.license;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

/**
 * A random ID generated once and persisted locally to identify "this
 * installation" for license binding.
 *
 * This is deliberately not a true hardware fingerprint (MAC address, disk
 * serial, etc.) — gathering those reliably in pure Java across Windows/Mac/
 * Linux is inconsistent and easy to get wrong. A random per-install ID is
 * simpler and just as effective for the actual goal: once the bot has bound
 * a license to an ID, a different install (a friend's PC, a fresh copy of
 * the key) won't have that ID and gets rejected until an admin resets it.
 * Deleting this file and getting a new random ID doesn't help someone reuse
 * a shared key — the bot still remembers the original binding.
 */
public final class DeviceId {

    private static final Logger LOGGER = LoggerFactory.getLogger("TPA Tools License");
    private static final Path ID_FILE = Path.of("config", "tpa-tools", "device.id");

    private static volatile String cached;

    private DeviceId() {}

    public static synchronized String get() {
        if (cached != null) return cached;

        String existing = read();
        if (existing != null) {
            cached = existing;
            return cached;
        }

        String generated = UUID.randomUUID().toString();
        write(generated);
        cached = generated;
        return cached;
    }

    private static String read() {
        try {
            if (!Files.exists(ID_FILE)) return null;
            String id = Files.readString(ID_FILE, StandardCharsets.UTF_8).trim();
            return id.isEmpty() ? null : id;
        } catch (IOException e) {
            LOGGER.warn("Failed to read {}: {}", ID_FILE, e.getMessage());
            return null;
        }
    }

    private static void write(String id) {
        try {
            Files.createDirectories(ID_FILE.getParent());
            Files.writeString(ID_FILE, id, StandardCharsets.UTF_8);
        } catch (IOException e) {
            LOGGER.warn("Failed to save {}: {}", ID_FILE, e.getMessage());
        }
    }
}
