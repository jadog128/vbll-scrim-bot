/**
 * VBLL Batch Bot — Customs & Batch Request Management
 * Dedicated bot for handling custom item orders with a staff-managed queue.
 */

require('dotenv').config({ path: '.env.batch' });
const { 
  Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
  ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle 
} = require('discord.js');
const { createClient } = require('@libsql/client');

// --- Database Configuration ---
const db = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_TOKEN,
});

async function run(sql, params = []) { return await db.execute({ sql, args: params }); }
async function get(sql, params = []) {
  const res = await db.execute({ sql, args: params });
  if (!res.rows.length) return null;
  return Object.fromEntries(res.columns.map((c, i) => [c, res.rows[0][i]]));
}
async function all(sql, params = []) {
  const res = await db.execute({ sql, args: params });
  return res.rows.map(row => Object.fromEntries(res.columns.map((c, i) => [c, row[i]])));
}

let _settings = {};
async function loadSettings() {
  try {
    const rows = await all('SELECT key, value FROM batch_settings');
    for (const r of rows) _settings[r.key] = r.value;
  } catch (e) { console.error('[loadSettings]', e.message); }
}
function getSetting(k) { return _settings[k] ?? null; }
async function setSetting(k, v) {
  _settings[k] = v;
  await run('INSERT OR REPLACE INTO batch_settings (key, value) VALUES (?,?)', [k, v]);
}

async function initDB() {
  console.log('🔌 Initializing Batch Database...');
  await run('CREATE TABLE IF NOT EXISTS batch_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, discord_id TEXT, username TEXT, type TEXT, details TEXT, status TEXT DEFAULT "pending", staff_id TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)');
  await run('CREATE TABLE IF NOT EXISTS batch_settings (key TEXT PRIMARY KEY, value TEXT)');
  await loadSettings();
  console.log('✅ Batch Database Ready.');
}

// --- Permissions ---
const ADMIN_ROLE_ID = '1311380979868504114';
function hasBatchAdmin(member) {
  if (!member) return false;
  if (member.permissions && member.permissions.has('Administrator')) return true;
  return member.roles && member.roles.cache && member.roles.cache.has(ADMIN_ROLE_ID);
}

// --- Bot Client ---
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

client.on('interactionCreate', async interaction => {
  // --- 📝 Request Process (/batch_request or Buttons) ---
  if (interaction.isCommand() && interaction.commandName === 'batch_request') {
    const type = interaction.options.getString('type');
    const details = interaction.options.getString('details');
    await handleNewRequest(interaction, type, details);
  }

  if (interaction.isButton() && interaction.customId.startsWith('batch_btn_type_')) {
    const type = interaction.customId.replace('batch_btn_type_', '');
    const modal = new ModalBuilder()
      .setCustomId(`batch_modal_${type}`)
      .setTitle(`Request Custom ${type.charAt(0).toUpperCase() + type.slice(1)}`);
    
    const input = new TextInputBuilder()
      .setCustomId('details')
      .setLabel('Provide any specific details')
      .setPlaceholder('Color, name, specific requirements...')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);
    
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId.startsWith('batch_modal_')) {
    const type = interaction.customId.replace('batch_modal_', '');
    const details = interaction.fields.getTextInputValue('details');
    await handleNewRequest(interaction, type, details);
  }

  // --- 🛠️ Management Commands ---
  if (interaction.isCommand()) {
    if (['post-batch-request', 'batch_check', 'batch_add', 'batch_remove', 'batch_clear', 'set-batch-review-channel'].includes(interaction.commandName)) {
      if (!hasBatchAdmin(interaction.member)) return interaction.reply({ content: '❌ You do not have permission to use batch management commands.', ephemeral: true });
    }

    if (interaction.commandName === 'post-batch-request') {
      const embed = new EmbedBuilder()
        .setTitle('👕 Request a Batch Custom')
        .setDescription('Click a button below to start your request for a custom VRDL item.\n\nOptions:\n👕 Jersey | 👟 Shoes | 🧢 Hat | ✨ Other')
        .setColor(0x5865f2);
      
      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('batch_btn_type_jersey').setLabel('Jersey').setStyle(ButtonStyle.Primary).setEmoji('👕'),
        new ButtonBuilder().setCustomId('batch_btn_type_shoes').setLabel('Shoes').setStyle(ButtonStyle.Primary).setEmoji('👟'),
        new ButtonBuilder().setCustomId('batch_btn_type_hat').setLabel('Hat').setStyle(ButtonStyle.Primary).setEmoji('🧢'),
        new ButtonBuilder().setCustomId('batch_btn_type_other').setLabel('Other').setStyle(ButtonStyle.Secondary).setEmoji('✨')
      );

      await interaction.reply({ embeds: [embed], components: [buttons] });
    }

    if (interaction.commandName === 'set-batch-review-channel') {
      const channel = interaction.options.getChannel('channel');
      await setSetting('review_channel', channel.id);
      await interaction.reply({ content: `✅ Batch review channel set to <#${channel.id}>`, ephemeral: true });
    }

    if (interaction.commandName === 'batch_check') {
      const pending = await all('SELECT * FROM batch_requests WHERE status = "pending" ORDER BY id ASC');
      if (!pending.length) return interaction.reply({ content: '📭 The batch queue is currently empty!', ephemeral: true });
      
      const embed = new EmbedBuilder()
        .setTitle('📋 Pending Batch Queue')
        .setColor(0x5865f2)
        .setDescription(pending.map(p => `**#${p.id}** | <@${p.discord_id}> | ${p.type.toUpperCase()}`).join('\n') || 'None');
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (interaction.commandName === 'batch_add') {
      const target = interaction.options.getUser('player');
      const type = interaction.options.getString('type');
      const details = interaction.options.getString('details');
      await createRequest(target.id, target.username, type, details, interaction);
    }

    if (interaction.commandName === 'batch_remove') {
      const id = interaction.options.getInteger('id');
      await run('DELETE FROM batch_requests WHERE id = ?', [id]);
      await interaction.reply({ content: `🗑️ Removed request **#${id}** from the queue.`, ephemeral: true });
    }

    if (interaction.commandName === 'batch_clear') {
      await run('DELETE FROM batch_requests WHERE status = "pending"');
      await interaction.reply({ content: '🧹 Cleared all pending requests from the queue.', ephemeral: true });
    }
  }

  // --- 🔘 Staff Buttons ---
  if (interaction.isButton() && (interaction.customId.startsWith('batch_approve_') || interaction.customId.startsWith('batch_complete_') || interaction.customId.startsWith('batch_reject_'))) {
    if (!hasBatchAdmin(interaction.member)) return interaction.reply({ content: '❌ Staff Only.', ephemeral: true });
    
    const parts = interaction.customId.split('_');
    const action = parts[1];
    const id = parts[2];
    
    const status = action === 'approve' ? 'approved' : action === 'complete' ? 'completed' : 'rejected';
    await run('UPDATE batch_requests SET status = ?, staff_id = ? WHERE id = ?', [status, interaction.user.id, id]);
    
    const req = await get('SELECT * FROM batch_requests WHERE id = ?', [id]);
    if (req) {
      const dmEmbed = new EmbedBuilder()
        .setTitle(`🆕 Order Update: #${id}`)
        .setDescription(`Your request for a **${req.type.toUpperCase()}** has been **${status.toUpperCase()}**.`)
        .setColor(status === 'completed' ? 0x00f5a0 : status === 'approved' ? 0x5865f2 : 0xff4d4d)
        .setTimestamp();
      
      try {
        const user = await client.users.fetch(req.discord_id);
        await user.send({ embeds: [dmEmbed] });
      } catch (e) { console.warn(`Could not DM user ${req.discord_id}`); }
    }

    const oldEmbed = interaction.message.embeds[0];
    const newEmbed = EmbedBuilder.from(oldEmbed)
      .setTitle(`${status.toUpperCase()} | ${oldEmbed.title}`)
      .setColor(status === 'completed' ? 0x00f5a0 : status === 'approved' ? 0x5865f2 : 0xff4d4d)
      .setFooter({ text: `${status.charAt(0).toUpperCase() + status.slice(1)} by ${interaction.user.username}` });

    await interaction.update({ embeds: [newEmbed], components: [] });
  }
});

async function handleNewRequest(interaction, type, details) {
  const isDeferred = interaction.deferred || interaction.replied;
  if (!isDeferred) await interaction.deferReply({ ephemeral: true });
  
  await createRequest(interaction.user.id, interaction.user.username, type, details, interaction);
}

async function createRequest(userId, username, type, details, interaction) {
  await run('INSERT INTO batch_requests (discord_id, username, type, details) VALUES (?,?,?,?)', [userId, username, type, details]);
  const req = await get('SELECT id FROM batch_requests WHERE discord_id = ? ORDER BY id DESC LIMIT 1', [userId]);
  const id = req.id;

  const reviewChannelId = getSetting('review_channel');
  if (reviewChannelId) {
    const ch = await client.channels.fetch(reviewChannelId).catch(() => null);
    if (ch) {
      const embed = new EmbedBuilder()
        .setTitle(`📥 New Batch Request: ${type.toUpperCase()} (#${id})`)
        .setDescription(`**Player:** <@${userId}> (${username})\n**Type:** ${type}\n**Details:** ${details}`)
        .setColor(0x5865f2)
        .setTimestamp();

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`batch_approve_${id}`).setLabel('Approve').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`batch_complete_${id}`).setLabel('Fullfil').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`batch_reject_${id}`).setLabel('Reject').setStyle(ButtonStyle.Danger)
      );

      await ch.send({ embeds: [embed], components: [buttons] });
    }
  }

  const successEmbed = new EmbedBuilder()
    .setTitle('✅ Request Submitted!')
    .setDescription(`Your request for a **${type.toUpperCase()}** has been added to the queue (#${id}). You will receive a DM when there is an update.`)
    .setColor(0x00f5a0);

  try {
    const user = await client.users.fetch(userId);
    await user.send({ embeds: [successEmbed] });
  } catch (e) { }

  if (interaction.replied || interaction.deferred) {
    await interaction.editReply({ embeds: [successEmbed] });
  } else {
    await interaction.reply({ embeds: [successEmbed], ephemeral: true });
  }
}

client.once('ready', () => {
  console.log(`🤖 Batch Bot Logged In as ${client.user.tag}`);
});

initDB().then(() => client.login(process.env.BATCH_DISCORD_TOKEN));
