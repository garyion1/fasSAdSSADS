import { REST, Routes } from 'discord.js';

/**
 * Registers slash commands with Discord's API (a PUT that replaces whatever
 * was previously registered for this application/guild). Used both by
 * deploy-commands.js (manual, for CI or a deliberate one-off redeploy) and
 * automatically by index.js on every bot startup — so pressing "Start" is
 * enough on its own; there's no separate step to remember or get wrong.
 *
 * Registering on every boot is safe: it's the same idempotent PUT either
 * way, and Discord doesn't rate-limit or penalize re-sending the same
 * command set on a normal restart cadence.
 */
export async function registerCommands(commandsData) {
  const { DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID } = process.env;

  if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
    throw new Error('DISCORD_TOKEN and DISCORD_CLIENT_ID must be set in .env');
  }

  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  const route = DISCORD_GUILD_ID
    ? Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID)
    : Routes.applicationCommands(DISCORD_CLIENT_ID);

  await rest.put(route, { body: commandsData.map((c) => c.toJSON()) });

  return {
    count: commandsData.length,
    scope: DISCORD_GUILD_ID ? `guild ${DISCORD_GUILD_ID}` : 'globally (may take up to an hour to appear)',
  };
}
