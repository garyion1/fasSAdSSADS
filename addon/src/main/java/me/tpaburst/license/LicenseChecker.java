package me.tpaburst.license;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Calls the license bot's /verify endpoint. Uses only java.net.http and
 * Gson — both already on the classpath for a Fabric/Meteor mod — so no
 * extra Gradle dependency is needed.
 */
public final class LicenseChecker {

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
                    .uri(URI.create(LicenseConfig.VERIFY_URL))
                    .timeout(Duration.ofSeconds(5))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body.toString()));

            if (!LicenseConfig.API_KEY.isBlank()) {
                requestBuilder.header("X-Api-Key", LicenseConfig.API_KEY);
            }

            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(5))
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
            return Result.invalid("network_error: " + e.getMessage());
        }
    }
}
