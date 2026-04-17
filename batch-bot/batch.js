/**
 * VBLL Batch Bot — Customs & Batch Request Management
 * Phase 8: Pre-Review & DM Refinement
 */

require('dotenv').config(); // Load standard .env if present
require('dotenv').config({ path: '.env.batch' }); // Load local override
const { 
  Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
  ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle,
  REST, Routes, SlashCommandBuilder, Partials, PermissionFlagsBits
} = require('discord.js');
const { createClient } = require('@libsql/client');
const http = require('http');

// --- 🔌 Database Setup ---
const db = createClient({ 
  url: process.env.TURSO_URL || process.env.SCRIM_TURSO_URL || "", 
  authToken: process.env.TURSO_TOKEN || process.env.SCRIM_TURSO_TOKEN || "" 
});
if (!process.env.TURSO_URL && !process.env.SCRIM_TURSO_URL) {
  console.warn("⚠️ Database credentials missing. If you're on Render, set them in the Environment tab!");
}
async function run(sql, params = []) { return await db.execute({ sql, args: params }); }
async function get(sql, params = []) { const r = await db.execute({ sql, args: params }); return r.rows[0]; }
async function all(sql, params = []) { const r = await db.execute({ sql, args: params }); return r.rows; }

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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await run(`CREATE TABLE IF NOT EXISTS batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    status TEXT DEFAULT 'open',
    released_at TIMESTAMP
  )`);
  try { await run(`ALTER TABLE batch_requests ADD COLUMN batch_id INTEGER`); } catch(_) {}
  console.log('✅ Batch Database Ready.');
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

// --- 🌍 Bot API (for DM Notifications from Hub) ---
const PORT = process.env.PORT || 3000;
http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/notify-dm') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { userId, status, type, id } = JSON.parse(body);
        const user = await client.users.fetch(userId).catch(() => null);
        if (user) {
          const embed = new EmbedBuilder()
            .setTitle(`🆕 Order Update: #${id}`)
            .setDescription(`Your request for a **${type.toUpperCase()}** has been **${status.toUpperCase()}**.`)
            .setColor(status === 'completed' ? 0x00f5a0 : status === 'approved' ? 0x5865f2 : 0xff4d4d)
            .setTimestamp();
          await user.send({ embeds: [embed] }).catch(() => {});
        }
        res.writeHead(200); res.end('OK');
      } catch (e) { res.writeHead(400); res.end('Error'); }
    });
    return;
  }
  res.writeHead(200); res.end('Batch Bot Online\n');
}).listen(PORT, () => console.log(`🌍 Bot API listening on port ${PORT}`));

// --- 🤖 Bot Client ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.DirectMessages, GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember]
});

// Permissions Check
const ADMIN_ROLE_ID = '1145402830786678884'; // Example Owner/Admin Role
function hasBatchAdmin(member) {
  if (!member) return false;
  if (member.id === '1145402830786678884') return true;
  try {
    return member.permissions && typeof member.permissions.has === 'function' && member.permissions.has(PermissionFlagsBits.Administrator);
  } catch (e) {
    return false;
  }
}

client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const { commandName } = interaction;

    // Security Gate
    if (['post-batch-request', 'batch_check', 'batch_add', 'batch_remove', 'batch_clear', 'set-batch-review-channel', 'set-batch-pre-review-channel', 'post-admin-batch-add'].includes(commandName)) {
      if (!hasBatchAdmin(interaction.member)) return interaction.reply({ content: '❌ Access Denied.', ephemeral: true });
    }

    if (commandName === 'set-batch-pre-review-channel') {
      const ch = interaction.options.getChannel('channel');
      await setSetting('pre_review_channel', ch.id);
      return interaction.reply({ content: `✅ Pre-Review channel set to <#${ch.id}>`, ephemeral: true });
    }

    if (commandName === 'set-batch-review-channel') {
      const ch = interaction.options.getChannel('channel');
      await setSetting('review_channel', ch.id); 
      return interaction.reply({ content: `✅ Batch Queue channel set to <#${ch.id}>`, ephemeral: true });
    }

    if (commandName === 'set-batch-release-channel') {
      const ch = interaction.options.getChannel('channel');
      await setSetting('release_channel', ch.id); 
      return interaction.reply({ content: `✅ Batch Release channel set to <#${ch.id}>`, ephemeral: true });
    }

    if (commandName === 'post-batch-request') {
      const items = await all('SELECT name FROM scrim_shop WHERE active = 1 AND stock != 0 LIMIT 25');
      if (!items.length) return interaction.reply({ content: '❌ Shop is empty.', ephemeral: true });
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
      if (!rows.length) return interaction.reply({ content: '📭 Queue empty.', ephemeral: true });
      const embed = new EmbedBuilder().setTitle('📋 Batch Queue').setDescription(rows.map(r => `**#${r.id}** | <@${r.discord_id}> | ${r.type}`).join('\n')).setColor(0x5865f2);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (commandName === 'batch_request') {
      const type = interaction.options.getString('type');
      return handleNewRequest(interaction, type);
    }

    if (commandName === 'batch_add') {
      const player = interaction.options.getUser('player');
      const vrfsId = interaction.options.getString('vrfs_id');
      const type = interaction.options.getString('type');
      await run('INSERT INTO batch_requests (discord_id, username, vrfs_id, type, details, status) VALUES (?,?,?,?,?,?)', [player.id, player.username, vrfsId, type, 'Manual Add', 'pending']);
      return interaction.reply({ content: `✅ Manually added **${type}** for <@${player.id}>.`, ephemeral: true });
    }

    if (commandName === 'batch_remove') {
      const id = interaction.options.getInteger('id');
      await run('DELETE FROM batch_requests WHERE id = ?', [id]);
      return interaction.reply({ content: `✅ Removed request #${id}.`, ephemeral: true });
    }

    if (commandName === 'batch_clear') {
      await run("DELETE FROM batch_requests WHERE status = 'pending'");
      return interaction.reply({ content: '✅ Cleared all pending requests.', ephemeral: true });
    }

    if (commandName === 'post-admin-batch-add') {
      const items = await all('SELECT name FROM scrim_shop WHERE active = 1 AND stock != 0 LIMIT 25');
      if (!items.length) return interaction.reply({ content: '❌ Shop is empty.', ephemeral: true });
      const embed = new EmbedBuilder().setTitle('🛡️ Admin: Manual Add').setDescription('Staff only: Click a button to manually add an item for a player.').setColor(0xffa500);
      const rows = [];
      for (let i = 0; i < items.length; i += 5) {
        const row = new ActionRowBuilder();
        items.slice(i, i + 5).forEach(item => row.addComponents(new ButtonBuilder().setCustomId(`batch_admin_add_${item.name}`).setLabel(item.name).setStyle(ButtonStyle.Secondary)));
        rows.push(row);
      }
      return interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'view-batches') {
      const rows = await all("SELECT * FROM batches ORDER BY id DESC LIMIT 10");
      if (!rows.length) return interaction.reply({ content: '📭 No batches created yet.', ephemeral: true });
      
      const embed = new EmbedBuilder().setTitle('📦 Recent Batches').setColor(0x5865f2);
      for (const b of rows) {
        const reqs = await all("SELECT username, vrfs_id FROM batch_requests WHERE batch_id = ?", [b.id]);
        const list = reqs.map(r => `• **${r.username}** (${r.vrfs_id})`).join('\n') || '*Empty*';
        embed.addFields({ name: `Batch #${b.id} [${b.status.toUpperCase()}]`, value: list });
      }
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    }

  if (interaction.isButton()) {
    const { customId } = interaction;

    // Start DM Flow
    if (customId.startsWith('batch_start_')) {
      const type = customId.replace('batch_start_', '');
      return handleNewRequest(interaction, type);
    }

    // Pre-Review Buttons
    if (customId.startsWith('batch_pr_')) {
      if (!hasBatchAdmin(interaction.member)) return interaction.reply({ content: '❌ Staff Only.', ephemeral: true });
      const [,, action, id] = customId.split('_');
      const req = await get('SELECT * FROM batch_requests WHERE id = ?', [id]);
      if (!req) return interaction.reply({ content: '❌ Request stale.', ephemeral: true });

      if (action === 'approve') {
        await run("UPDATE batch_requests SET status = 'pending' WHERE id = ?", [id]);
        await interaction.message.delete().catch(() => {});
        // DM User
        try {
          const user = await client.users.fetch(req.discord_id);
          await user.send({ embeds: [new EmbedBuilder().setTitle('✅ Verified!').setDescription(`Your **${req.type}** is now in the queue (#${id}).`).setColor(0x00f5a0)] });
        } catch (e) {}
        // Send to Queue
        await loadSettings();
        const qId = getSetting('review_channel');
        if (qId) {
          const ch = await client.channels.fetch(qId).catch(() => null);
          if (ch) {
            const embed = new EmbedBuilder().setTitle(`📥 Queue: ${req.type} (#${id})`)
              .setDescription(`**Player:** <@${req.discord_id}>\n**VRFS ID:** ${req.vrfs_id}\n**Proof:** [Message Link](${req.proof_url})`)
              .setColor(0x5865f2).setTimestamp();
            const buttons = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId(`batch_done_${id}`).setLabel('Fulfil').setStyle(ButtonStyle.Success),
              new ButtonBuilder().setCustomId(`batch_deny_${id}`).setLabel('Reject').setStyle(ButtonStyle.Danger)
            );
            await ch.send({ embeds: [embed], components: [buttons] });
          }
        }
        return interaction.reply({ content: '✅ Approved and added to queue.', ephemeral: true });
      } else {
        await run("UPDATE batch_requests SET status = 'rejected' WHERE id = ?", [id]);
        await interaction.message.delete().catch(() => {});
        try {
          const user = await client.users.fetch(req.discord_id);
          await user.send({ embeds: [new EmbedBuilder().setTitle('❌ Rejected').setDescription(`Your request (#${id}) was rejected.`).setColor(0xff4d4d)] });
        } catch (e) {}
        return interaction.reply({ content: '❌ Rejected.', ephemeral: true });
      }
    }

    // Queue Buttons
    if (customId.startsWith('batch_done_') || customId.startsWith('batch_deny_')) {
      if (!hasBatchAdmin(interaction.member)) return interaction.reply({ content: '❌ Staff Only.', ephemeral: true });
      const [, action, id] = customId.split('_');
      const status = action === 'done' ? 'completed' : 'rejected';
      await run('UPDATE batch_requests SET status = ?, staff_id = ? WHERE id = ?', [status, interaction.user.id, id]);
      
      if (action === 'done') {
        // --- 📦 Batch Logic ---
        let batch = await get("SELECT * FROM batches WHERE status = 'open' LIMIT 1");
        if (!batch) {
          await run("INSERT INTO batches (status) VALUES ('open')");
          batch = await get("SELECT * FROM batches WHERE status = 'open' LIMIT 1");
        }
        
        await run("UPDATE batch_requests SET batch_id = ? WHERE id = ?", [batch.id, id]);
        
        // Check if full
        const countRes = await run("SELECT COUNT(*) as cnt FROM batch_requests WHERE batch_id = ?", [batch.id]);
        const count = countRes.rows[0][0];

        if (count >= 8) {
          await run("UPDATE batches SET status = 'released', released_at = CURRENT_TIMESTAMP WHERE id = ?", [batch.id]);
          
          await loadSettings();
          const relId = getSetting('release_channel');
          if (relId) {
            const relCh = await client.channels.fetch(relId).catch(() => null);
            if (relCh) {
              const reqs = await all("SELECT username, vrfs_id, type FROM batch_requests WHERE batch_id = ?", [batch.id]);
              const list = reqs.map((r, i) => `**${i+1}.** ${r.username} — ID: \`${r.vrfs_id}\` (${r.type})`).join('\n');
              const embed = new EmbedBuilder()
                .setTitle(`🚀 Batch #${batch.id} FULL & RELEASED`)
                .setDescription(`The following 8 requests are ready for processing:\n\n${list}`)
                .setColor(0x00f5a0)
                .setTimestamp();
              await relCh.send({ embeds: [embed] });
            }
          }
        }
      }

      const req = await get('SELECT * FROM batch_requests WHERE id = ?', [id]);
      if (req) {
        try {
          const user = await client.users.fetch(req.discord_id);
          await user.send({ embeds: [new EmbedBuilder().setTitle(`🆕 Update: #${id}`).setDescription(`Your **${req.type}** is **${status}**.`).setColor(status === 'completed' ? 0x00f5a0 : 0xff4d4d)] });
        } catch (e) {}
      }
      const embed = EmbedBuilder.from(interaction.message.embeds[0]).setTitle(`${status.toUpperCase()} | ${interaction.message.embeds[0].title}`).setColor(status === 'completed' ? 0x00f5a0 : 0xff4d4d);
      return interaction.update({ embeds: [embed], components: [] });
    }
  }
} catch (err) {
    console.error('[Interaction Error]', err.message);
    try {
      if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: '❌ An internal error occurred.', ephemeral: true });
    } catch (_) {}
  }
});

async function handleNewRequest(interaction, type) {
  try {
    const user = interaction.user;
    const dm = await user.createDM().catch(() => null);
    if (!dm) return interaction.reply({ content: '❌ Enable DMs first.', ephemeral: true });
    await interaction.reply({ content: `✅ DM Sent! Check your private messages to finish your **${type}** request.`, ephemeral: true });

    const filter = m => m.author.id === user.id;
    const options = { filter, max: 1, time: 300000, errors: ['time'] };

    // 1. VRFS ID
    await dm.send(`👕 **Custom Request: ${type.toUpperCase()}**\n\n**Step 1/2**: Please enter your **VRFS ID**:`);
    const vrfsCollected = await dm.awaitMessages(options);
    const vrfsId = vrfsCollected.first().content.trim();

    // 2. Proof
    await dm.send(`✅ **VRFS ID Saved: ${vrfsId}**\n\n**Step 2/2**: Please provide a **Discord Message Link** as proof you won/earned these customs:`);
    const proofCollected = await dm.awaitMessages({ ...options, filter: m => m.author.id === user.id && m.content.includes('discord.com/channels/') });
    const proofMsg = proofCollected.first();
    const proofUrl = proofMsg.content.trim();

    await dm.send('⏳ **Sent for Verification.** Staff will review your proof shortly.');
    await createRequest(user.id, user.username, vrfsId, type, 'Pending Pre-Review', proofUrl);

  } catch (e) {
    if (e.message?.includes('time')) {
      interaction.user.send('❌ **Timed Out.** Please start again from the server.').catch(() => {});
    }
  }
}

async function createRequest(userId, username, vrfsId, type, details, proofUrl) {
  await run('INSERT INTO batch_requests (discord_id, username, vrfs_id, type, details, proof_url, status) VALUES (?,?,?,?,?,?,?)', [userId, username, vrfsId, type, details, proofUrl, 'pre_review']);
  const req = await get('SELECT id FROM batch_requests WHERE discord_id = ? ORDER BY id DESC LIMIT 1', [userId]);
  const id = req.id;

  await loadSettings();
  const preId = getSetting('pre_review_channel');
  if (preId) {
    const ch = await client.channels.fetch(preId).catch(() => null);
    if (ch) {
      const embed = new EmbedBuilder()
        .setTitle(`🔍 Pre-Review: ${type.toUpperCase()} (#${id})`)
        .setDescription(`**Player:** <@${userId}> \n**VRFS ID:** ${vrfsId} \n\n**Proof Link:** ${proofUrl || 'No link provided'}`)
        .setColor(0xFFA500);
      const btns = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`batch_pr_approve_${id}`).setLabel('Send to Batches').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`batch_pr_reject_${id}`).setLabel('Decline').setStyle(ButtonStyle.Danger)
      );
      await ch.send({ embeds: [embed], components: [btns] });
    }
  }
}

async function registerCommands() {
  let shopItems = [];
  try {
    const rows = await all('SELECT name FROM scrim_shop WHERE active = 1 AND stock != 0');
    shopItems = rows.map(r => ({ name: r.name, value: r.name }));
  } catch (e) {}

  const choices = shopItems.length > 0 ? shopItems.slice(0, 25) : [{ name: 'Other', value: 'other' }];
  const commands = [
    new SlashCommandBuilder().setName('batch_request').setDescription('Submit a request for a custom item').addStringOption(o => o.setName('type').setDescription('Type').setRequired(true).addChoices(...choices)),
    new SlashCommandBuilder().setName('post-batch-request').setDescription('Post request message [Staff]'),
    new SlashCommandBuilder().setName('set-batch-review-channel').setDescription('Set queue channel [Staff]').addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(true)),
    new SlashCommandBuilder().setName('set-batch-pre-review-channel').setDescription('Set verification channel [Staff]').addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(true)),
    new SlashCommandBuilder().setName('set-batch-release-channel').setDescription('Set channel where full batches are posted [Staff]').addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(true)),
    new SlashCommandBuilder().setName('batch_check').setDescription('View queue [Staff]'),
    new SlashCommandBuilder().setName('view-batches').setDescription('View recent batches and their contents [Staff]'),
    new SlashCommandBuilder().setName('batch_add').setDescription('Manual add [Staff]')
      .addUserOption(o => o.setName('player').setDescription('Player').setRequired(true))
      .addStringOption(o => o.setName('vrfs_id').setDescription('VRFS ID').setRequired(true))
      .addStringOption(o => o.setName('type').setDescription('Type').setRequired(true).addChoices(...choices)),
    new SlashCommandBuilder().setName('batch_remove').setDescription('Remove by ID [Staff]').addIntegerOption(o => o.setName('id').setDescription('ID').setRequired(true)),
    new SlashCommandBuilder().setName('batch_clear').setDescription('Clear pending queue [Staff]'),
    new SlashCommandBuilder().setName('post-admin-batch-add').setDescription('Post interactive manual add buttons [Staff]'),
  ].map(c => c.toJSON());

  const rest = new REST({ version: '10' }).setToken(process.env.BATCH_DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(process.env.BATCH_CLIENT_ID), { body: commands });
    console.log('✅ Commands Registered.');
  } catch (e) { console.error(e); }
}

client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  registerCommands();
  
  // Heartbeat to keep Turso connection alive
  setInterval(async () => {
    try { await run('INSERT OR REPLACE INTO batch_settings (key,value) VALUES(?,?)', ['last_heartbeat', new Date().toISOString()]); } catch (_) {}
  }, 60000);
});

process.on('unhandledRejection', err => {
  if (err?.code === 10062 || err?.message?.includes('Unknown interaction')) return;
  console.error('Unhandled rejection:', err?.message);
});

process.on('uncaughtException', err => {
  console.error('Uncaught exception:', err?.message);
});

initDB().then(() => client.login(process.env.BATCH_DISCORD_TOKEN));
