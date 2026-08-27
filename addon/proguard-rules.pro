# ProGuard rules for TPA Tools' release jar.
#
# NOT WIRED INTO build.gradle YET — see the commented block there. This
# repo doesn't have Fabric Loom set up (see build.gradle's own note), so
# there's no real build to run this against here; these rules are written
# and ready for whenever that build exists, not tested against it.
#
# What obfuscation buys you: right now, decompiling the *original* jar
# (before any of this) gave back nearly-readable code — that's the whole
# reason a "source recovery" was needed at all. Running the real build
# through ProGuard renames classes/methods/fields to meaningless names,
# strips debug/line info, and can inline or fold simple logic — so a future
# decompile comes back as a much harder puzzle instead of readable Java.
# It does not make the check impossible to find or patch; it raises the
# time and skill needed to do it.

# Meteor scans for this exact class by the fully-qualified name declared in
# fabric.mod.json ("me.tpaburst.TPABurstAddon") — if it gets renamed, the
# addon fails to load at all. Keep it, and its no-arg constructor, as-is.
-keep class me.tpaburst.TPABurstAddon {
    public <init>();
}

# Standard Fabric/Minecraft rules: don't touch anything Fabric Loader itself
# looks up by name, and keep enum/record support intact.
-keepattributes Signature,InnerClasses,EnclosingMethod,*Annotation*
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Everything else under me.tpaburst / dev.notdutt — including the whole
# license package — is fair game to rename and fold. That's the point.
