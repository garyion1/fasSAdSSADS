package me.tpaburst;

import dev.notdutt.spawnernoti.modules.SpawnerNotifier;
import me.tpaburst.license.KeyCommand;
import me.tpaburst.license.LicenseGate;
import me.tpaburst.modules.AutoLootSell;
import me.tpaburst.modules.AutoStrength;
import me.tpaburst.modules.KillHistory;
import me.tpaburst.modules.LootHistory;
import me.tpaburst.modules.TPABurst;
import meteordevelopment.meteorclient.addons.MeteorAddon;
import meteordevelopment.meteorclient.systems.modules.Category;
import meteordevelopment.meteorclient.systems.modules.Modules;
import net.fabricmc.fabric.api.client.command.v2.ClientCommandRegistrationCallback;
import net.minecraft.item.Items;

public class TPABurstAddon extends MeteorAddon {
    public static final Category CATEGORY = new Category("TPA Tools", Items.ENDER_PEARL.getDefaultStack());

    private static boolean modulesRegistered = false;

    @Override
    public void onInitialize() {
        // Registers "/key <license>" — a client-side-only command (see KeyCommand),
        // so buyers can activate without editing a config file.
        ClientCommandRegistrationCallback.EVENT.register(KeyCommand::register);

        if (LicenseGate.check()) {
            registerModules();
        }
    }

    /**
     * Adds TPA Tools' modules to Meteor. Called at startup if a license file is
     * already valid, and again by KeyCommand once "/key" activates one — safe
     * to call twice, only registers once.
     */
    public static synchronized void registerModules() {
        if (modulesRegistered) return;
        modulesRegistered = true;

        Modules.get().add(new TPABurst());
        Modules.get().add(new AutoLootSell());
        Modules.get().add(new AutoStrength());
        Modules.get().add(new KillHistory());
        Modules.get().add(new LootHistory());
        Modules.get().add(new SpawnerNotifier());
    }

    @Override
    public void onRegisterCategories() {
        Modules.registerCategory(CATEGORY);
    }

    @Override
    public String getPackage() {
        return "me.tpaburst";
    }
}
