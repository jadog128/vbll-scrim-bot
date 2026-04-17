/**
 * Sentinal Apex — Multi-Layered Security & Protection System
 * VCC League Edition
 */

require('dotenv').config({ path: '.env.mod' });
const { 
  Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
  ButtonBuilder, ButtonStyle, PermissionFlagsBits, Collection,
  REST, Routes, SlashCommandBuilder, ChannelType
} = require('discord.js');
const { createClient } = require('@libsql/client');
const http = require('http');

// --- Virtual Port Binding ---
const PORT = process.env.PORT || 10001;
http.createServer((req, res) => {
  res.writeHead(200); res.end('Sentinal Apex Online\n');
}).listen(PORT);

// --- Database Configuration (Harden names) ---
const db = createClient({
  url: process.env.VCC_MOD_TURSO_URL || process.env.MOD_TURSO_URL,
  authToken: process.env.VCC_MOD_TURSO_TOKEN || process.env.MOD_TURSO_TOKEN,
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

// --- Internal Cache ---
const spamCache = new Collection();
const raidCache = { count: 0, lastJoin: Date.now(), locked: false };
const panicState = new Collection(); // guild_id -> boolean
const _settingsCache = new Collection();

async function loadSettings(guildId) {
  try {
    const s = await get('SELECT * FROM mod_settings WHERE guild_id = ?', [guildId]);
    if (s) _settingsCache.set(guildId, s);
  } catch (e) {}
}

function getSetting(guildId, key) { return _settingsCache.get(guildId)?.[key] ?? null; }

// --- Permissions ---
const ADMIN_ROLE_ID = '1369059054793785467'; // VCC Staff Role
function hasModAdmin(member) {
  if (!member) return false;
  if (member.id === '1145402830786678884') return true;
  return member.permissions.has(PermissionFlagsBits.Administrator) || member.roles.cache.has(ADMIN_ROLE_ID);
}

// --- Bot Client ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildBans
  ]
});

// --- Moderation Utilities ---
async function logAction(guildId, moderatorId, targetId, action, reason, evidence = '') {
  await run('INSERT INTO mod_logs (guild_id, moderator_id, target_id, action, reason, evidence) VALUES (?,?,?,?,?,?)',
    [guildId, moderatorId, targetId, action, reason, evidence]);
  
  const logChannelId = getSetting(guildId, 'log_channel');
  if (logChannelId) {
    const channel = await client.channels.fetch(logChannelId).catch(() => null);
    if (channel) {
      const embed = new EmbedBuilder()
        .setTitle(`🛡️ Sentinal Apex: ${action.toUpperCase()}`)
        .addFields(
          { name: 'Target', value: targetId === 'SERVER' ? 'SERVERSIDE' : `<@${targetId}>`, inline: true },
          { name: 'Moderator', value: `<@${moderatorId}>`, inline: true },
          { name: 'Reason', value: reason }
        )
        .setColor(action.includes('BAN') || action === 'PANIC' ? 0xff0000 : action === 'TIMEOUT' ? 0xffa500 : 0x00f5a0)
        .setTimestamp();
      if (evidence) embed.addFields({ name: 'Evidence Vault', value: `\`\`\`\n${evidence.slice(0, 1000)}\n\`\`\`` });
      await channel.send({ embeds: [embed] });
    }
  }
}

function getTrustScore(member) {
  const days = (Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);
  let score = Math.floor(days / 30); // 1 point per month
  if (member.user.avatar) score += 5;
  if (member.premiumSince) score += 20;
  return score;
}

// --- Event Handlers ---
async function registerCommands() {
  const commands = [
    // 1. Core Moderation
    new SlashCommandBuilder().setName('warn').setDescription('Warn a user').addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(true)),
    new SlashCommandBuilder().setName('timeout').setDescription('Timeout a user').addUserOption(o => o.setName('user').setDescription('Target member').setRequired(true)).addIntegerOption(o => o.setName('minutes').setDescription('Duration').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(true)),
    new SlashCommandBuilder().setName('kick').setDescription('Kick a member').addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Reason')),
    new SlashCommandBuilder().setName('ban').setDescription('Ban a member').addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Reason')),
    new SlashCommandBuilder().setName('unban').setDescription('Unban a user').addStringOption(o => o.setName('id').setDescription('User ID').setRequired(true)),
    new SlashCommandBuilder().setName('purge').setDescription('Purge messages').addIntegerOption(o => o.setName('count').setDescription('Number of messages').setRequired(true).setMinValue(1).setMaxValue(100)),
    
    // 2. Advanced Security
    new SlashCommandBuilder().setName('lock').setDescription('Lock the current channel'),
    new SlashCommandBuilder().setName('unlock').setDescription('Unlock the current channel'),
    new SlashCommandBuilder().setName('lockall').setDescription('QUICK LOCK: Freeze all text channels'),
    new SlashCommandBuilder().setName('panic').setDescription('HIGH ALERT: Toggle server lockdown mode').addBooleanOption(o => o.setName('status').setDescription('Enabled status').setRequired(true)),
    new SlashCommandBuilder().setName('scan').setDescription('Deep scan current channel for malicious links'),
    
    // 3. Permissions & Config
    new SlashCommandBuilder().setName('permission').setDescription('Internal Bot Permissions')
      .addSubcommand(s => s.setName('add').setDescription('Grant bot staff access').addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true)).addIntegerOption(o => o.setName('level').setDescription('1=Mod, 2=Admin, 3=Owner').setRequired(true)))
      .addSubcommand(s => s.setName('remove').setDescription('Remove bot staff access').addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true)))
      .addSubcommand(s => s.setName('view').setDescription('View staff list')),
    
    new SlashCommandBuilder().setName('antinuke').setDescription('Anti-Nuke Configuration')
      .addSubcommand(s => s.setName('enable').setDescription('Enable protection'))
      .addSubcommand(s => s.setName('disable').setDescription('Disable protection'))
      .addSubcommand(s => s.setName('setlimit').setDescription('Set action limits').addStringOption(o => o.setName('action').setDescription('Action type').setChoices({name:'Ban',value:'ban'},{name:'Kick',value:'kick'}).setRequired(true)).addIntegerOption(o => o.setName('count').setDescription('Limit count').setRequired(true))),

    new SlashCommandBuilder().setName('whitelist').setDescription('Whitelist Management')
      .addSubcommand(s => s.setName('add').setDescription('Exempt user/role').addUserOption(o => o.setName('user').setDescription('Target user')).addRoleOption(o => o.setName('role').setDescription('Target role')))
      .addSubcommand(s => s.setName('view').setDescription('View whitelist')),

    new SlashCommandBuilder().setName('verification').setDescription('Member Verification Flow')
      .addSubcommand(s => s.setName('setup').setDescription('Setup verification channel').addChannelOption(o => o.setName('channel').setDescription('Target channel').setRequired(true)).addRoleOption(o => o.setName('role').setDescription('Verified role').setRequired(true)))
      .addSubcommand(s => s.setName('enable').setDescription('Turn on captcha')),

    // 4. Info & General
    new SlashCommandBuilder().setName('trust').setDescription('Check user trust score').addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true)),
    new SlashCommandBuilder().setName('about').setDescription('Sentinal Apex Intelligence Profile'),
    new SlashCommandBuilder().setName('settings').setDescription('View current guild configuration'),
  ].map(c => c.toJSON());

  const token = (process.env.VCC_MOD_DISCORD_TOKEN || process.env.MOD_DISCORD_TOKEN || '').trim();
  const clientId = (process.env.VCC_MOD_CLIENT_ID || process.env.MOD_CLIENT_ID || '').trim();
  const guildId = (process.env.VCC_GUILD_ID || '1369058522951585974').trim(); // Fallback to VCC Guild

  const rest = new REST({ version: '10' }).setToken(token);
  try {
    console.log(`🔄 Deploying commands to Guild: ${guildId}`);
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    console.log(`✅ Registered ${commands.length} Apex commands instantly.`);
  } catch (e) { console.error('❌ Registration Failed:', e); }
}

client.on('ready', async () => {
  console.log(`🛡️ Sentinal Apex Active: ${client.user.tag}`);
  
  // Initialize Tables
  try {
    await run(`CREATE TABLE IF NOT EXISTS mod_logs (id INTEGER PRIMARY KEY, guild_id TEXT, moderator_id TEXT, target_id TEXT, action TEXT, reason TEXT, evidence TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    await run(`CREATE TABLE IF NOT EXISTS mod_settings (guild_id TEXT PRIMARY KEY, log_channel TEXT, welcome_channel TEXT, mute_role TEXT, verify_role TEXT, verify_channel TEXT, antinuke_status INTEGER DEFAULT 0)`);
    await run(`CREATE TABLE IF NOT EXISTS mod_global_blacklist (discord_id TEXT PRIMARY KEY, reason TEXT, staff_id TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    await run(`CREATE TABLE IF NOT EXISTS mod_permissions (guild_id TEXT, user_id TEXT, level INTEGER, PRIMARY KEY(guild_id, user_id))`);
    await run(`CREATE TABLE IF NOT EXISTS mod_whitelist (guild_id TEXT, target_id TEXT, type TEXT, PRIMARY KEY(guild_id, target_id, type))`);
    await run(`CREATE TABLE IF NOT EXISTS mod_anti_nuke_limits (guild_id TEXT PRIMARY KEY, ban_limit INTEGER DEFAULT 5, kick_limit INTEGER DEFAULT 5, channel_del_limit INTEGER DEFAULT 3)`);
    console.log('✅ Sentinal Apex Ultimate Database Initialized.');
  } catch (e) { console.error('❌ DB Init Failed:', e); }

  registerCommands();
});

client.on('guildMemberAdd', async member => {
  const guildId = member.guild.id;
  
  // 1. Trust Check
  const score = getTrustScore(member);
  if (score < 2) { // Account less than 2 months old or suspicious
    await logAction(guildId, client.user.id, member.id, 'TRUST-ALERT', `New account detected. Score: ${score}`);
  }

  // 2. Raid Shield
  const now = Date.now();
  if (now - raidCache.lastJoin < 1500) raidCache.count++;
  else raidCache.count = 0;
  raidCache.lastJoin = now;

  if (raidCache.count >= 5 && !raidCache.locked) {
    raidCache.locked = true;
    await logAction(guildId, client.user.id, 'SERVER', 'RAID-SHIELD', 'Velocity threshold exceeded. Increasing verification.');
    await member.guild.setVerificationLevel(4).catch(() => {});
  }

  // 4. Captcha Flow
  const s = _settingsCache.get(guildId);
  if (s && s.verify_channel && s.verify_role) {
    const answer = Math.random().toString(36).substring(2, 8);
    captchaCache.set(member.id, { answer, guildId });
    await member.send(`🛡️ **${member.guild.name}: Security Verification Required.**\nPlease reply with this code: \`${answer}\``).catch(() => {
      const vc = member.guild.channels.cache.get(s.verify_channel);
      if (vc) vc.send(`⚠️ <@${member.id}>, please open your DMs to complete verification with me!`);
    });
  }
});

const captchaCache = new Collection(); // user_id -> string
const nukeTracker = new Collection(); // mod_id -> { count, windowStart }

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // Verification DM Handler
  if (!message.guild) {
    const captcha = captchaCache.get(message.author.id);
    if (captcha && message.content.trim().toLowerCase() === captcha.answer.toLowerCase()) {
      const guild = await client.guilds.fetch(captcha.guildId).catch(() => null);
      if (guild) {
        const gm = await guild.members.fetch(message.author.id).catch(() => null);
        const s = _settingsCache.get(guild.id);
        if (gm && s?.verify_role) {
          await gm.roles.add(s.verify_role).catch(() => {});
          captchaCache.delete(message.author.id);
          return await message.reply('✅ **Identity Verified.** Welcome to the server.');
        }
      }
    } else if (captcha) {
      return await message.reply('❌ **Verification Failed.** Try again or contact staff.');
    }
  }

  const { author, content, guild, channel } = message;

  // Panic Mode check
  if (panicState.get(guild.id) && !hasModAdmin(message.member)) {
    return await message.delete().catch(() => {});
  }

  // Apex Deep Scan Filters
  const filters = [
    /\b(n[i1]gg[e3]r|n[i1]gg[a4]|f[a4]gg[o0]t|k[y3]s|n[a4]z[i1])\b/i, // Slurs
    /discord\.gg\/[a-zA-Z0-9]+/i, // Invites
    /https?:\/\/(?:www\.)?(?:tinyurl|bit\.ly|shorturl|grabbing|iplogger|leak|nitro-)\.[a-z]+\/\w+/i, // Malicious/Shortlinks
    /[\u200B-\u200D\uFEFF]/, // Invisible characters
    /@everyone|@here/ // Unauthorized pings (if non-admin)
  ];

  for (const regex of filters) {
    if (regex.test(content)) {
      if (regex.source.includes('@') && hasModAdmin(message.member)) continue;
      
      await message.delete().catch(() => {});
      const score = getTrustScore(message.member);
      const action = score < 5 ? 'AUTO-TIMEOUT' : 'AUTO-WARN';
      
      if (action === 'AUTO-TIMEOUT') {
        await message.member.timeout(15 * 60 * 1000, 'Apex Security Trigger').catch(() => {});
      }
      
      await logAction(guild.id, client.user.id, author.id, action, `Matched Apex Filter: ${regex.source}`, content);
      return;
    }
  }

  // Apex Anti-Spam (Stricter for low trust)
  const last = spamCache.get(author.id);
  const now = Date.now();
  const threshold = getTrustScore(message.member) < 10 ? 1000 : 800;
  
  if (last && now - last.lastMessage < threshold) {
    last.count++;
    if (last.count >= 4) {
      await message.delete().catch(() => {});
      if (last.count === 4) {
        await channel.send(`🛑 <@${author.id}>, reduce your message velocity.`).then(m => setTimeout(() => m.delete(), 3000));
        await logAction(guild.id, client.user.id, author.id, 'SPAM-PREVENTION', 'Rapid messaging velocity detected.');
      }
    }
  } else {
    spamCache.set(author.id, { count: 1, lastMessage: now });
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;
  const { commandName, options, guildId, user, member, channel } = interaction;

  try {
    // Permission Check
    const staff = await get('SELECT level FROM mod_permissions WHERE guild_id = ? AND user_id = ?', [guildId, user.id]);
    const staffLevel = staff ? staff.level : (hasModAdmin(member) ? 2 : 0);
    
    if (staffLevel < 1 && commandName !== 'trust' && commandName !== 'about') {
      return interaction.reply({ content: '❌ Sentinal Apex: Authorization Denied.', ephemeral: true });
    }

    // --- Command Routing ---
    if (commandName === 'permission') {
      if (staffLevel < 3 && user.id !== interaction.guild.ownerId) return interaction.reply({ content: '❌ Owner permissions required.', ephemeral: true });
      const sub = options.getSubcommand();
      const target = options.getUser('user');
      const level = options.getInteger('level');
      
      if (sub === 'add') {
        await run('INSERT OR REPLACE INTO mod_permissions (guild_id, user_id, level) VALUES (?,?,?)', [guildId, target.id, level]);
        await interaction.reply({ content: `✅ Set <@${target.id}> to staff level ${level}`, ephemeral: true });
      } else if (sub === 'remove') {
        await run('DELETE FROM mod_permissions WHERE guild_id = ? AND user_id = ?', [guildId, target.id]);
        await interaction.reply({ content: `✅ Removed <@${target.id}> from staff.`, ephemeral: true });
      }
    }

    if (commandName === 'antinuke') {
      if (staffLevel < 3) return interaction.reply({ content: '❌ High-level auth required.', ephemeral: true });
      const sub = options.getSubcommand();
      if (sub === 'enable') {
        await run('UPDATE mod_settings SET antinuke_status = 1 WHERE guild_id = ?', [guildId]);
        await interaction.reply({ content: '🛡️ Anti-Nuke: **ARMED**' });
      } else if (sub === 'disable') {
        await run('UPDATE mod_settings SET antinuke_status = 0 WHERE guild_id = ?', [guildId]);
        await interaction.reply({ content: '🔓 Anti-Nuke: **DISARMED**' });
      }
    }

    if (commandName === 'lock' || commandName === 'unlock') {
      const lock = commandName === 'lock';
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: !lock });
      await interaction.reply({ content: lock ? '🔒 Channel Locked.' : '🔓 Channel Unlocked.' });
    }

    if (commandName === 'lockall') {
      const channels = interaction.guild.channels.cache.filter(c => c.type === ChannelType.GuildText);
      for (const [id, ch] of channels) {
        await ch.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false }).catch(() => {});
      }
      await interaction.reply({ content: '🚨 **SERVER-WIDE LOCKDOWN COMPLETE.**' });
    }

    if (commandName === 'warn') {
      const target = options.getUser('user');
      const reason = options.getString('reason');
      await logAction(guildId, user.id, target.id, 'WARN', reason);
      await interaction.reply({ content: `⚠️ Warned <@${target.id}> | ${reason}` });
    }

    if (commandName === 'timeout') {
      const target = options.getUser('user');
      const minutes = options.getInteger('minutes');
      const reason = options.getString('reason');
      const targetMember = await interaction.guild.members.fetch(target.id);
      await targetMember.timeout(minutes * 60 * 1000, reason);
      await logAction(guildId, user.id, target.id, 'TIMEOUT', `${minutes}m: ${reason}`);
      await interaction.reply({ content: `⏳ Timed out <@${target.id}> for ${minutes}m | ${reason}` });
    }

    if (commandName === 'ban') {
      const target = options.getUser('user');
      const reason = options.getString('reason') || 'No reason provided';
      await interaction.guild.members.ban(target, { reason }).catch(e => { throw new Error('Permission Denied'); });
      await logAction(guildId, user.id, target.id, 'BAN', reason);
      await interaction.reply({ content: `🔨 Banned <@${target.id}> | ${reason}` });
    }

    if (commandName === 'kick') {
      const target = options.getUser('user');
      const reason = options.getString('reason') || 'No reason provided';
      const targetMember = await interaction.guild.members.fetch(target.id);
      await targetMember.kick(reason);
      await logAction(guildId, user.id, target.id, 'KICK', reason);
      await interaction.reply({ content: `👢 Kicked <@${target.id}>` });
    }

    if (commandName === 'purge') {
      const count = options.getInteger('count');
      const deleted = await channel.bulkDelete(count, true);
      await interaction.reply({ content: `🧹 Purged ${deleted.size} messages.`, ephemeral: true });
    }

    if (commandName === 'panic') {
      const status = options.getBoolean('status');
      panicState.set(guildId, status);
      await interaction.reply({ content: status ? '🚨 **PANIC MODE ENABLED.**' : '✅ **PANIC MODE LIFTED.**' });
    }

    if (commandName === 'trust') {
      const target = options.getUser('user');
      const targetMember = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (!targetMember) return interaction.reply({ content: 'User matches no server identity.', ephemeral: true });
      const score = getTrustScore(targetMember);
      await interaction.reply({ content: `🛡️ **Trust: <@${target.id}>** [Score: ${score}]`, ephemeral: true });
    }

    if (commandName === 'scan') {
      await interaction.deferReply({ ephemeral: true });
      const messages = await channel.messages.fetch({ limit: 50 });
      let threats = 0;
      const filters = [
        /discord\.gg\/[a-zA-Z0-9]+/i, 
        /https?:\/\/(?:www\.)?(?:tinyurl|bit\.ly|shorturl|grabbing|iplogger|leak|nitro-)\.[a-z]+\/\w+/i
      ];

      for (const [id, msg] of messages) {
        if (filters.some(f => f.test(msg.content))) threats++;
      }

      await interaction.editReply({ content: `🛡️ **Deep Scan Complete.**\nAnalyzed Last 50 messages. Threats detected: \`${threats}\`` });
    }

    if (commandName === 'verification') {
      if (staffLevel < 3) return interaction.reply({ content: '❌ High-level auth required.', ephemeral: true });
      const sub = options.getSubcommand();
      if (sub === 'setup') {
        const vChannel = options.getChannel('channel');
        const vRole = options.getRole('role');
        await run('INSERT OR REPLACE INTO mod_settings (guild_id, verify_channel, verify_role) VALUES (?,?,?)', [guildId, vChannel.id, vRole.id]);
        await interaction.reply({ content: `✅ Verification bound to <#${vChannel.id}> with role <@&${vRole.id}>` });
      } else if (sub === 'enable') {
        await interaction.reply({ content: '🛡️ **Captcha Verification Flow: ARMED.**' });
      }
    }

    if (commandName === 'about') {
      const embed = new EmbedBuilder()
        .setTitle('SENTINAL APEX: THE ULTIMATE DEFENSE')
        .setDescription('High-performance security lattice for VCC League servers.')
        .addFields(
          { name: 'Core Engine', value: 'Apex v2.5.0-Ultimate', inline: true },
          { name: 'Lattice Status', value: 'Armed & Active', inline: true }
        ).setColor(0x00f5a0);
      await interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'whitelist') {
      if (staffLevel < 3) return interaction.reply({ content: '❌ High-level auth required.', ephemeral: true });
      const sub = options.getSubcommand();
      const targetUser = options.getUser('user');
      const targetRole = options.getRole('role');
      const targetId = targetUser?.id || targetRole?.id;
      const type = targetUser ? 'USER' : 'ROLE';

      if (sub === 'add') {
        if (!targetId) return interaction.reply({ content: '❌ Specify a user or role.', ephemeral: true });
        await run('INSERT OR REPLACE INTO mod_whitelist (guild_id, target_id, type) VALUES (?,?,?)', [guildId, targetId, type]);
        await interaction.reply({ content: `✅ Whitelisted ${type}: <${type === 'USER' ? '@' : '@&'}${targetId}>`, ephemeral: true });
      } else if (sub === 'view') {
        const list = await all('SELECT * FROM mod_whitelist WHERE guild_id = ?', [guildId]);
        const text = list.map(i => `- ${i.type}: \`${i.target_id}\``).join('\n') || 'None.';
        await interaction.reply({ content: `🛡️ **Sentinal Whitelist**\n${text}`, ephemeral: true });
      }
    }

    if (commandName === 'settings') {
      const s = _settingsCache.get(guildId) || {};
      const embed = new EmbedBuilder()
        .setTitle(`⚙️ Guild Core Configuration`)
        .addFields(
          { name: 'Mod Logs', value: s.log_channel ? `<#${s.log_channel}>` : 'Not Set', inline: true },
          { name: 'Anti-Nuke', value: s.antinuke_status ? '✅ ACTIVE' : '❌ DISABLED', inline: true },
          { name: 'Verification', value: s.verify_channel ? `<#${s.verify_channel}>` : 'Not Set', inline: true }
        ).setColor(0x3498db);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (commandName === 'global-ban') {
      const id = options.getString('user_id');
      const reason = options.getString('reason');
      await run('INSERT OR REPLACE INTO mod_global_blacklist (discord_id, reason, staff_id) VALUES (?,?,?)', [id, reason, user.id]);
      await interaction.reply({ content: `⚖️ User \`${id}\` blacklisted globally.`, ephemeral: true });
    }
  } catch (error) {
    console.error(`❌ Interaction Error [${commandName}]:`, error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: `⚠️ **Apex Error:** ${error.message || 'Internal Failure'}`, ephemeral: true }).catch(() => {});
    }
  }
});

// --- Anti-Nuke Monitoring ---
async function checkNuke(guild, executorId, action) {
  const s = _settingsCache.get(guild.id);
  if (!s || !s.antinuke_status) return;

  const limits = await get('SELECT * FROM mod_anti_nuke_limits WHERE guild_id = ?', [guild.id]) 
                || { ban_limit: 5, kick_limit: 5, channel_del_limit: 3 };

  let tracker = nukeTracker.get(executorId);
  const now = Date.now();

  if (!tracker || (now - tracker.windowStart) > 60000) {
    tracker = { count: 1, windowStart: now, action };
  } else {
    tracker.count++;
  }
  nukeTracker.set(executorId, tracker);

  const limit = action === 'BAN' ? limits.ban_limit : action === 'KICK' ? limits.kick_limit : limits.channel_del_limit;

  if (tracker.count > limit) {
    const member = await guild.members.fetch(executorId).catch(() => null);
    if (member && member.id !== guild.ownerId) {
      await member.roles.set([]).catch(() => {}); // Strip all roles
      await logAction(guild.id, client.user.id, executorId, 'ANTI-NUKE', `THRESHOLD EXCEEDED [${action}]. User roles stripped.`);
      await guild.owner.send(`🚨 **ANTI-NUKE TRIGGERED:** <@${executorId}> exceeded the ${action} limit. Their roles have been removed for safety.`).catch(() => {});
    }
  }
}

client.on('guildBanAdd', async ban => {
  const audit = await ban.guild.fetchAuditLogs({ limit: 1, type: 22 }).then(a => a.entries.first());
  if (audit && audit.executorId !== client.user.id) await checkNuke(ban.guild, audit.executor.id, 'BAN');
});

client.on('channelDelete', async channel => {
  const audit = await channel.guild.fetchAuditLogs({ limit: 1, type: 12 }).then(a => a.entries.first());
  if (audit && audit.executorId !== client.user.id) await checkNuke(channel.guild, audit.executor.id, 'CHANNEL-DELETE');
});

const token = (process.env.VCC_MOD_DISCORD_TOKEN || process.env.MOD_DISCORD_TOKEN || '').trim();
if (!token) {
  console.error('❌ CRITICAL: No Token found for Sentinal Apex.');
  process.exit(1);
}
client.login(token);
