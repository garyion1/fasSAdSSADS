import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import db from '../db.js';
import { generateLicenseKey, hashKey, lastFour, maskKey, parseDuration } from '../licenseUtils.js';

const PRODUCT_NAME = process.env.PRODUCT_NAME || 'Addon';
const KEY_PREFIX = (process.env.PRODUCT_NAME || 'KEY').slice(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'KEY';

export const data = new SlashCommandBuilder()
  .setName('license')
  .setDescription(`Manage ${PRODUCT_NAME} licenses`)
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setDMPermission(false)
  .addSubcommand((sub) =>
    sub
      .setName('create')
      .setDescription('Create and DM a new license key to a buyer')
      .addUserOption((o) => o.setName('user').setDescription('Buyer to issue the license to').setRequired(true))
      .addStringOption((o) =>
        o.setName('duration').setDescription('e.g. 30d, 6m, 1y — omit for lifetime').setRequired(false),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('revoke')
      .setDescription('Revoke a license key')
      .addStringOption((o) => o.setName('key').setDescription('The license key').setRequired(true)),
  )
  .addSubcommand((sub) =>
    sub
      .setName('reissue')
      .setDescription('Revoke a key and DM the same buyer a fresh one (same expiry)')
      .addStringOption((o) => o.setName('key').setDescription('The license key to replace').setRequired(true)),
  )
  .addSubcommand((sub) =>
    sub
      .setName('list')
      .setDescription("List a user's licenses")
      .addUserOption((o) => o.setName('user').setDescription('User to look up').setRequired(true)),
  )
  .addSubcommand((sub) =>
    sub
      .setName('info')
      .setDescription('Look up a license by key')
      .addStringOption((o) => o.setName('key').setDescription('The license key').setRequired(true)),
  )
  .addSubcommand((sub) =>
    sub
      .setName('reset-hwid')
      .setDescription('Unlock a license from its bound device (e.g. buyer got a new PC)')
      .addStringOption((o) => o.setName('key').setDescription('The license key').setRequired(true)),
  );

function findByKey(rawKey) {
  const hash = hashKey(rawKey);
  return db.prepare('SELECT * FROM licenses WHERE key_hash = ?').get(hash);
}

function insertLicense({ discordUserId, expiresAt }) {
  const rawKey = generateLicenseKey(KEY_PREFIX);
  db.prepare(
    `INSERT INTO licenses (key_hash, key_last4, discord_user_id, product, status, created_at, expires_at)
     VALUES (?, ?, ?, ?, 'active', ?, ?)`,
  ).run(hashKey(rawKey), lastFour(rawKey), discordUserId, PRODUCT_NAME, Date.now(), expiresAt);
  return rawKey;
}

function formatExpiry(expiresAt) {
  return expiresAt ? `<t:${Math.floor(expiresAt / 1000)}:D>` : 'Never (lifetime)';
}

async function dmKey(client, discordUserId, rawKey, expiresAt) {
  const embed = new EmbedBuilder()
    .setTitle(`Your ${PRODUCT_NAME} license`)
    .addFields(
      { name: 'License key', value: `\`${rawKey}\`` },
      { name: 'Expires', value: formatExpiry(expiresAt) },
    )
    .setFooter({ text: 'Keep this key private — anyone with it can activate the addon.' })
    .setColor(0x5865f2);

  try {
    const user = await client.users.fetch(discordUserId);
    await user.send({ embeds: [embed] });
    return true;
  } catch {
    return false;
  }
}

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();

  if (sub === 'create') {
    const user = interaction.options.getUser('user', true);
    const durationInput = interaction.options.getString('duration');

    let expiresAt;
    try {
      expiresAt = parseDuration(durationInput);
    } catch (err) {
      await interaction.reply({ content: err.message, ephemeral: true });
      return;
    }

    const rawKey = insertLicense({ discordUserId: user.id, expiresAt });
    const delivered = await dmKey(interaction.client, user.id, rawKey, expiresAt);

    await interaction.reply({
      content:
        `Created license \`${maskKey(KEY_PREFIX, lastFour(rawKey))}\` for ${user} (expires: ${formatExpiry(expiresAt)}).\n` +
        (delivered ? 'Sent it to them via DM.' : "**Could not DM them** — their DMs may be closed. Share the key with them manually."),
      ephemeral: true,
    });
    if (!delivered) {
      await interaction.followUp({ content: `Key: \`${rawKey}\``, ephemeral: true });
    }
    return;
  }

  if (sub === 'revoke') {
    const rawKey = interaction.options.getString('key', true);
    const row = findByKey(rawKey);
    if (!row) {
      await interaction.reply({ content: 'No license found with that key.', ephemeral: true });
      return;
    }
    db.prepare("UPDATE licenses SET status = 'revoked' WHERE id = ?").run(row.id);
    await interaction.reply({
      content: `Revoked license \`${maskKey(KEY_PREFIX, row.key_last4)}\` (was issued to <@${row.discord_user_id}>).`,
      ephemeral: true,
    });
    return;
  }

  if (sub === 'reissue') {
    const rawKey = interaction.options.getString('key', true);
    const row = findByKey(rawKey);
    if (!row) {
      await interaction.reply({ content: 'No license found with that key.', ephemeral: true });
      return;
    }
    db.prepare("UPDATE licenses SET status = 'revoked' WHERE id = ?").run(row.id);
    const newKey = insertLicense({ discordUserId: row.discord_user_id, expiresAt: row.expires_at });
    const delivered = await dmKey(interaction.client, row.discord_user_id, newKey, row.expires_at);

    await interaction.reply({
      content:
        `Revoked \`${maskKey(KEY_PREFIX, row.key_last4)}\` and issued \`${maskKey(KEY_PREFIX, lastFour(newKey))}\` to <@${row.discord_user_id}>.\n` +
        (delivered ? 'Sent the new key via DM.' : "**Could not DM them** — share the key manually."),
      ephemeral: true,
    });
    if (!delivered) {
      await interaction.followUp({ content: `Key: \`${newKey}\``, ephemeral: true });
    }
    return;
  }

  if (sub === 'list') {
    const user = interaction.options.getUser('user', true);
    const rows = db
      .prepare('SELECT * FROM licenses WHERE discord_user_id = ? ORDER BY created_at DESC')
      .all(user.id);

    if (rows.length === 0) {
      await interaction.reply({ content: `${user} has no licenses on file.`, ephemeral: true });
      return;
    }

    const lines = rows.map(
      (row) =>
        `\`${maskKey(KEY_PREFIX, row.key_last4)}\` — ${row.status} — expires ${formatExpiry(row.expires_at)}`,
    );
    await interaction.reply({ content: `Licenses for ${user}:\n${lines.join('\n')}`, ephemeral: true });
    return;
  }

  if (sub === 'info') {
    const rawKey = interaction.options.getString('key', true);
    const row = findByKey(rawKey);
    if (!row) {
      await interaction.reply({ content: 'No license found with that key.', ephemeral: true });
      return;
    }
    const embed = new EmbedBuilder()
      .setTitle(`License ${maskKey(KEY_PREFIX, row.key_last4)}`)
      .addFields(
        { name: 'Owner', value: `<@${row.discord_user_id}>`, inline: true },
        { name: 'Status', value: row.status, inline: true },
        { name: 'Product', value: row.product, inline: true },
        { name: 'Created', value: `<t:${Math.floor(row.created_at / 1000)}:D>`, inline: true },
        { name: 'Expires', value: formatExpiry(row.expires_at), inline: true },
        {
          name: 'Last verified',
          value: row.last_verified_at ? `<t:${Math.floor(row.last_verified_at / 1000)}:R>` : 'Never',
          inline: true,
        },
        { name: 'Device lock', value: row.hwid_hash ? 'Bound to a device' : 'Not bound yet', inline: true },
      )
      .setColor(row.status === 'active' ? 0x57f287 : 0xed4245);
    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  if (sub === 'reset-hwid') {
    const rawKey = interaction.options.getString('key', true);
    const row = findByKey(rawKey);
    if (!row) {
      await interaction.reply({ content: 'No license found with that key.', ephemeral: true });
      return;
    }
    if (!row.hwid_hash) {
      await interaction.reply({
        content: `\`${maskKey(KEY_PREFIX, row.key_last4)}\` isn't bound to a device yet — nothing to reset.`,
        ephemeral: true,
      });
      return;
    }
    db.prepare('UPDATE licenses SET hwid_hash = NULL WHERE id = ?').run(row.id);
    await interaction.reply({
      content: `Unlocked \`${maskKey(KEY_PREFIX, row.key_last4)}\` — it will bind to whichever device runs \`/key\` next.`,
      ephemeral: true,
    });
    return;
  }
}
