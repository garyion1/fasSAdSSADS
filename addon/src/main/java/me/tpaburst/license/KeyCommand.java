package me.tpaburst.license;

import com.mojang.brigadier.CommandDispatcher;
import com.mojang.brigadier.arguments.StringArgumentType;
import me.tpaburst.TPABurstAddon;
import net.fabricmc.fabric.api.client.command.v2.ClientCommandManager;
import net.fabricmc.fabric.api.client.command.v2.FabricClientCommandSource;
import net.minecraft.command.CommandRegistryAccess;
import net.minecraft.text.Text;

/**
 * "/key <license>" — activates a TPA Tools license in-game.
 *
 * Registered as a Fabric *client* command (fabric-command-api-v2), which is
 * intercepted and consumed entirely on the client: it is never sent to the
 * server, so the license key never appears in server chat logs. Requires
 * the fabric-command-api-v2 module of Fabric API on the build's classpath
 * (Meteor Client already depends on Fabric API as a whole, so this should
 * already be available — just confirm it's not excluded).
 *
 * NOTE: written against the Fabric API client-command signatures at the
 * time of writing; this project has no Fabric/Minecraft dependencies
 * configured yet (see build.gradle), so this hasn't been compile-checked
 * against Minecraft 1.21.11 specifically. Double-check the
 * ClientCommandRegistrationCallback / CommandRegistryAccess signatures
 * against the exact Fabric API version once this builds for real.
 */
public final class KeyCommand {

    private KeyCommand() {}

    public static void register(CommandDispatcher<FabricClientCommandSource> dispatcher, CommandRegistryAccess registryAccess) {
        dispatcher.register(ClientCommandManager.literal("key")
                .then(ClientCommandManager.argument("license", StringArgumentType.greedyString())
                        .executes(KeyCommand::run)));
    }

    private static int run(com.mojang.brigadier.context.CommandContext<FabricClientCommandSource> context) {
        String key = StringArgumentType.getString(context, "license");
        LicenseGate.Activation activation = LicenseGate.activate(key);

        if (activation.valid()) {
            TPABurstAddon.registerModules();
            if (activation.reason() != null) {
                context.getSource().sendFeedback(Text.literal(
                        "TPA Tools: saved, but couldn't reach the license server right now (" + activation.reason()
                                + "). Enabled for this session — will re-verify next launch."));
            } else {
                context.getSource().sendFeedback(Text.literal("TPA Tools: license activated, modules enabled."));
            }
        } else {
            context.getSource().sendError(Text.literal(
                    "TPA Tools: license invalid (" + activation.reason() + "). Check your key and try again."));
        }

        return 1;
    }
}
