package me.tpaburst.license;

import java.util.concurrent.atomic.AtomicLong;

/**
 * Tracks whether TPA Tools is currently licensed — as a timestamp, not a
 * plain boolean.
 *
 * A field like "public static boolean licensed" is one of the first things
 * someone patching a compiled jar looks for: find it, flip one byte, it's
 * always true forever. Here, isLicensed() really means "now is before
 * validUntil", and validUntil only moves forward when a real, successful
 * license check runs (see PeriodicRecheck, which re-runs one periodically
 * instead of only once at startup). That means simply deleting or
 * bypassing the check doesn't help an attacker on its own — with nothing
 * advancing validUntil, it stops being true a few minutes later on its own.
 *
 * This is still, underneath, just a comparison sitting in bytecode that a
 * determined enough person can locate and patch — no client-side scheme is
 * immune to that, and this repo doesn't claim otherwise. It's a
 * meaningfully harder target than a single static boolean, which is the
 * realistic bar for this kind of check.
 */
public final class LicenseState {

    private static final AtomicLong validUntilEpochMs = new AtomicLong(0);

    private LicenseState() {}

    public static boolean isLicensed() {
        return System.currentTimeMillis() < validUntilEpochMs.get();
    }

    /** Extends validity by {@code graceMs} from now. Called after a successful check. */
    static void extend(long graceMs) {
        validUntilEpochMs.set(System.currentTimeMillis() + graceMs);
    }

    /** Immediately invalidates — used when the server gives an explicit rejection. */
    static void invalidateNow() {
        validUntilEpochMs.set(0);
    }
}
