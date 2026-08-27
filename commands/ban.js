import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('ban')
  .setDescription('Ban a member from this server')
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
  .setDMPermission(false)
  .addUserOption((o) => o.setName('user').setDescription('Member to ban').setRequired(true))
  .addStringOption((o) => o.setName('reason').setDescription('Reason for the ban').setRequired(false))
  .addIntegerOption((o) =>
    o
      .setName('delete_days')
      .setDescription("Delete this many days of the member's recent messages (0-7, default 0)")
      .setMinValue(0)
      .setMaxValue(7)
      .setRequired(false),
  );

export async function execute(interaction) {
  const user = interaction.options.getUser('user', true);
  const reason = interaction.options.getString('reason') ?? 'No reason provided';
  const deleteDays = interaction.options.getInteger('delete_days') ?? 0;

  const member = await interaction.guild.members.fetch(user.id).catch(() => null);
  if (member && !member.bannable) {
    await interaction.reply({
      content: `I can't ban ${user} — they may outrank me or hold a role above mine.`,
      ephemeral: true,
    });
    return;
  }

  await user.send(`You were banned from **${interaction.guild.name}**.\nReason: ${reason}`).catch(() => {});

  try {
    await interaction.guild.members.ban(user.id, {
      reason: `${reason} (by ${interaction.user.tag})`,
      deleteMessageSeconds: deleteDays * 86400,
    });
  } catch (err) {
    await interaction.reply({ content: `Failed to ban ${user}: ${err.message}`, ephemeral: true });
    return;
  }

  await interaction.reply({ content: `Banned ${user}. Reason: ${reason}`, ephemeral: true });
}
