/**
 * VBLL Batch Bot — Customs & Batch Request Management
 * Phase 8: Pre-Review & DM Refinement
 */

require('dotenv').config(); // Load standard .env if present
require('dotenv').config({ path: '.env.batch' }); // Load local override
const { 
  Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
  ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle,
  REST, Routes, SlashCommandBuilder, Partials, PermissionFlagsBits, AttachmentBuilder,
  ChannelType
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
    console.error("❌ CRITICAL ERROR: TURSO_URL is missing! Please set it in Railway Variables.");
    return { execute: async () => ({ rows: [] }) }; // Return dummy to prevent immediate crash
  }

  db = createClient({ url, authToken: token || "" });
  return db;
}

async function run(sql, params = []) { return await getDB().execute({ sql, args: params }); }
async function get(sql, params = []) { const r = await getDB().execute({ sql, args: params }); return r.rows[0]; }
async function all(sql, params = []) { const r = await getDB().execute({ sql, args: params }); return r.rows; }

async function initDB() {
  await run(`CREATE TABLE IF NOT EXISTS batch_settings (key TEXT PRIMARY KEY, value TEXT)`);
  await run(`CREATE TABLE IF NOT EXISTS guild_settings (
    guild_id TEXT,
    key TEXT,
    value TEXT,
    PRIMARY KEY (guild_id, key)
  )`);
  await run(`CREATE TABLE IF NOT EXISTS batch_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT,
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
    guild_id TEXT,
    status TEXT DEFAULT 'open',
    released_at TIMESTAMP
  )`);
  await run(`CREATE TABLE IF NOT EXISTS batch_options (
    guild_id TEXT,
    name TEXT,
    PRIMARY KEY (guild_id, name)
  )`);
  await run(`CREATE TABLE IF NOT EXISTS batch_tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT,
    discord_id TEXT,
    username TEXT,
    issue TEXT,
    status TEXT DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await run(`CREATE TABLE IF NOT EXISTS staff_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT,
    staff_id TEXT,
    staff_name TEXT,
    action TEXT,
    target_id TEXT,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await run(`CREATE TABLE IF NOT EXISTS giveaways (
    id TEXT PRIMARY KEY,
    guild_id TEXT,
    channel_id TEXT,
    msg_id TEXT,
    prize TEXT,
    winners_count INTEGER,
    end_time TEXT,
    status TEXT DEFAULT 'active'
  )`);
  await run(`CREATE TABLE IF NOT EXISTS giveaway_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    giveaway_id TEXT,
    user_id TEXT,
    UNIQUE(giveaway_id, user_id)
  )`);


  // --- 🪄 Migration Logic: Add guild_id to old data ---
  const tables = ['batch_requests', 'batches', 'batch_options', 'batch_tickets', 'staff_logs'];
  const defaultGuild = process.env.BATCH_GUILD_ID || "1286206719847960670";

  for (const table of tables) {
    try { await run(`ALTER TABLE ${table} ADD COLUMN guild_id TEXT`); } catch(_) {}
    // Tag any data that doesn't have a guild_id yet
    await run(`UPDATE ${table} SET guild_id = ? WHERE guild_id IS NULL`, [defaultGuild]);
  }
  
  try { await run(`ALTER TABLE batch_requests ADD COLUMN batch_id INTEGER`); } catch(_) {}
  
  // Add a seed log if empty
  const logCheck = await get("SELECT COUNT(*) as cnt FROM staff_logs");
  if (logCheck.cnt === 0) {
    await run("INSERT INTO staff_logs (guild_id, staff_id, staff_name, action, target_id, details) VALUES (?,?,?,?,?,?)", [defaultGuild, 'SYSTEM', 'SYSTEM', 'INITIALIZED', '0', 'Audit logging system successfully activated.']);
  }

  // Migrate old settings to guild-specific settings if they exist
  const oldSettings = await all("SELECT key, value FROM batch_settings");
  for (const s of oldSettings) {
    if (['last_heartbeat'].includes(s.key)) continue; // Keep global
    await run("INSERT OR IGNORE INTO guild_settings (guild_id, key, value) VALUES (?,?,?)", [defaultGuild, s.key, s.value]);
  }

  console.log('✅ Multi-Guild Database Initialized.');
}

let settingsCache = {}; // guild_id -> { key: value }

async function loadSettings(guildId) {
  if (!guildId) return;
  const rows = await all('SELECT key, value FROM guild_settings WHERE guild_id = ?', [guildId]);
  settingsCache[guildId] = Object.fromEntries(rows.map(r => [r.key, r.value]));
}

function getSetting(guildId, key) { 
  return settingsCache[guildId]?.[key]; 
}

async function setSetting(guildId, key, value) {
  if (!guildId) return;
  await run('INSERT OR REPLACE INTO guild_settings (guild_id, key, value) VALUES (?,?,?)', [guildId, key, value]);
  if (!settingsCache[guildId]) settingsCache[guildId] = {};
  settingsCache[guildId][key] = value;
}

async function getBranding(guildId) {
  if (!settingsCache[guildId]) await loadSettings(guildId);
  return {
    name: getSetting(guildId, 'league_display_name'),
    icon: getSetting(guildId, 'league_display_icon')
  };
}

async function createBrandedEmbed(guildId) {
  const brand = await getBranding(guildId);
  const embed = new EmbedBuilder();
  if (brand.name) {
    embed.setAuthor({ name: brand.name, iconURL: brand.icon || null });
  }
  return embed;
}


let preReviewQueue = [];
let isProcessingQueue = false;

async function processPreReviewQueue() {
  if (isProcessingQueue || preReviewQueue.length === 0) return;
  isProcessingQueue = true;

  while (preReviewQueue.length > 0) {
    const item = preReviewQueue[0];
    await sendToPreReview(item);
    preReviewQueue.shift();

    const delay = parseInt(getSetting(item.guild_id, 'slowdown_seconds') || '0');
    if (delay > 0 && preReviewQueue.length > 0) {
      await new Promise(r => setTimeout(r, delay * 1000));
    }
  }
  isProcessingQueue = false;
}

async function sendToPreReview(req) {
  try {
    const gid = req.guild_id;
    await loadSettings(gid);
    const preId = getSetting(gid, 'pre_review_channel');
    if (!preId) return;
    const ch = await client.channels.fetch(preId).catch(() => null);
    if (!ch) return;

    const embed = (await createBrandedEmbed(gid))
      .setTitle(`🔍 Pre-Review: ${req.type.toUpperCase()} (#${req.id})`)
      .setDescription(`**Player:** <@${req.discord_id}> \n**Username:** ${req.username}\n**VRFS ID:** ${req.vrfs_id} \n\n**Proof Link:** ${req.proof_url || 'No link provided'}`)
      .setColor(0xFFA500);

    const btns = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`batch_pr_approve_${req.id}`).setLabel('Send to Batches').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`batch_pr_reject_${req.id}`).setLabel('Decline').setStyle(ButtonStyle.Danger)
    );
    const msg = await ch.send({ embeds: [embed], components: [btns] });
    await run("UPDATE batch_requests SET msg_id = ?, ch_id = ? WHERE id = ?", [msg.id, ch.id, req.id]);
  } catch (e) {
    console.error('[sendToPreReview Error]', e.message);
  }
}

async function logStaffAction(guildId, staffId, staffName, action, targetId, details) {
  try {
    await run("INSERT INTO staff_logs (guild_id, staff_id, staff_name, action, target_id, details) VALUES (?,?,?,?,?,?)", [guildId, staffId, staffName, action, targetId, details]);
  } catch (e) {
    console.error('[Log Error]', e.message);
  }
}

async function checkMilestoneRoles(userId) {
  // Configizable Role IDs (PLACEHOLDERS - User should update these)
  const MILESTONES = {
    5: '123456789012345678', // Collector
    10: '123456789012345678', // Elite Collector
    25: '123456789012345678'  // Master Collector
  };

  const countData = await get("SELECT COUNT(*) as cnt FROM batch_requests WHERE discord_id = ? AND status = 'completed'", [userId]);
  const count = countData.cnt;

  try {
    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    if (!guild) return;
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return;

    for (const [m, roleId] of Object.entries(MILESTONES)) {
      if (count >= parseInt(m)) {
        if (!member.roles.cache.has(roleId)) {
          await member.roles.add(roleId);
          console.log(`[Milestone] Awarded role ${roleId} to ${userId} for ${count} customs.`);
        }
      }
    }
  } catch (e) {
    console.error('[Milestone Error]', e.message);
  }
}

// Redundant settings block removed

// --- 🌍 Bot API (for Web Portal & Hub) ---
const PORT = process.env.PORT || 3000;
const API_TOKEN = process.env.WEB_API_TOKEN || "vbll_batch_v2_secret_key";

async function syncRequestMessage(requestId) {
  const req = await get("SELECT * FROM batch_requests WHERE id = ?", [requestId]);
  if (!req || !req.msg_id || !req.ch_id || !req.guild_id) return;
  try {
    const ch = await client.channels.fetch(req.ch_id).catch(() => null);
    if (!ch) return;
    const msg = await ch.messages.fetch(req.msg_id).catch(() => null);
    if (!msg) return;

    const embed = (await createBrandedEmbed(req.guild_id)).setTitle(`📥 Queue: ${req.type} (#${req.id})`)
      .setDescription(`**Player:** <@${req.discord_id}> \n**Username:** ${req.username}\n**VRFS ID:** ${req.vrfs_id}\n**Proof:** [Message Link](${req.proof_url})`)
      .setColor(0x5865f2).setTimestamp();

    
    if (req.batch_id) {
       embed.addFields({ name: 'Current Batch', value: `#${req.batch_id}`, inline: true });
    }
    await msg.edit({ embeds: [embed] });
  } catch(e) {}
}

async function waterfallBatches(guildId) {
  if (!guildId) return;
  const openBatches = await all("SELECT * FROM batches WHERE status = 'open' AND guild_id = ? ORDER BY id ASC", [guildId]);
  for (const b of openBatches) {
    const countData = await get("SELECT COUNT(*) as cnt FROM batch_requests WHERE batch_id = ?", [b.id]);
    let count = countData.cnt;
    while (count < 8) {
       // Try pulling from future batches first
       let next = await get(`SELECT id, discord_id, type FROM batch_requests WHERE guild_id = ? AND batch_id IN (SELECT id FROM batches WHERE status = 'open' AND guild_id = ? AND id > ?) ORDER BY batch_id ASC, created_at ASC LIMIT 1`, [guildId, guildId, b.id]);
       
       // If no future batches, pull from pending queue
       if (!next) {
          next = await get("SELECT id, discord_id, type FROM batch_requests WHERE guild_id = ? AND status = 'pending' ORDER BY created_at ASC LIMIT 1", [guildId]);
          if (next) {
             await run("UPDATE batch_requests SET status = 'completed', verified_at = CURRENT_TIMESTAMP WHERE id = ?", [next.id]);
          }
       }

       if (!next) break;
       await run("UPDATE batch_requests SET batch_id = ? WHERE id = ?", [b.id, next.id]);
       count++;
       try {
         const u = await client.users.fetch(next.discord_id);
         await u.send({ embeds: [new EmbedBuilder().setTitle('📦 Priority Bump').setDescription(`Your **${next.type}** was moved to **Batch #${b.id}** to fill a gap!`).setColor(0x5865f2)] });
       } catch(e){}
       await syncRequestMessage(next.id);
    }
  }
}

http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const auth = req.headers['authorization'];
  if (auth !== `Bearer ${API_TOKEN}`) { res.writeHead(401); res.end('Unauthorized'); return; }

  if (req.method === 'POST' && req.url === '/notify-dm') {
    let body = ''; req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { userId, status, type, id } = JSON.parse(body);
        const user = await client.users.fetch(userId).catch(() => null);
        if (user) {
          const embed = new EmbedBuilder().setTitle(`🆕 Order Update: #${id}`)
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

  if (req.method === 'POST' && req.url === '/reorder') {
     try {
        await waterfallBatches();
        res.writeHead(200); res.end(JSON.stringify({ success: true }));
     } catch(e) {
        console.error("Waterfall Error:", e);
        res.writeHead(500); res.end(JSON.stringify({ error: e.message }));
     }
     return;
  }

  if (req.method === 'POST' && req.url === '/sync-message') {
    let body = ''; req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { requestId } = JSON.parse(body);
        await syncRequestMessage(requestId);
        res.writeHead(200); res.end('OK');
      } catch(e) { res.writeHead(400); res.end('Error'); }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/start-flow') {
    let body = ''; req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { userId, type } = JSON.parse(body);
        const user = await client.users.fetch(userId).catch(() => null);
        if (user) { handleNewRequest(null, type, user); res.writeHead(200); res.end(JSON.stringify({ success: true })); }
        else { res.writeHead(404); res.end('User not found'); }
      } catch (e) { res.writeHead(400); res.end('Error'); }
    });
    return;
  }

  res.writeHead(200); res.end('Batch Bot API Online\n');
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
function hasBatchAdmin(member) {
  if (!member) return false;
  // Super-Owner bypass
  if (member.id === '1145402830786678884' || member.id === '1139955783384187031') return true;
  
  try {
    // Check for hard Discord Admin permission
    if (member.permissions && typeof member.permissions.has === 'function' && member.permissions.has(PermissionFlagsBits.Administrator)) return true;
    
    // Check for custom Configured role
    const configuredRole = getSetting(member.guild.id, 'batch_admin_role');
    if (configuredRole && member.roles.cache.has(configuredRole)) return true;
    
    return false;
  } catch (e) {
    return false;
  }
}


client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const { commandName } = interaction;

    // Security Gate
    if (['post-batch-request', 'batch_check', 'batch_add', 'batch_remove', 'batch_clear', 'set-batch-review-channel', 'set-batch-pre-review-channel', 'post-admin-batch-add', 'batch_slowdown', 'batch_halt', 'batch_sent', 'release_batch'].includes(commandName)) {
      if (!hasBatchAdmin(interaction.member)) return interaction.reply({ content: '❌ Access Denied.', ephemeral: true });
    }

    if (commandName === 'setup') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: '❌ Access Denied: Administrator Only.', ephemeral: true });
      await interaction.deferReply({ ephemeral: true });
      
      const gid = interaction.guildId;
      await loadSettings(gid);

      const checklist = [
        { key: 'pre_review_channel', label: 'Pre-Review Channel', cmd: '/set-batch-pre-review-channel', emoji: '🔍' },
        { key: 'review_channel', label: 'Primary Queue Channel', cmd: '/set-batch-review-channel', emoji: '📋' },
        { key: 'release_channel', label: 'Release Channel', cmd: '/set-batch-release-channel', emoji: '🚀' },
        { key: 'batch_admin_role', label: 'Admin Role (Staff)', cmd: '/set-admin-role', emoji: '👑' },
        { key: 'ticket_category', label: 'Ticket Category', cmd: '/set-ticket-category', emoji: '🎫' },
        { key: 'ticket_role', label: 'Ticket Staff Role', cmd: '/set-ticket-role', emoji: '🛡️' }

      ];

      const fields = checklist.map(item => {
        const val = getSetting(gid, item.key);
        const status = val ? '✅ **READY**' : '❌ **MISSING**';
        const display = val ? (item.key.includes('role') ? `<@&${val}>` : (item.key.includes('category') ? `ID: \`${val}\`` : `<#${val}>`)) : `Action required: Use ${item.cmd}`;
        return { name: `${item.emoji} ${item.label}`, value: `${status}\n${display}`, inline: false };
      });

      const allSet = checklist.every(i => getSetting(gid, i.key));

      const embed = new EmbedBuilder()
        .setTitle('⚙️ Batch-Bot System Status & Guide')
        .setDescription(allSet 
            ? '🎉 **Your league is fully configured and operational!** All channels and roles are correctly mapped.' 
            : '⚠️ **Configuration incomplete.** Some systems (requests, tickets, or releases) might not function. Please use the commands listed below to fix the missing items.')
        .addFields(fields)
        .setColor(allSet ? 0x00f5a0 : 0xFFA500)
        .setThumbnail(interaction.guild.iconURL())
        .setFooter({ text: 'Batch Management System Wizard' })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    if (commandName === 'set-batch-pre-review-channel') {
      const ch = interaction.options.getChannel('channel');
      await setSetting(interaction.guildId, 'pre_review_channel', ch.id);
      return interaction.reply({ content: `✅ Pre-Review channel set to <#${ch.id}>`, ephemeral: true });
    }

    if (commandName === 'set-batch-review-channel') {
      const ch = interaction.options.getChannel('channel');
      await setSetting(interaction.guildId, 'review_channel', ch.id); 
      return interaction.reply({ content: `✅ Batch Queue channel set to <#${ch.id}>`, ephemeral: true });
    }

    if (commandName === 'set-batch-release-channel') {
      const ch = interaction.options.getChannel('channel');
      await setSetting(interaction.guildId, 'release_channel', ch.id); 
      return interaction.reply({ content: `✅ Batch Release channel set to <#${ch.id}>`, ephemeral: true });
    }

    if (commandName === 'set-ticket-channel') {
      const ch = interaction.options.getChannel('channel');
      await setSetting(interaction.guildId, 'ticket_channel', ch.id);
      return interaction.reply({ content: `✅ Ticket alerts channel set to <#${ch.id}>`, ephemeral: true });
    }

    if (commandName === 'set-web-support-channel') {
      const ch = interaction.options.getChannel('channel');
      await setSetting(interaction.guildId, 'web_support_channel', ch.id);
      return interaction.reply({ content: `✅ Website chat alerts channel set to <#${ch.id}>`, ephemeral: true });
    }

    if (commandName === 'set-ticket-role') {
      const role = interaction.options.getRole('role');
      await setSetting(interaction.guildId, 'ticket_role', role.id);
      return interaction.reply({ content: `✅ Ticket staff role set to <@&${role.id}>`, ephemeral: true });
    }

    if (commandName === 'set-admin-role') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: '❌ Administrator Only.', ephemeral: true });
      const role = interaction.options.getRole('role');
      await setSetting(interaction.guildId, 'batch_admin_role', role.id);
      return interaction.reply({ content: `✅ Batch Admin role set to <@&${role.id}>`, ephemeral: true });
    }

    if (commandName === 'set-ticket-category') {

      const cat = interaction.options.getChannel('category');
      if (cat.type !== 4) return interaction.reply({ content: '❌ Please select a Category channel.', ephemeral: true });
      await setSetting(interaction.guildId, 'ticket_category', cat.id);
      return interaction.reply({ content: `✅ Ticket category set to **${cat.name}**`, ephemeral: true });
    }

    if (commandName === 'close-ticket') {
      if (!interaction.channel.name.startsWith('ticket-')) return interaction.reply({ content: '❌ This can only be used in ticket channels.', ephemeral: true });
      const id = interaction.channel.name.split('-')[1];
      await run("UPDATE batch_tickets SET status = 'closed' WHERE id = ? AND guild_id = ?", [id, interaction.guildId]);
      await interaction.reply({ content: '🔒 Ticket marked as closed. Deleting channel in 5 seconds...' });
      setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
      return;
    }

    if (commandName === 'batch_option') {
      const sub = interaction.options.getSubcommand();
      const name = interaction.options.getString('name');
      const gid = interaction.guildId;

      if (sub === 'add') {
        await run("INSERT OR IGNORE INTO batch_options (guild_id, name) VALUES (?,?)", [gid, name]);
        await registerCommands(); 
        return interaction.reply({ content: `✅ Added **${name}** to batch options for this server.`, ephemeral: true });
      } else if (sub === 'remove') {
        await run("DELETE FROM batch_options WHERE name = ? AND guild_id = ?", [name, gid]);
        await registerCommands();
        return interaction.reply({ content: `✅ Removed **${name}** from batch options.`, ephemeral: true });
      } else if (sub === 'list') {
        const rows = await all("SELECT name FROM batch_options WHERE guild_id = ?", [gid]);
        const list = rows.map(r => `• ${r.name}`).join('\n') || 'None.';
        return interaction.reply({ content: `📋 **Current Batch Options:**\n${list}`, ephemeral: true });
      }
    }

    if (commandName === 'post-batch-request') {
      const items = await all('SELECT name FROM batch_options WHERE guild_id = ? LIMIT 25', [interaction.guildId]);
      if (!items.length) return interaction.reply({ content: '❌ No options configured. Use `/batch_option add` first.', ephemeral: true });
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
      const rows = await all("SELECT * FROM batch_requests WHERE guild_id = ? AND status = 'pending' ORDER BY id ASC", [interaction.guildId]);
      if (!rows.length) return interaction.reply({ content: '📭 Queue empty.', ephemeral: true });
      const embed = new EmbedBuilder().setTitle('📋 Batch Queue').setDescription(rows.map(r => `**#${r.id}** | <@${r.discord_id}> (${r.username}) | ${r.type}`).join('\n')).setColor(0x5865f2);
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
      await run('INSERT INTO batch_requests (guild_id, discord_id, username, vrfs_id, type, details, status) VALUES (?,?,?,?,?,?,?)', [interaction.guildId, player.id, player.username, vrfsId, type, 'Manual Add', 'pending']);
      return interaction.reply({ content: `✅ Manually added **${type}** for <@${player.id}>.`, ephemeral: true });
    }

    if (commandName === 'batch_remove') {
      const id = interaction.options.getInteger('id');
      await run('DELETE FROM batch_requests WHERE id = ? AND guild_id = ?', [id, interaction.guildId]);
      return interaction.reply({ content: `✅ Removed request #${id}.`, ephemeral: true });
    }

    if (commandName === 'batch_clear') {
      await run("DELETE FROM batch_requests WHERE status = 'pending' AND guild_id = ?", [interaction.guildId]);
      return interaction.reply({ content: '✅ Cleared all pending requests for this server.', ephemeral: true });
    }

    if (commandName === 'batch_mass_decline') {
      const startId = interaction.options.getInteger('start_id');
      const reason = interaction.options.getString('reason') || 'No reason provided.';
      const gid = interaction.guildId;

      await interaction.deferReply({ ephemeral: true });

      // Find all PRE-REVIEW requests <= startId (Ignores accepted ones)
      const targetReqs = await all("SELECT * FROM batch_requests WHERE id <= ? AND guild_id = ? AND status = 'pre_review'", [startId, gid]);
      if (!targetReqs.length) return interaction.editReply(`📭 No requests in 'Pending Review' found from #${startId} downwards.`);

      let declinedCount = 0;
      for (const req of targetReqs) {
        await run("UPDATE batch_requests SET status = 'rejected' WHERE id = ?", [req.id]);
        try {
          const user = await client.users.fetch(req.discord_id);
          const embed = new EmbedBuilder()
            .setTitle('❌ Request Declined')
            .setDescription(`Your request for a **${req.type}** (ID #${req.id} in ${interaction.guild.name}) was not approved by staff.`)
            .addFields({ name: 'Reason', value: reason })
            .setColor(0xff4d4d)
            .setTimestamp();
          await user.send({ embeds: [embed] });
        } catch (e) {}
        await syncRequestMessage(req.id);
        declinedCount++;
      }

      await logStaffAction(gid, interaction.user.id, interaction.user.username, 'MASS_DECLINE_REVIEW', startId, `Declined ${declinedCount} pre-review requests.`);
      return interaction.editReply(`✅ Mass declined **${declinedCount}** requests.`);
    }

    if (commandName === 'batch_mass_delete_messages') {
      const startId = interaction.options.getInteger('start_id');
      const gid = interaction.guildId;

      await interaction.deferReply({ ephemeral: true });

      const rows = await all("SELECT id, msg_id, ch_id FROM batch_requests WHERE id <= ? AND guild_id = ? AND msg_id IS NOT NULL AND status IN ('pre_review', 'declined', 'rejected')", [startId, gid]);
      if (!rows.length) return interaction.editReply(`📭 No eligible review messages found.`);

      let deletedCount = 0;
      for (const r of rows) {
        try {
          const channel = await client.channels.fetch(r.ch_id).catch(() => null);
          if (channel) {
            const msg = await channel.messages.fetch(r.msg_id).catch(() => null);
            if (msg) { await msg.delete(); deletedCount++; }
          }
        } catch (e) {}
        await run("UPDATE batch_requests SET msg_id = NULL, ch_id = NULL WHERE id = ?", [r.id]);
      }

      return interaction.editReply(`✅ Successfully deleted **${deletedCount}** review messages.`);
    }

    if (commandName === 'batch_slowdown') {
      const seconds = interaction.options.getInteger('seconds');
      await setSetting(interaction.guildId, 'slowdown_seconds', seconds.toString());
      return interaction.reply({ content: `✅ Slowdown set to **${seconds} seconds**.`, ephemeral: true });
    }

    if (commandName === 'post-admin-batch-add') {
      const items = await all('SELECT name FROM batch_options LIMIT 25');
      if (!items.length) return interaction.reply({ content: '❌ No options configured.', ephemeral: true });
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
      const rows = await all("SELECT * FROM batches WHERE guild_id = ? ORDER BY id DESC LIMIT 8", [interaction.guildId]);
      if (!rows.length) return interaction.reply({ content: '📭 No batches created yet.', ephemeral: true });
      const embed = new EmbedBuilder().setTitle('📦 Recent Batches').setColor(0x5865f2);
      for (const b of rows) {
        const reqs = await all("SELECT username, vrfs_id FROM batch_requests WHERE batch_id = ? LIMIT 8", [b.id]);
        const list = reqs.map(r => `• **${r.username}** (\`${r.vrfs_id}\`)`).join('\n') || '*Empty*';
        embed.addFields({ name: `Batch #${b.id} [${b.status.toUpperCase()}]`, value: list });
      }
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (commandName === 'release_batch') {
      const gid = interaction.guildId;
      const batch = await get("SELECT * FROM batches WHERE guild_id = ? AND status = 'open' LIMIT 1", [gid]);
      if (!batch) return interaction.reply({ content: '❌ No open batch found.', ephemeral: true });

      const reqs = await all("SELECT username, vrfs_id, type, proof_url FROM batch_requests WHERE batch_id = ?", [batch.id]);
      if (!reqs.length) return interaction.reply({ content: '❌ This batch is empty.', ephemeral: true });
      await loadSettings(gid);
      const relId = getSetting(gid, 'release_channel');
      if (!relId) return interaction.reply({ content: '❌ Release channel not set.', ephemeral: true });

      const relCh = await client.channels.fetch(relId).catch(() => null);
      if (!relCh) return interaction.reply({ content: '❌ Cannot find release channel.', ephemeral: true });

      await run("UPDATE batches SET status = 'released', released_at = CURRENT_TIMESTAMP WHERE id = ?", [batch.id]);
      const list = reqs.map((r, i) => `**${i+1}.** ${r.username} — ID: \`${r.vrfs_id}\` (${r.type}) [Proof](${r.proof_url})`).join('\n');
      const embed = (await createBrandedEmbed(gid)).setTitle(`🚀 Batch #${batch.id} RELEASED`).setDescription(list).setColor(0x00f5a0).setTimestamp();

      await relCh.send({ embeds: [embed] });
      return interaction.reply({ content: `✅ Batch #${batch.id} released.`, ephemeral: true });
    }

    if (commandName === 'export_batches') {
      const owners = ['1139955783384187031', '1145402830786678884'];
      if (!owners.includes(interaction.user.id)) return interaction.reply({ content: '❌ Access Denied.', ephemeral: true });

      const allBatches = await all("SELECT * FROM batches WHERE guild_id = ? ORDER BY id ASC", [interaction.guildId]);
      if (!allBatches.length) return interaction.reply({ content: '📭 No batches to export.', ephemeral: true });

      let output = `BATCH EXPORT - ${interaction.guild.name}\n`;
      for (const b of allBatches) {
        const reqs = await all("SELECT * FROM batch_requests WHERE batch_id = ?", [b.id]);
        output += `[BATCH #${b.id}] ${b.status}\n` + reqs.map(r => `${r.vrfs_id}|${r.username}`).join('\n') + '\n\n';
      }
      const attachment = new AttachmentBuilder(Buffer.from(output), { name: 'batches.txt' });
      await interaction.user.send({ files: [attachment] });
      return interaction.reply({ content: '✅ Export sent to DMs.', ephemeral: true });
    }

    if (commandName === 'batch_halt') {
      const active = interaction.options.getBoolean('active');
      const reason = interaction.options.getString('reason') || 'Paused.';
      await setSetting(interaction.guildId, 'halted', active ? 'true' : 'false');
      await setSetting(interaction.guildId, 'halt_reason', reason);
      return interaction.reply({ content: `✅ Requests **${active ? 'HALTED' : 'OPEN'}**.`, ephemeral: true });
    }

    if (commandName === 'batch_sent') {
      const batchId = interaction.options.getInteger('batch_id');
      const gid = interaction.guildId;
      const reqs = await all("SELECT discord_id, type FROM batch_requests WHERE batch_id = ? AND guild_id = ?", [batchId, gid]);
      if (!reqs.length) return interaction.reply({ content: `❌ No requests for Batch #${batchId}.`, ephemeral: true });

      await interaction.deferReply({ ephemeral: true });
      let sentCount = 0;
      for (const r of reqs) {
        try {
          const user = await client.users.fetch(r.discord_id);
          const embed = (await createBrandedEmbed(gid)).setTitle('🚚 Batch Sent!').setDescription(`Your **${r.type}** (Batch #${batchId} in ${interaction.guild.name}) is sent!`).setColor(0x00f5a0);

          await user.send({ embeds: [embed] });
          sentCount++;
        } catch (e) {}
      }
      await run("UPDATE batches SET status = 'sent', sent_at = CURRENT_TIMESTAMP WHERE id = ?", [batchId]);
      await logStaffAction(gid, interaction.user.id, interaction.user.username, 'BATCH_SENT', batchId, `Notified ${sentCount}`);
      return interaction.editReply(`✅ Batch #${batchId} confirmed and marked sent.`);
    }

    if (commandName === 'my_request') {
      const rows = await all("SELECT * FROM batch_requests WHERE discord_id = ? ORDER BY id DESC LIMIT 5", [interaction.user.id]);
      if (!rows.length) return interaction.reply({ content: '📭 You currently have no requests.', ephemeral: true });

      const embed = new EmbedBuilder().setTitle('📂 Your Hub: Active Requests').setColor(0x5865f2);
      for (const req of rows) {
        const guild = client.guilds.cache.get(req.guild_id);
        embed.addFields({ name: `${req.type} (#${req.id})`, value: `**Server:** ${guild?.name || 'Unknown'}\n**Status:** ${req.status.toUpperCase()}\n**Batch:** ${req.batch_id ? `#${req.batch_id}` : 'None'}` });
      }
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (commandName === 'profile') {
      const target = interaction.options.getUser('user') || interaction.user;
      const latest = await get("SELECT * FROM batch_requests WHERE discord_id = ? ORDER BY id DESC LIMIT 1", [target.id]);
      const countRes = await get("SELECT COUNT(*) as cnt FROM batch_requests WHERE discord_id = ? AND status = 'completed'", [target.id]);
      const pastBatches = await all("SELECT DISTINCT batch_id, created_at FROM batch_requests WHERE discord_id = ? AND batch_id IS NOT NULL ORDER BY batch_id DESC LIMIT 4", [target.id]);
      
      const embed = new EmbedBuilder()
        .setAuthor({ name: target.username, iconURL: target.displayAvatarURL() })
        .setTitle('👤 Player Profile')
        .addFields(
          { name: 'VRFS ID', value: latest?.vrfs_id ? `\`${latest.vrfs_id}\`` : 'None', inline: true },
          { name: 'Total Customs', value: countRes.cnt.toString(), inline: true },
          { name: 'Recent Batches', value: pastBatches.map(b => `• Batch #${b.batch_id} (${new Date(b.created_at).toLocaleDateString()})`).join('\n') || 'None yet.' }
        )
        .setColor(0x00f5a0)
        .setThumbnail(target.displayAvatarURL());
      
      return interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'batch-edit') {
      if (!hasBatchAdmin(interaction.member)) return interaction.reply({ content: '❌ Staff Only.', ephemeral: true });
      const id = interaction.options.getInteger('request_id');
      const vrfs = interaction.options.getString('vrfs_id');
      const action = interaction.options.getString('action');
      const gid = interaction.guildId;

      if (action === 'remove') {
          await run("UPDATE batch_requests SET batch_id = NULL, status = 'pending' WHERE id = ? AND guild_id = ?", [id, gid]);
          return interaction.reply({ content: `✅ Request #${id} reset.` });
      }

      if (vrfs) {
          const old = await get("SELECT vrfs_id, discord_id FROM batch_requests WHERE id = ? AND guild_id = ?", [id, gid]);
          await run("UPDATE batch_requests SET vrfs_id = ? WHERE id = ? AND guild_id = ?", [vrfs, id, gid]);
          await logStaffAction(gid, interaction.user.id, interaction.user.username, 'EDITED_VRFS', id, `Changed to ${vrfs}`);
          try {
            const user = await client.users.fetch(old.discord_id);
            await user.send({ embeds: [new EmbedBuilder().setTitle('📝 Updated').setDescription(`ID #${id} in ${interaction.guild.name} changed to \`${vrfs}\`.`).setColor(0x5865f2)] });
          } catch(e){}
          return interaction.reply({ content: `✅ VRFS ID updated.` });
      }
    }

    if (commandName === 'post-ticket-panel') {
      if (!hasBatchAdmin(interaction.member)) return interaction.reply({ content: '❌ Staff Only.', ephemeral: true });
      const embed = new EmbedBuilder()
        .setTitle('🎫 Batch Issue Ticket')
        .setDescription('If you have a problem with your batch request or ID, click the button below to open a ticket.')
        .setColor(0xff4d4d);
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('batch_ticket_open').setLabel('Open Ticket').setStyle(ButtonStyle.Danger));
      return interaction.reply({ embeds: [embed], components: [row] });
    }

    if (commandName === 'view-logs') {
       if (!hasBatchAdmin(interaction.member)) return interaction.reply({ content: '❌ Staff Only.', ephemeral: true });
       const logs = await all("SELECT * FROM staff_logs WHERE guild_id = ? ORDER BY id DESC LIMIT 15", [interaction.guildId]);
       if (!logs.length) return interaction.reply({ content: '📭 No logs found.', ephemeral: true });

       const embed = new EmbedBuilder().setTitle('🛡️ Recent Staff Activity').setColor(0xffa500);
       logs.forEach(l => {
         embed.addFields({ name: `${l.staff_name} — ${l.action}`, value: `Target: ${l.target_id} | ${l.details} | <t:${Math.floor(new Date(l.created_at).getTime()/1000)}:R>` });
       });
       return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (commandName === 'lookup-batch-info') {
      const batchId = interaction.options.getInteger('batch_id');
      const batch = await get("SELECT * FROM batches WHERE id = ? AND guild_id = ?", [batchId, interaction.guildId]);
      if (!batch) return interaction.reply({ content: '❌ Batch not found in this server.', ephemeral: true });

      const reqs = await all("SELECT COUNT(*) as cnt FROM batch_requests WHERE batch_id = ?", [batchId]);
      const count = reqs[0].cnt;

      let statusMsg = "";
      let emoji = "⏳";
      let progress = 0;

      if (batch.status === 'open') {
          statusMsg = "Still collecting requests. Needs 8 to be released.";
          progress = (count / 8) * 100;
          emoji = "📁";
      } else if (batch.status === 'released') {
          statusMsg = "Batch is FULL and waiting for the developer to send it in-game.";
          progress = 75;
          emoji = "🚀";
      } else if (batch.status === 'sent') {
          statusMsg = "This batch has been successfully sent in-game!";
          progress = 100;
          emoji = "✅";
      }

      const barFull = '🟩';
      const barEmpty = '⬜';
      const barLength = 10;
      const filledLength = Math.round((progress / 100) * barLength);
      const bar = barFull.repeat(filledLength) + barEmpty.repeat(barLength - filledLength);

      const embed = new EmbedBuilder()
        .setTitle(`${emoji} Batch Info: #${batchId}`)
        .setDescription(`**Progress:** ${progress.toFixed(0)}%\n${bar}\n\n**Current Stage:** ${batch.status.toUpperCase()}\n**Details:** ${statusMsg}`)
        .addFields({ name: 'Items in Batch', value: `${count}/8 items`, inline: true })
        .setColor(batch.status === 'sent' ? 0x00f5a0 : 0xFFA500)
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }
    }

  if (interaction.isButton()) {
    const { customId } = interaction;

    // Ticket Modal Opening
    if (customId === 'batch_ticket_open') {
      const modal = new ModalBuilder().setCustomId('batch_ticket_modal').setTitle('Report Batch Issue');
      const issueInput = new TextInputBuilder().setCustomId('issue_text').setLabel('Explain your issue').setStyle(TextInputStyle.Paragraph).setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(issueInput));
      return interaction.showModal(modal);
    }

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
      if (req.status !== 'pre_review') return interaction.reply({ content: '⚠️ This request has already been handled.', ephemeral: true });

      if (action === 'approve') {
        try {
          const gid = req.guild_id;
          await run("UPDATE batch_requests SET status = 'pending', verified_at = CURRENT_TIMESTAMP WHERE id = ?", [id]);
          await interaction.message.delete().catch(() => {});
          try {
            const user = await client.users.fetch(req.discord_id);
            await user.send({ embeds: [new EmbedBuilder().setTitle('✅ Verified!').setDescription(`Your **${req.type}** in ${interaction.guild.name} is in the queue.`).setColor(0x00f5a0)] });
          } catch (e) {}
          await loadSettings(gid);
          const qId = getSetting(gid, 'review_channel');
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
              const msg = await ch.send({ embeds: [embed], components: [buttons] });
              await run("UPDATE batch_requests SET msg_id = ?, ch_id = ? WHERE id = ?", [msg.id, ch.id, id]);
            }
          }
          await logStaffAction(gid, interaction.user.id, interaction.user.username, 'APPROVED_PRE_REVIEW', id, `Type: ${req.type}`);
          return interaction.reply({ content: '✅ Approved.', ephemeral: true });
        } catch (err) {
          return interaction.reply({ content: `❌ Error: ${err.message}`, ephemeral: true });
        }
      } else {
        await run("UPDATE batch_requests SET status = 'rejected' WHERE id = ?", [id]);
        await logStaffAction(req.guild_id, interaction.user.id, interaction.user.username, 'REJECTED_PRE_REVIEW', id, `Type: ${req.type}`);
        await interaction.message.delete().catch(() => {});
        try {
          const user = await client.users.fetch(req.discord_id);
          await user.send({ embeds: [new EmbedBuilder().setTitle('❌ Rejected').setDescription(`Your request (#${id}) was rejected in ${interaction.guild.name}.`).setColor(0xff4d4d)] });
        } catch (e) {}
        return interaction.reply({ content: '❌ Rejected.', ephemeral: true });
      }
    }

    // Queue Buttons
    if (customId.startsWith('batch_done_') || customId.startsWith('batch_deny_')) {
      if (!hasBatchAdmin(interaction.member)) return interaction.reply({ content: '❌ Staff Only.', ephemeral: true });
      const [, action, id] = customId.split('_');
      const reqCheck = await get('SELECT * FROM batch_requests WHERE id = ?', [id]);
      if (!reqCheck || reqCheck.status !== 'pending') return interaction.reply({ content: '⚠️ Already processed.', ephemeral: true });

      const status = action === 'done' ? 'completed' : 'rejected';
      const gid = reqCheck.guild_id;
      await run('UPDATE batch_requests SET status = ?, staff_id = ? WHERE id = ?', [status, interaction.user.id, id]);
      
      if (action === 'done') {
        let batch = await get("SELECT * FROM batches WHERE status = 'open' AND guild_id = ? ORDER BY id ASC LIMIT 1", [gid]);
        if (!batch) {
          await run("INSERT INTO batches (status, guild_id) VALUES ('open', ?)", [gid]);
          batch = await get("SELECT * FROM batches WHERE status = 'open' AND guild_id = ? ORDER BY id ASC LIMIT 1", [gid]);
        }
        await run("UPDATE batch_requests SET batch_id = ? WHERE id = ?", [batch.id, id]);
        
        try {
          const user = await client.users.fetch(reqCheck.discord_id);
          await user.send({ embeds: [new EmbedBuilder().setTitle('📦 Batch Assigned!').setDescription(`Your **${reqCheck.type}** in ${interaction.guild.name} is in **Batch #${batch.id}**.`).setColor(0x5865f2)] });
        } catch(e) {}
        
        const countData = await get("SELECT COUNT(*) as cnt FROM batch_requests WHERE batch_id = ?", [batch.id]);
        if (countData.cnt >= 8) {
          await run("UPDATE batches SET status = 'released', released_at = CURRENT_TIMESTAMP WHERE id = ?", [batch.id]);
          await loadSettings(gid);
          const relId = getSetting(gid, 'release_channel');
          if (relId) {
            const relCh = await client.channels.fetch(relId).catch(() => null);
            if (relCh) {
              const reqs = await all("SELECT username, vrfs_id, type FROM batch_requests WHERE batch_id = ?", [batch.id]);
              const list = reqs.map((r, i) => `**${i+1}.** ${r.username} — ID: \`${r.vrfs_id}\` (${r.type})`).join('\n');
              const embed = new EmbedBuilder().setTitle(`🚀 Batch #${batch.id} RELEASED`).setDescription(list).setColor(0x00f5a0);
              await relCh.send({ embeds: [embed] });
            }
          }
        }
      }

      await logStaffAction(gid, interaction.user.id, interaction.user.username, status === 'completed' ? 'FULFILLED' : 'REJECTED', id, `Item: ${reqCheck.type}`);
      const embed = EmbedBuilder.from(interaction.message.embeds[0]).setTitle(`${status.toUpperCase()} | ${interaction.message.embeds[0].title}`).setColor(status === 'completed' ? 0x00f5a0 : 0xff4d4d);
      return interaction.update({ embeds: [embed], components: [] });
    }
    
    if (customId.startsWith('batch_ticket_close_')) {
      const id = customId.split('_').pop();
      await run("UPDATE batch_tickets SET status = 'closed' WHERE id = ? AND guild_id = ?", [id, interaction.guildId]);
      await interaction.reply({ content: '🔒 Ticket closed.' });
      setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
      return;
    }
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'batch_ticket_modal') {
      const issue = interaction.fields.getTextInputValue('issue_text');
      const gid = interaction.guildId;
      await run("INSERT INTO batch_tickets (guild_id, discord_id, username, issue) VALUES (?,?,?,?)", [gid, interaction.user.id, interaction.user.username, issue]);
      const res = await get("SELECT id FROM batch_tickets WHERE discord_id = ? AND guild_id = ? ORDER BY id DESC LIMIT 1", [interaction.user.id, gid]);
      
      try {
        await loadSettings(gid);
        const tCatId = getSetting(gid, 'ticket_category');
        const tRoleId = getSetting(gid, 'ticket_role');
        const devRole = '1456425209237209281'; // As requested by user

        if (tCatId) {
          const guild = interaction.guild;
          if (guild) {
            const overwrites = [
              { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
              { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
              { id: devRole, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ];
            if (tRoleId && tRoleId !== devRole) {
              overwrites.push({ id: tRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
            }

            const channel = await guild.channels.create({
              name: `ticket-${res.id}-${interaction.user.username}`,
              parent: tCatId,
              permissionOverwrites: overwrites
            });

            const ping = tRoleId ? `<@&${tRoleId}>` : `<@&${devRole}>`;
            const embed = new EmbedBuilder()
              .setTitle(`🎫 New Ticket: #${res.id}`)
              .setDescription(`**User:** <@${interaction.user.id}> (${interaction.user.username})\n**Issue:** ${issue}\n\nStaff and Developers will assist you here.`)
              .setColor(0xff4d4d)
              .setTimestamp();
            
            const row = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId(`batch_ticket_close_${res.id}`).setLabel('Close Ticket').setStyle(ButtonStyle.Secondary)
            );

            await channel.send({ content: `${ping} <@${interaction.user.id}>`, embeds: [embed], components: [row] });
          }
        } else {
           // Fallback to channel message if category not set
           const tChId = getSetting('ticket_channel');
           if (tChId) {
             const ch = await client.channels.fetch(tChId).catch(() => null);
             if (ch) {
               const ping = tRoleId ? `<@&${tRoleId}>` : '';
               const embed = new EmbedBuilder().setTitle(`🎫 Ticket: #${res.id}`).setDescription(`**User:** <@${interaction.user.id}>\n**Issue:** ${issue}`).setColor(0xff4d4d);
               await ch.send({ content: ping, embeds: [embed] });
             }
           }
        }
      } catch (e) { 
        console.error('Ticket Channel Creation Error:', e); 
      }

      return interaction.reply({ content: `✅ Ticket **#${res.id}** submitted! Staff will review it on the portal.`, ephemeral: true });
    }
  }
} catch (err) {
    console.error('[Interaction Error]', err.message);
    try {
      if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: '❌ An internal error occurred.', ephemeral: true });
    } catch (_) {}
  }
});

// --- 🎁 Giveaway System Logic ---
async function endGiveaway(gwId) {
  const gw = await get("SELECT * FROM giveaways WHERE id = ?", [gwId]);
  if (!gw || gw.status !== 'active') return;

  const entries = await all("SELECT user_id FROM giveaway_entries WHERE giveaway_id = ?", [gwId]);
  const winners = [];
  
  if (entries.length > 0) {
    const shuffled = entries.sort(() => 0.5 - Math.random());
    for (let i = 0; i < Math.min(gw.winners_count, shuffled.length); i++) {
        winners.push(`<@${shuffled[i].user_id}>`);
    }
  }

  await run("UPDATE giveaways SET status = 'ended' WHERE id = ?", [gwId]);
  
  try {
    const ch = await client.channels.fetch(gw.channel_id).catch(() => null);
    if (ch) {
      const msg = await ch.messages.fetch(gw.msg_id).catch(() => null);
      if (msg) {
        const desc = winners.length > 0 
           ? `Congratulations to ${winners.join(', ')}! You won the **${gw.prize}**!`
           : "No entries were found for this giveaway.";
           
        const embed = (await createBrandedEmbed(gw.guild_id))
          .setTitle(`🎉 Giveaway Ended: ${gw.prize}`)
          .setDescription(desc)
          .setColor(winners.length > 0 ? 0x00f5a0 : 0x5865f2)
          .setFooter({ text: "Better luck next time!" })
          .setTimestamp();

        
        await msg.edit({ embeds: [embed], components: [] });
        await ch.send({ content: `🎊 Congratulations ${winners.join(', ')}! You won the **${gw.prize}**!` });
      }
    }
  } catch(e) {}
}

async function checkGiveaways() {
  const now = new Date().toISOString();
  const ended = await all("SELECT id FROM giveaways WHERE status = 'active' AND end_time <= ?", [now]);
  for (const g of ended) {
     await endGiveaway(g.id);
  }
}

async function handleNewRequest(interaction, type, providedUser = null) {

  try {
    const user = providedUser || interaction.user;
    const gid = interaction?.guildId || process.env.BATCH_GUILD_ID || "1286206719847960670";
    await loadSettings(gid);
    if (getSetting(gid, 'halted') === 'true') {
      const reason = getSetting(gid, 'halt_reason') || 'Paused.';
      const embed = new EmbedBuilder().setTitle('⏸️ Requests Halted').setDescription(reason).setColor(0xffa500);
      if (interaction) return interaction.reply({ embeds: [embed], ephemeral: true });
      else return user.send({ embeds: [embed] }).catch(() => {});
    }

    // Duplicate Check
    const existing = await get("SELECT id FROM batch_requests WHERE discord_id = ? AND guild_id = ? AND type = ? AND status NOT IN ('completed', 'rejected', 'declined')", [user.id, gid, type]);
    if (existing) {
       const msg = `❌ You already have an active request for a **${type}** in this server.`;
       if (interaction) return interaction.reply({ content: msg, ephemeral: true });
       return user.send(msg).catch(() => {});
    }

    const dm = await user.createDM().catch(() => null);
    if (!dm) {
      if (interaction) return interaction.reply({ content: '❌ Enable DMs first.', ephemeral: true });
      return;
    }
    if (interaction) await interaction.reply({ content: `✅ DM Sent! Check your private messages to finish your **${type}** request.`, ephemeral: true });

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
    await createRequest(gid, user.id, user.username, vrfsId, type, 'Pending Pre-Review', proofUrl);

  } catch (e) {
    if (e.message?.includes('time')) {
      interaction.user.send('❌ **Timed Out.** Please start again from the server.').catch(() => {});
    }
  }
}

async function createRequest(guildId, userId, username, vrfsId, type, details, proofUrl) {
  await run('INSERT INTO batch_requests (guild_id, discord_id, username, vrfs_id, type, details, proof_url, status) VALUES (?,?,?,?,?,?,?,?)', [guildId, userId, username, vrfsId, type, details, proofUrl, 'pre_review']);
  const req = await get('SELECT id, guild_id, discord_id, username, vrfs_id, type, proof_url FROM batch_requests WHERE discord_id = ? AND guild_id = ? ORDER BY id DESC LIMIT 1', [userId, guildId]);
  preReviewQueue.push(req);
  processPreReviewQueue();
}

async function registerCommands() {
  let batchItems = [];
  try {
    const rows = await all('SELECT name FROM batch_options');
    batchItems = rows.map(r => ({ name: r.name, value: r.name }));
  } catch (e) {}

  const choices = batchItems.length > 0 ? batchItems.slice(0, 25) : [{ name: 'Other', value: 'other' }];
  const commands = [
    new SlashCommandBuilder().setName('setup').setDescription('Show configuration status and guide [Admin Only]'),
    new SlashCommandBuilder().setName('batch_request').setDescription('Submit a request for a custom item').addStringOption(o => o.setName('type').setDescription('Type').setRequired(true).addChoices(...choices)),
    new SlashCommandBuilder().setName('post-batch-request').setDescription('Post request message [Staff]'),
    new SlashCommandBuilder().setName('set-batch-review-channel').setDescription('Set queue channel [Staff]').addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(true)),
    new SlashCommandBuilder().setName('set-batch-pre-review-channel').setDescription('Set verification channel [Staff]').addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(true)),
    new SlashCommandBuilder().setName('set-batch-release-channel').setDescription('Set channel where full batches are posted [Staff]').addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(true)),
    new SlashCommandBuilder().setName('batch_option').setDescription('Manage requestable items [Staff]')
      .addSubcommand(s => s.setName('add').setDescription('Add an item').addStringOption(o => o.setName('name').setDescription('Item Name').setRequired(true)))
      .addSubcommand(s => s.setName('remove').setDescription('Remove an item').addStringOption(o => o.setName('name').setDescription('Item Name').setRequired(true)))
      .addSubcommand(s => s.setName('list').setDescription('List all items')),
    new SlashCommandBuilder().setName('batch_check').setDescription('View queue [Staff]'),
    new SlashCommandBuilder().setName('view-batches').setDescription('View recent batches and their contents [Staff]'),
    new SlashCommandBuilder().setName('view-logs').setDescription('View staff activity logs [Staff]'),
    new SlashCommandBuilder().setName('set-ticket-channel').setDescription('Set channel where new tickets are posted [Staff]').addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(true)),
    new SlashCommandBuilder().setName('set-web-support-channel').setDescription('Set channel for website chat alerts [Staff]').addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(true)),
    new SlashCommandBuilder().setName('set-ticket-role').setDescription('Set role to ping for new tickets [Staff]').addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)),
    new SlashCommandBuilder().setName('set-ticket-category').setDescription('Set category where private ticket channels are created [Staff]').addChannelOption(o => o.setName('category').setDescription('Category').setRequired(true)),
    new SlashCommandBuilder().setName('close-ticket').setDescription('Close and delete the current ticket channel [Staff]'),
    new SlashCommandBuilder().setName('batch_add').setDescription('Manual add [Staff]')
      .addUserOption(o => o.setName('player').setDescription('Player').setRequired(true))
      .addStringOption(o => o.setName('vrfs_id').setDescription('VRFS ID').setRequired(true))
      .addStringOption(o => o.setName('type').setDescription('Type').setRequired(true).addChoices(...choices)),
    new SlashCommandBuilder().setName('batch_remove').setDescription('Remove by ID [Staff]').addIntegerOption(o => o.setName('id').setDescription('ID').setRequired(true)),
    new SlashCommandBuilder().setName('batch_clear').setDescription('Clear pending queue [Staff]'),
    new SlashCommandBuilder().setName('release_batch').setDescription('Manually post the current batch to the release channel [Staff]'),
    new SlashCommandBuilder().setName('export_batches').setDescription('Export all batches to a text file [Restricted]'),
    new SlashCommandBuilder().setName('my_request').setDescription('Check the status of your own request'),
    new SlashCommandBuilder().setName('batch_halt').setDescription('Pause or resume all batch requests [Staff]')
      .addBooleanOption(o => o.setName('active').setDescription('Set to true to HAULT requests, false to open').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('The reason shown to users').setRequired(false)),
    new SlashCommandBuilder().setName('batch_sent').setDescription('Notify all users in a batch that it has been sent [Staff]')
      .addIntegerOption(o => o.setName('batch_id').setDescription('The Batch ID').setRequired(true)),
    new SlashCommandBuilder().setName('post-admin-batch-add').setDescription('Post interactive manual add buttons [Staff]'),
    new SlashCommandBuilder().setName('profile').setDescription('View your player stats or another players profile').addUserOption(o => o.setName('user').setDescription('User to view')),
    new SlashCommandBuilder().setName('batch-edit').setDescription('Edit a specific request in the system [Staff]')
      .addIntegerOption(o => o.setName('request_id').setDescription('The ID of the request to edit').setRequired(true))
      .addStringOption(o => o.setName('vrfs_id').setDescription('New VRFS ID to assign'))
      .addStringOption(o => o.setName('action').setDescription('Action to take').addChoices({ name: 'Remove from Batch', value: 'remove' })),
    new SlashCommandBuilder().setName('lookup-batch-info').setDescription('Check status and progress of a batch').addIntegerOption(o => o.setName('batch_id').setDescription('ID').setRequired(true)),
    new SlashCommandBuilder().setName('set-admin-role').setDescription('Set bot admin role [Admin Only]').addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)),
    new SlashCommandBuilder().setName('giveaway-start').setDescription('Start a beautiful giveaway [Staff Only]')
      .addStringOption(o => o.setName('prize').setDescription('What are you giving away?').setRequired(true))
      .addIntegerOption(o => o.setName('duration').setDescription('Minutes until it ends').setRequired(true))
      .addIntegerOption(o => o.setName('winners').setDescription('How many winners?').setRequired(false)),
    new SlashCommandBuilder().setName('giveaway-reroll').setDescription('Pick a new winner for a giveaway [Staff Only]')
      .addStringOption(o => o.setName('id').setDescription('Giveaway ID').setRequired(true)),

  ].map(c => c.toJSON());

  const rest = new REST({ version: '10' }).setToken(process.env.BATCH_DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(process.env.BATCH_CLIENT_ID), { body: commands });
    console.log('✅ Commands Registered.');
  } catch (e) { console.error(e); }
}

client.on('interactionCreate', async interaction => {
  try {
    // --- 🎁 Giveaway Command Handlers ---
    if (interaction.isChatInputCommand()) {
      const { commandName } = interaction;
      if (commandName === 'giveaway-start') {
         if (!hasBatchAdmin(interaction.member)) return interaction.reply({ content: '❌ Staff Only.', ephemeral: true });
         const prize = interaction.options.getString('prize');
         const winners = interaction.options.getInteger('winners') || 1;
         const duration = interaction.options.getInteger('duration');
         
         const endTime = new Date(Date.now() + duration * 60000);
         const gwId = Math.random().toString(36).substring(2, 9).toUpperCase();

         const embed = new EmbedBuilder()
           .setTitle(`🎁 ACTIVE GIVEAWAY: ${prize}`)
           .setDescription(`Click the button below to enter!\n\n**Winners:** ${winners}\n**Ends:** <t:${Math.floor(endTime.getTime()/1000)}:R> (<t:${Math.floor(endTime.getTime()/1000)}:f>)`)
           .setColor(0x00f5a0)
           .setFooter({ text: `ID: ${gwId} | Good luck!` })
           .setTimestamp();
         
         const row = new ActionRowBuilder().addComponents(
           new ButtonBuilder().setCustomId(`gw_join_${gwId}`).setLabel('🎁 Enter Giveaway').setStyle(ButtonStyle.Primary)
         );

         const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
         await run("INSERT INTO giveaways (id, guild_id, channel_id, msg_id, prize, winners_count, end_time) VALUES (?,?,?,?,?,?,?)",
           [gwId, interaction.guildId, interaction.channelId, msg.id, prize, winners, endTime.toISOString()]);
         return;
      }

      if (commandName === 'giveaway-reroll') {
         if (!hasBatchAdmin(interaction.member)) return interaction.reply({ content: '❌ Staff Only.', ephemeral: true });
         const id = interaction.options.getString('id');
         const gw = await get("SELECT * FROM giveaways WHERE id = ?", [id]);
         if (!gw) return interaction.reply({ content: '❌ Giveaway not found.', ephemeral: true });
         
         const entries = await all("SELECT user_id FROM giveaway_entries WHERE giveaway_id = ?", [id]);
         if (entries.length === 0) return interaction.reply({ content: '❌ No entries to reroll from.', ephemeral: true });
         
         const winner = entries[Math.floor(Math.random() * entries.length)];
         return interaction.reply({ content: `🎊 **Reroll Complete!** The new winner is <@${winner.user_id}>!` });
      }
    }

    // --- 🖱️ Giveaway Button Handler ---
    if (interaction.isButton()) {
      if (interaction.customId.startsWith('gw_join_')) {
         const gwId = interaction.customId.replace('gw_join_', '');
         const gw = await get("SELECT status FROM giveaways WHERE id = ?", [gwId]);
         if (!gw || gw.status !== 'active') return interaction.reply({ content: '⚠️ This giveaway has already ended.', ephemeral: true });
         
         try {
           await run("INSERT INTO giveaway_entries (giveaway_id, user_id) VALUES (?, ?)", [gwId, interaction.user.id]);
           return interaction.reply({ content: '✅ You have successfully entered the giveaway!', ephemeral: true });
         } catch (e) {
           return interaction.reply({ content: '⚠️ You are already in this giveaway.', ephemeral: true });
         }
      }
    }
  } catch (err) {
    console.error('[Interaction Error]', err.message);
    try {
      if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: '❌ An internal error occurred.', ephemeral: true });
    } catch (_) {}
  }
});

client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  registerCommands();
  
  // Giveaway Checker (Every minute)
  setInterval(() => checkGiveaways(), 60000);

  
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
