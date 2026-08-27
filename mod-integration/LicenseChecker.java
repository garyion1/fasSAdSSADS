// Example integration for a Forge/Fabric mod. Adapt package names and the
// config source to your project. Uses only java.net.http and Gson, both of
// which ship with the JVM / Minecraft respectively, so no extra dependency
// is required.
//
// Call LicenseChecker.verify(key) once during mod init (e.g. FabricInitializer
// .onInitialize() or Forge's FMLCommonSetupEvent) and gate your mod's
// functionality on the result. Doing this off the main client thread avoids
// blocking startup on a slow network call.

package com.example.yourmod.license;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

public final class LicenseChecker {

    // Point this at wherever you host the bot's API (see bot/README.md).
    private static final String VERIFY_URL = "https://your-bot-host.example.com/verify";
    // Must match LICENSE_API_KEY in the bot's .env. Optional — leave blank on
    // both sides to skip this header entirely.
    private static final String API_KEY = "";

    private LicenseChecker() {}

    public record Result(boolean valid, String reason, Long expiresAtEpochMs) {
        static Result invalid(String reason) {
            return new Result(false, reason, null);
        }
    }

    public static Result verify(String licenseKey) {
        if (licenseKey == null || licenseKey.isBlank()) {
            return Result.invalid("missing_key");
        }

        try {
            JsonObject body = new JsonObject();
            body.addProperty("key", licenseKey);

            HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(VERIFY_URL))
                    .timeout(Duration.ofSeconds(10))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body.toString()));

            if (!API_KEY.isBlank()) {
                requestBuilder.header("X-Api-Key", API_KEY);
            }

            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(10))
                    .build();

            HttpResponse<String> response = client.send(requestBuilder.build(), HttpResponse.BodyHandlers.ofString());
            JsonObject json = JsonParser.parseString(response.body()).getAsJsonObject();

            boolean valid = json.has("valid") && json.get("valid").getAsBoolean();
            if (!valid) {
                String reason = json.has("reason") ? json.get("reason").getAsString() : "unknown";
                return Result.invalid(reason);
            }

            Long expiresAt = (json.has("expiresAt") && !json.get("expiresAt").isJsonNull())
                    ? json.get("expiresAt").getAsLong()
                    : null;
            return new Result(true, null, expiresAt);
        } catch (Exception e) {
            // Network failure, bot offline, etc. Decide here whether to fail
            // open (allow use offline) or fail closed (block until reachable) —
            // that's a product decision, not a technical one.
            return Result.invalid("network_error: " + e.getMessage());
        }
    }
}
