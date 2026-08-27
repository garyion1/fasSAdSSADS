import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import db from '../db.js';

export const data = new SlashCommandBuilder()
  .setName('warn')
  .setDescription('Log a warning against a member')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .setDMPermission(false)
  .addUserOption((o) => o.setName('user').setDescription('Member to warn').setRequired(true))
  .addStringOption((o) => o.setName('reason').setDescription('Reason for the warning').setRequired(true));

export async function execute(interaction) {
  const user = interaction.options.getUser('user', true);
  const reason = interaction.options.getString('reason', true);

  db.prepare(
    'INSERT INTO warnings (guild_id, discord_user_id, moderator_id, reason, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(interaction.guildId, user.id, interaction.user.id, reason, Date.now());

  const { c: count } = db
    .prepare('SELECT COUNT(*) AS c FROM warnings WHERE guild_id = ? AND discord_user_id = ?')
    .get(interaction.guildId, user.id);

  await user.send(`You were warned in **${interaction.guild.name}**.\nReason: ${reason}`).catch(() => {});

  await interaction.reply({
    content: `Warned ${user} (${count} total warning${count === 1 ? '' : 's'} on record). Reason: ${reason}`,
    ephemeral: true,
  });
}
