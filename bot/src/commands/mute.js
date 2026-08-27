import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

const DURATION_RE = /^(\d+)(m|h|d)$/i;
const UNIT_MS = { m: 60_000, h: 60 * 60_000, d: 24 * 60 * 60_000 };
const MAX_TIMEOUT_MS = 28 * 24 * 60 * 60_000; // Discord's own cap on timeouts
const DEFAULT_DURATION = '10m';

function parseMuteDuration(input) {
  const raw = input ?? DEFAULT_DURATION;
  const match = DURATION_RE.exec(raw.trim());
  if (!match) {
    throw new Error(`Invalid duration "${input}". Use formats like 10m, 2h, or 1d (max 28d).`);
  }
  const [, amount, unit] = match;
  const ms = Number(amount) * UNIT_MS[unit.toLowerCase()];
  if (ms > MAX_TIMEOUT_MS) {
    throw new Error('Discord timeouts cap out at 28 days.');
  }
  return ms;
}

export const data = new SlashCommandBuilder()
  .setName('mute')
  .setDescription('Time out a member so they cannot send messages or speak')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .setDMPermission(false)
  .addUserOption((o) => o.setName('user').setDescription('Member to mute').setRequired(true))
  .addStringOption((o) =>
    o.setName('duration').setDescription(`e.g. 10m, 2h, 1d — default ${DEFAULT_DURATION}, max 28d`).setRequired(false),
  )
  .addStringOption((o) => o.setName('reason').setDescription('Reason for the mute').setRequired(false));

export async function execute(interaction) {
  const user = interaction.options.getUser('user', true);
  const durationInput = interaction.options.getString('duration');
  const reason = interaction.options.getString('reason') ?? 'No reason provided';

  let ms;
  try {
    ms = parseMuteDuration(durationInput);
  } catch (err) {
    await interaction.reply({ content: err.message, ephemeral: true });
    return;
  }

  const member = await interaction.guild.members.fetch(user.id).catch(() => null);
  if (!member) {
    await interaction.reply({ content: `${user} isn't in this server.`, ephemeral: true });
    return;
  }
  if (!member.moderatable) {
    await interaction.reply({
      content: `I can't mute ${user} — they may outrank me or hold a role above mine.`,
      ephemeral: true,
    });
    return;
  }

  try {
    await member.timeout(ms, `${reason} (by ${interaction.user.tag})`);
  } catch (err) {
    await interaction.reply({ content: `Failed to mute ${user}: ${err.message}`, ephemeral: true });
    return;
  }

  const label = durationInput ?? DEFAULT_DURATION;
  await user.send(`You were muted in **${interaction.guild.name}** for ${label}.\nReason: ${reason}`).catch(() => {});
  await interaction.reply({ content: `Muted ${user} for ${label}. Reason: ${reason}`, ephemeral: true });
}
