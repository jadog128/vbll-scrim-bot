/**
 * VBLL Batch Bot — Customs & Batch Request Management
 * Phase 9: Unified Portal & Discord Feedback System
 */

require('dotenv').config();
require('dotenv').config({ path: '.env.batch' });
const { 
  Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
  ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle,
  REST, Routes, SlashCommandBuilder, Partials, PermissionFlagsBits, AttachmentBuilder
} = require('discord.js');
const { createClient } = require('@libsql/client');
const http = require('http');

// --- 🔌 Database Setup ---
let db;
function getDB() {
  if (db) return db;
  const url = process.env.TURSO_URL || process.env.SCRIM_TURSO_URL;
  const token = process.env.TURSO_TOKEN || process.env.SCRIM_TURSO_TOKEN;
  if (!url) {
    console.error("❌ CRITICAL ERROR: TURSO_URL is missing!");
    return { execute: async () => ({ rows: [] }) };
  }
  db = createClient({ url, authToken: token || "" });
  return db;
}

async function run(sql, params = []) { return await getDB().execute({ sql, args: params }); }
async function get(sql, params = []) { const r = await getDB().execute({ sql, args: params }); return r.rows[0]; }
async function all(sql, params = []) { const r = await getDB().execute({ sql, args: params }); return r.rows; }

async function initDB() {
  await run(`CREATE TABLE IF NOT EXISTS batch_settings (key TEXT PRIMARY KEY, value TEXT)`);
  await run(`CREATE TABLE IF NOT EXISTS batch_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discord_id TEXT,
    username TEXT,
    vrfs_id TEXT,
    type TEXT,
    details TEXT,
    proof_url TEXT,
    status TEXT DEFAULT 'pending',
    staff_id TEXT,
    msg_id TEXT,
    ch_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await run(`CREATE TABLE IF NOT EXISTS batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    status TEXT DEFAULT 'open',
    released_at TIMESTAMP
  )`);
  await run(`CREATE TABLE IF NOT EXISTS batch_options (
    name TEXT PRIMARY KEY
  )`);
  await run(`CREATE TABLE IF NOT EXISTS batch_tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discord_id TEXT,
    username TEXT,
    issue TEXT,
    status TEXT DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await run(`CREATE TABLE IF NOT EXISTS staff_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id TEXT,
    staff_name TEXT,
    action TEXT,
    target_id TEXT,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  try { await run(`ALTER TABLE batch_requests ADD COLUMN batch_id INTEGER`); } catch(_) {}
  console.log('✅ Batch Database Ready.');
}

async function logStaffAction(staffId, staffName, action, targetId, details) {
  try { await run("INSERT INTO staff_logs (staff_id, staff_name, action, target_id, details) VALUES (?,?,?,?,?)", [staffId, staffName, action, targetId, details]); } catch (e) {}
}

async function checkMilestoneRoles(userId) {
  const countData = await get("SELECT COUNT(*) as cnt FROM batch_requests WHERE discord_id = ? AND status = 'completed'", [userId]);
  const count = countData.cnt;
  const MILESTONES = { 5: '123456789012345678', 10: '123456789012345678', 25: '123456789012345678' };
  try {
    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    if (!guild) return;
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return;
    for (const [m, roleId] of Object.entries(MILESTONES)) {
      if (count >= parseInt(m) && !member.roles.cache.has(roleId)) await member.roles.add(roleId);
    }
  } catch (e) {}
}

// --- ⚙️ Settings Cache ---
let settingsCache = {};
async function loadSettings() {
  const rows = await all('SELECT key, value FROM batch_settings');
  settingsCache = Object.fromEntries(rows.map(r => [r.key, r.value]));
}
function getSetting(key) { return settingsCache[key]; }
async function setSetting(key, value) {
  await run('INSERT OR REPLACE INTO batch_settings (key, value) VALUES (?,?)', [key, value]);
  settingsCache[key] = value;
}

// --- 🌍 Bot API ---
const PORT = process.env.PORT || 3000;
const API_TOKEN = process.env.WEB_API_TOKEN || "vbll_batch_secret";
http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'POST' && req.url === '/notify-dm') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { userId, status, type, id, reason } = JSON.parse(body);
        const user = await client.users.fetch(userId).catch(() => null);
        if (user) {
          const embed = new EmbedBuilder().setTitle(`🆕 Order Update: #${id}`).setDescription(`Your request for a **${type.toUpperCase()}** has been **${status.toUpperCase()}**.`).setColor(status === 'completed' ? 0x00f5a0 : 0xff4d4d);
          if (reason) embed.addFields({ name: 'Reason', value: reason });
          await user.send({ embeds: [embed] }).catch(() => {});
        }
        res.writeHead(200); res.end('OK');
      } catch (e) { res.writeHead(400); res.end('Error'); }
    });
    return;
  }
  res.writeHead(200); res.end('API Online');
}).listen(PORT);

// --- 🤖 Bot Client ---
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.DirectMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember]
});

function hasBatchAdmin(member) {
  if (!member) return false;
  if (member.id === '1145402830786678884') return true;
  return member.permissions && member.permissions.has(PermissionFlagsBits.Administrator);
}

async function performRejection(interaction, id, reason) {
  const req = await get('SELECT * FROM batch_requests WHERE id = ?', [id]);
  if (!req) return interaction.reply({ content: '❌ Request not found.', ephemeral: true });

  await run("UPDATE batch_requests SET status = 'rejected', staff_id = ? WHERE id = ?", [interaction.user.id, id]);
  await logStaffAction(interaction.user.id, interaction.user.username, 'REJECTED_MANUAL', id, `Reason: ${reason}`);

  if (interaction.message) await interaction.message.delete().catch(() => {});

  try {
    const user = await client.users.fetch(req.discord_id);
    const embed = new EmbedBuilder()
      .setTitle('❌ Request Rejected')
      .setDescription(`Your request for a **${req.type.toUpperCase()}** (#${id}) was rejected by staff.`)
      .addFields({ name: 'Reason', value: reason })
      .setColor(0xff4d4d)
      .setTimestamp();
    await user.send({ embeds: [embed] });
  } catch (e) {}

  if (interaction.isModalSubmit()) return interaction.reply({ content: `✅ Rejected #${id} for: *${reason}*`, ephemeral: true });
  else return interaction.reply({ content: `✅ Quick Reject #${id} applied.`, ephemeral: true });
}

client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const { commandName } = interaction;
      if (!hasBatchAdmin(interaction.member) && ['post-batch-request', 'batch_check', 'batch_add', 'batch_remove', 'batch_clear', 'set-batch-review-channel', 'set-batch-pre-review-channel', 'post-admin-batch-add', 'batch_halt', 'batch_sent'].includes(commandName)) {
        return interaction.reply({ content: '❌ Access Denied.', ephemeral: true });
      }

      if (commandName === 'set-batch-pre-review-channel') {
        const ch = interaction.options.getChannel('channel');
        await setSetting('pre_review_channel', ch.id);
        return interaction.reply({ content: `✅ Pre-Review channel set to <#${ch.id}>`, ephemeral: true });
      }

      if (commandName === 'set-batch-review-channel') {
        const ch = interaction.options.getChannel('channel');
        await setSetting('review_channel', ch.id); 
        return interaction.reply({ content: `✅ Queue channel set to <#${ch.id}>`, ephemeral: true });
      }

      if (commandName === 'set-batch-release-channel') {
        const ch = interaction.options.getChannel('channel');
        await setSetting('release_channel', ch.id); 
        return interaction.reply({ content: `✅ Release channel set to <#${ch.id}>`, ephemeral: true });
      }

      if (commandName === 'post-batch-request') {
        const items = await all('SELECT name FROM batch_options LIMIT 25');
        const embed = new EmbedBuilder().setTitle('👕 Request Custom Item').setDescription('Select an item below to start your request.').setColor(0x5865f2);
        const rows = [];
        for (let i = 0; i < items.length; i += 5) {
          const row = new ActionRowBuilder();
          items.slice(i, i + 5).forEach(item => row.addComponents(new ButtonBuilder().setCustomId(`batch_start_${item.name}`).setLabel(item.name).setStyle(ButtonStyle.Primary)));
          rows.push(row);
        }
        return interaction.reply({ embeds: [embed], components: rows });
      }

      if (commandName === 'batch_check') {
        const rows = await all("SELECT * FROM batch_requests WHERE status = 'pending' ORDER BY id ASC");
        const embed = new EmbedBuilder().setTitle('📋 Queue').setDescription(rows.map(r => `**#${r.id}** | <@${r.discord_id}> | ${r.type}`).join('\n') || 'Empty').setColor(0x5865f2);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (commandName === 'batch_halt') {
        const active = interaction.options.getBoolean('active');
        const reason = interaction.options.getString('reason') || 'No reason provided.';
        await setSetting('halted', active ? 'true' : 'false');
        await setSetting('halt_reason', reason);
        return interaction.reply({ content: `✅ Requests are now **${active ? 'HALTED' : 'OPEN'}**.`, ephemeral: true });
      }
    }

    if (interaction.isButton()) {
      const { customId } = interaction;

      if (customId.startsWith('batch_start_')) return handleNewRequest(interaction, customId.replace('batch_start_', ''));

      if (customId.startsWith('batch_quick_deny_')) {
        const [,,, id, reason] = customId.split('_');
        return performRejection(interaction, id, reason);
      }

      if (customId.startsWith('batch_pr_')) {
        if (!hasBatchAdmin(interaction.member)) return interaction.reply({ content: '❌ Staff Only.', ephemeral: true });
        const [,, action, id] = customId.split('_');
        const req = await get('SELECT * FROM batch_requests WHERE id = ?', [id]);
        if (!req || req.status !== 'pre_review') return interaction.reply({ content: '⚠️ Stale or Handled.', ephemeral: true });

        if (action === 'approve') {
          await run("UPDATE batch_requests SET status = 'pending' WHERE id = ?", [id]);
          await interaction.message.delete().catch(() => {});
          try {
            const user = await client.users.fetch(req.discord_id);
            await user.send({ embeds: [new EmbedBuilder().setTitle('✅ Verified!').setDescription(`Your **${req.type}** is in queue (#${id}).`).setColor(0x00f5a0)] });
          } catch (e) {}

          await loadSettings();
          const qId = getSetting('review_channel');
          if (qId) {
            const ch = await client.channels.fetch(qId).catch(() => null);
            if (ch) {
               const embed = new EmbedBuilder().setTitle(`📥 Queue: ${req.type} (#${id})`).setDescription(`**Player:** <@${req.discord_id}>\n**VRFS ID:** ${req.vrfs_id}`).setColor(0x5865f2);
               const row = new ActionRowBuilder().addComponents(
                 new ButtonBuilder().setCustomId(`batch_done_${id}`).setLabel('Fulfil').setStyle(ButtonStyle.Success),
                 new ButtonBuilder().setCustomId(`batch_deny_${id}`).setLabel('Reject').setStyle(ButtonStyle.Danger)
               );
               const msg = await ch.send({ embeds: [embed], components: [row] });
               await run("UPDATE batch_requests SET msg_id = ?, ch_id = ? WHERE id = ?", [msg.id, ch.id, id]);
            }
          }
          return interaction.reply({ content: '✅ Approved.', ephemeral: true });
        } else {
           const modal = new ModalBuilder().setCustomId(`batch_reject_pr_${id}`).setTitle('Reject Request');
           modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('reason').setLabel('Reason').setStyle(TextInputStyle.Paragraph).setRequired(true)));
           return interaction.showModal(modal);
        }
      }

      if (customId.startsWith('batch_done_')) {
        if (!hasBatchAdmin(interaction.member)) return interaction.reply({ content: '❌ Staff Only.', ephemeral: true });
        const id = customId.split('_')[2];
        await run("UPDATE batch_requests SET status = 'completed', staff_id = ? WHERE id = ?", [interaction.user.id, id]);
        
        let batch = await get("SELECT * FROM batches WHERE status = 'open' LIMIT 1") || (await run("INSERT INTO batches (status) VALUES ('open')"), await get("SELECT * FROM batches WHERE status = 'open' LIMIT 1"));
        await run("UPDATE batch_requests SET batch_id = ? WHERE id = ?", [batch.id, id]);
        
        const count = (await get("SELECT COUNT(*) as cnt FROM batch_requests WHERE batch_id = ?", [batch.id])).cnt;
        if (count >= 8) {
          await run("UPDATE batches SET status = 'released', released_at = CURRENT_TIMESTAMP WHERE id = ?", [batch.id]);
          await loadSettings();
          const relCh = await client.channels.fetch(getSetting('release_channel')).catch(() => null);
          if (relCh) {
            const reqs = await all("SELECT username, vrfs_id, type FROM batch_requests WHERE batch_id = ?", [batch.id]);
            const list = reqs.map((r, i) => `**${i+1}.** ${r.username} — ID: \`${r.vrfs_id}\` (${r.type})`).join('\n');
            await relCh.send({ embeds: [new EmbedBuilder().setTitle(`🚀 Batch #${batch.id} FULL`).setDescription(list).setColor(0x00f5a0)] });
          }
        }
        return interaction.update({ embeds: [EmbedBuilder.from(interaction.message.embeds[0]).setTitle(`✅ COMPLETED | ${id}`).setColor(0x00f5a0)], components: [] });
      }

      if (customId.startsWith('batch_deny_')) {
        if (!hasBatchAdmin(interaction.member)) return interaction.reply({ content: '❌ Staff Only.', ephemeral: true });
        const id = customId.split('_')[2];
        const modal = new ModalBuilder().setCustomId(`batch_reject_q_${id}`).setTitle('Reject Request');
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('reason').setLabel('Reason').setStyle(TextInputStyle.Paragraph).setRequired(true)));
        return interaction.showModal(modal);
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('batch_reject_')) {
        return performRejection(interaction, interaction.customId.split('_')[3], interaction.fields.getTextInputValue('reason'));
      }
    }
  } catch (e) { console.error(e); }
});

async function handleNewRequest(interaction, type) {
  try {
    const user = interaction.user;
    await loadSettings();
    if (getSetting('halted') === 'true') return interaction.reply({ content: '⏸️ Requests Halted.', ephemeral: true });

    const dm = await user.createDM().catch(() => null);
    if (!dm) return interaction.reply({ content: '❌ Opem DMs.', ephemeral: true });
    await interaction.reply({ content: '✅ DM Sent!', ephemeral: true });

    await dm.send(`👕 **Custom Request: ${type}**\n\n**Step 1/2**: Enter **VRFS ID**:`);
    const vrfs = (await dm.awaitMessages({ max: 1, time: 30000 })).first().content.trim();
    await dm.send(`✅ **Step 2/2**: Enter **Proof Link**:`);
    const proof = (await dm.awaitMessages({ max: 1, time: 30000 })).first().content.trim();

    const guildId = interaction?.guildId || process.env.BATCH_GUILD_ID || "1286206719847960670";
    await run('INSERT INTO batch_requests (discord_id, username, vrfs_id, type, details, proof_url, status, guild_id) VALUES (?,?,?,?,?,?,?,?)', [user.id, user.username, vrfs, type, 'Manual', proof, 'pre_review', guildId]);
    const req = await get('SELECT id FROM batch_requests WHERE discord_id = ? ORDER BY id DESC LIMIT 1', [user.id]);
    
    const preCh = await client.channels.fetch(getSetting('pre_review_channel')).catch(() => null);
    if (preCh) {
      const embed = new EmbedBuilder().setTitle(`🔍 Review: ${type} (#${req.id})`).setDescription(`Player: <@${user.id}>\nID: ${vrfs}\nProof: ${proof}`).setColor(0xFFA500);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`batch_pr_approve_${req.id}`).setLabel('Verify').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`batch_pr_reject_${req.id}`).setLabel('Decline').setStyle(ButtonStyle.Danger)
      );
      
      // Add Preset Buttons if they exist
      const presets = (getSetting('reject_presets') || "").split(',').map(s => s.trim()).filter(Boolean);
      const presetRow = new ActionRowBuilder();
      presets.slice(0, 5).forEach(p => presetRow.addComponents(new ButtonBuilder().setCustomId(`batch_quick_deny_pr_${req.id}_${p.substring(0, 50)}`).setLabel(p.substring(0, 80)).setStyle(ButtonStyle.Secondary)));
      
      const comps = [row];
      if (presetRow.components.length) comps.push(presetRow);
      await preCh.send({ embeds: [embed], components: comps });
    }
    await dm.send('⏳ Sent!');
  } catch (e) { user.send('❌ Timed out.'); }
}

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder().setName('batch_request').setDescription('Submit a request').addStringOption(o => o.setName('type').setDescription('Item')),
    new SlashCommandBuilder().setName('set-batch-review-channel').setDescription('Queue channel').addChannelOption(o => o.setName('channel').setDescription('CH')),
    new SlashCommandBuilder().setName('set-batch-pre-review-channel').setDescription('Verify channel').addChannelOption(o => o.setName('channel').setDescription('CH')),
    new SlashCommandBuilder().setName('set-batch-release-channel').setDescription('Release channel').addChannelOption(o => o.setName('channel').setDescription('CH')),
    new SlashCommandBuilder().setName('batch_halt').setDescription('Pause requests').addBooleanOption(o => o.setName('active').setRequired(true)).addStringOption(o => o.setName('reason')),
    new SlashCommandBuilder().setName('post-batch-request').setDescription('Post request message'),
  ].map(c => c.toJSON());
  const rest = new REST({ version: '10' }).setToken(process.env.BATCH_DISCORD_TOKEN);
  try { await rest.put(Routes.applicationCommands(process.env.BATCH_CLIENT_ID), { body: commands }); } catch (e) {}
}

client.once('ready', () => { registerCommands(); console.log('Ready'); });
initDB().then(() => client.login(process.env.BATCH_DISCORD_TOKEN));
