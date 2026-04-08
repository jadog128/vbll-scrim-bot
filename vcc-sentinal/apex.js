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
    new SlashCommandBuilder().setName('warn').setDescription('Warn a user').addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(true)),
    new SlashCommandBuilder().setName('timeout').setDescription('Timeout a user').addUserOption(o => o.setName('user').setDescription('Target member').setRequired(true)).addIntegerOption(o => o.setName('minutes').setDescription('Duration').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(true)),
    new SlashCommandBuilder().setName('purge').setDescription('Purge messages').addIntegerOption(o => o.setName('count').setDescription('Number of messages').setRequired(true).setMinValue(1).setMaxValue(100)),
    new SlashCommandBuilder().setName('set-log-channel').setDescription('Set mod log channel').addChannelOption(o => o.setName('channel').setDescription('Select channel').setRequired(true)),
    new SlashCommandBuilder().setName('global-ban').setDescription('Apply global blacklist').addStringOption(o => o.setName('user_id').setDescription('Target user ID').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(true)),
    new SlashCommandBuilder().setName('panic').setDescription('LOCKDOWN/UNLOCK currently active channel').addBooleanOption(o => o.setName('status').setDescription('Enable Lockdown').setRequired(true)),
    new SlashCommandBuilder().setName('trust').setDescription('Check user trust score').addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true)),
  ].map(c => c.toJSON());

  const token = (process.env.VCC_MOD_DISCORD_TOKEN || process.env.MOD_DISCORD_TOKEN || '').trim();
  const clientId = (process.env.VCC_MOD_CLIENT_ID || process.env.MOD_CLIENT_ID || '').trim();

  const rest = new REST({ version: '10' }).setToken(token);
  try {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log(`✅ Registered ${commands.length} Apex commands.`);
  } catch (e) { console.error('❌ Registration Failed:', e); }
}

client.on('ready', async () => {
  console.log(`🛡️ Sentinal Apex Active: ${client.user.tag}`);
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

  // 3. Global Blacklist
  const blacklisted = await get('SELECT * FROM mod_global_blacklist WHERE discord_id = ?', [member.id]);
  if (blacklisted) {
    await member.ban({ reason: `Sentinal Apex: Global Blacklist Match (${blacklisted.reason})` }).catch(() => {});
    await logAction(guildId, client.user.id, member.id, 'GLOBAL-BAN', `Intercepted blacklisted user: ${blacklisted.reason}`);
  }
});

client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;
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

  if (!hasModAdmin(member)) {
    return interaction.reply({ content: '❌ Sentinal Apex: Authorization Denied.', ephemeral: true });
  }

  if (commandName === 'panic') {
    const status = options.getBoolean('status');
    panicState.set(guildId, status);
    
    // Lockdown current channel permissions
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
      SendMessages: !status
    }).catch(() => {});

    await logAction(guildId, user.id, 'CHANNEL', 'PANIC', status ? 'LOCKDOWN ENABLED' : 'LOCKDOWN LIFTED');
    await interaction.reply({ content: status ? '🚨 **PANIC MODE ENABLED.** Current channel locked to non-staff.' : '✅ **PANIC MODE LIFTED.**' });
  }

  if (commandName === 'trust') {
    const target = options.getUser('user');
    const targetMember = await interaction.guild.members.fetch(target.id);
    const score = getTrustScore(targetMember);
    await interaction.reply({ content: `🛡️ **Trust Report: <@${target.id}>**\n- Score: \`${score}\`\n- Status: ${score > 20 ? '✅ Trusted' : score > 5 ? '🔶 Neutral' : '⚠️ Suspicious'}`, ephemeral: true });
  }

  // ... (Other standard commands follow the same pattern: warn, timeout, purge, etc.)
  if (commandName === 'warn') {
    const target = options.getUser('user');
    const reason = options.getString('reason');
    await logAction(guildId, user.id, target.id, 'WARN', reason);
    await interaction.reply({ content: `✅ Warned <@${target.id}>.`, ephemeral: true });
  }

  if (commandName === 'timeout') {
    const target = options.getMember('user');
    const mins = options.getInteger('minutes');
    const reason = options.getString('reason');
    await target.timeout(mins * 60 * 1000, reason).catch(() => {});
    await logAction(guildId, user.id, target.id, 'TIMEOUT', `${mins}m | ${reason}`);
    await interaction.reply({ content: `⏳ Timed out <@${target.id}> for ${mins}m.`, ephemeral: true });
  }

  if (commandName === 'purge') {
    const count = options.getInteger('count');
    const deleted = await channel.bulkDelete(count, true);
    await logAction(guildId, user.id, 'CHAT', 'PURGE', `Deleted ${deleted.size} messages.`);
    await interaction.reply({ content: `🧹 Purged ${deleted.size} messages.`, ephemeral: true });
  }

  if (commandName === 'set-log-channel') {
    const ch = options.getChannel('channel');
    await run('INSERT OR REPLACE INTO mod_settings (guild_id, log_channel) VALUES (?,?)', [guildId, ch.id]);
    await loadSettings(guildId);
    await interaction.reply({ content: `⚙️ Apex logs set to <#${ch.id}>`, ephemeral: true });
  }

  if (commandName === 'global-ban') {
    const id = options.getString('user_id');
    const reason = options.getString('reason');
    await run('INSERT INTO mod_global_blacklist (discord_id, reason, staff_id) VALUES (?,?,?)', [id, reason, user.id]);
    await interaction.reply({ content: `⚖️ User \`${id}\` blacklisted globally.`, ephemeral: true });
  }
});

const token = (process.env.VCC_MOD_DISCORD_TOKEN || process.env.MOD_DISCORD_TOKEN || '').trim();
if (!token) {
  console.error('❌ CRITICAL: No Token found for Sentinal Apex.');
  process.exit(1);
}
client.login(token);
