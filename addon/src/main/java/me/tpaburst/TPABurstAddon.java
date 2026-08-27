package me.tpaburst;

import dev.notdutt.spawnernoti.modules.SpawnerNotifier;
import me.tpaburst.license.LicenseGate;
import me.tpaburst.modules.AutoLootSell;
import me.tpaburst.modules.AutoStrength;
import me.tpaburst.modules.KillHistory;
import me.tpaburst.modules.LootHistory;
import me.tpaburst.modules.TPABurst;
import meteordevelopment.meteorclient.addons.MeteorAddon;
import meteordevelopment.meteorclient.systems.modules.Category;
import meteordevelopment.meteorclient.systems.modules.Modules;
import net.minecraft.item.Items;

public class TPABurstAddon extends MeteorAddon {
    public static final Category CATEGORY = new Category("TPA Tools", Items.ENDER_PEARL.getDefaultStack());

    @Override
    public void onInitialize() {
        if (!LicenseGate.check()) {
            return;
        }

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
