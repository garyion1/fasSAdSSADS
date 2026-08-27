import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { data as licenseCommand } from './commands/license.js';
import { data as banCommand } from './commands/ban.js';
import { data as muteCommand } from './commands/mute.js';
import { data as warnCommand } from './commands/warn.js';

const { DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
  console.error('DISCORD_TOKEN and DISCORD_CLIENT_ID must be set in .env');
  process.exit(1);
}

const commands = [licenseCommand, banCommand, muteCommand, warnCommand].map((c) => c.toJSON());
const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

const route = DISCORD_GUILD_ID
  ? Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID)
  : Routes.applicationCommands(DISCORD_CLIENT_ID);

try {
  await rest.put(route, { body: commands });
  console.log(
    DISCORD_GUILD_ID
      ? `Registered ${commands.length} command(s) to guild ${DISCORD_GUILD_ID}.`
      : `Registered ${commands.length} command(s) globally (may take up to an hour to appear).`,
  );
} catch (err) {
  console.error('Failed to register commands:', err);
  process.exit(1);
}
