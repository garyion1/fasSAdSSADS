import { SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';

// Upload the built addon jar to this path on the host (Files tab) — see
// HOSTING.md. Configurable via JAR_PATH in case you'd rather store it
// somewhere else.
const JAR_PATH = process.env.JAR_PATH || path.resolve('releases', 'latest.jar');

export const data = new SlashCommandBuilder()
  .setName('download')
  .setDescription('Get the addon jar');

export async function execute(interaction) {
  if (!fs.existsSync(JAR_PATH)) {
    await interaction.reply({
      content: "The addon jar hasn't been uploaded yet — ask an admin to add it.",
      ephemeral: true,
    });
    return;
  }

  const attachment = new AttachmentBuilder(JAR_PATH);
  await interaction.reply({
    content: 'Here you go! Once installed, run `/key <your license>` in-game to activate it.',
    files: [attachment],
  });
}
