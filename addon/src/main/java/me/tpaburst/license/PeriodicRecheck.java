package me.tpaburst.license;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Re-verifies the license every {@link #INTERVAL_MINUTES} while the game
 * keeps running, instead of only once at startup. A boot-time-only check is
 * a single thing to find and patch out; one that has to keep succeeding to
 * keep {@link LicenseState} valid (see its doc) is a moving target instead.
 */
public final class PeriodicRecheck {

    private static final Logger LOGGER = LoggerFactory.getLogger("TPA Tools License");
    private static final long INTERVAL_MINUTES = 15;

    private static ScheduledExecutorService scheduler;

    private PeriodicRecheck() {}

    /** Idempotent — safe to call every time modules register. */
    public static synchronized void start() {
        if (scheduler != null) return;

        scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "tpa-tools-license-recheck");
            t.setDaemon(true);
            return t;
        });

        scheduler.scheduleWithFixedDelay(() -> {
            try {
                LicenseGate.check();
            } catch (Exception e) {
                LOGGER.warn("Periodic license re-check failed unexpectedly: {}", e.getMessage());
            }
        }, INTERVAL_MINUTES, INTERVAL_MINUTES, TimeUnit.MINUTES);
    }
}
