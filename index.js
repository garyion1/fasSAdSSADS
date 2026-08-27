import 'dotenv/config';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import { createServer } from './api/server.js';
import * as licenseCommand from './commands/license.js';
import * as banCommand from './commands/ban.js';
import * as muteCommand from './commands/mute.js';
import * as warnCommand from './commands/warn.js';

const { DISCORD_TOKEN, PORT } = process.env;

if (!DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN must be set in .env');
  process.exit(1);
}

const commands = new Map(
  [licenseCommand, banCommand, muteCommand, warnCommand].map((cmd) => [cmd.data.name, cmd]),
);

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (c) => {
  console.log(`Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`Error handling /${interaction.commandName}:`, err);
    const payload = { content: 'Something went wrong running that command.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
});

client.login(DISCORD_TOKEN);

const port = Number(PORT) || 3001;
createServer().listen(port, () => {
  console.log(`License verification API listening on port ${port}`);
});
