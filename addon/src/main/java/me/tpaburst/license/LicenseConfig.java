package me.tpaburst.license;

public final class LicenseConfig {

    /**
     * URL of the bot's /verify endpoint (see the repo root README.md's
     * "Deploying the API publicly"). Must be reachable from players'
     * machines, so this can't be localhost — fill it in once the bot is
     * hosted somewhere public.
     */
    public static final String VERIFY_URL = "https://your-bot-host.example.com/verify";

    /**
     * Must match LICENSE_API_KEY in the bot's .env. Leave both blank to skip
     * this header entirely.
     */
    public static final String API_KEY = "";

    private LicenseConfig() {}
}
