/**
 * Sentinal — Ultra-Advanced Moderation Bot (No-AI)
 * High-performance, deterministic enforcement system.
 */

require('dotenv').config({ path: '.env.mod' });
const { 
  Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
  ButtonBuilder, ButtonStyle, PermissionFlagsBits, Collection 
} = require('discord.js');
const { createClient } = require('@libsql/client');
const http = require('http');

// --- Virtual Port Binding (for Render) ---
const PORT = process.env.PORT || 10001;
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Sentinal Online\n');
}).listen(PORT);

// --- Database Configuration ---
const db = createClient({
  url: process.env.MOD_TURSO_URL,
  authToken: process.env.MOD_TURSO_TOKEN,
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
const spamCache = new Collection(); // user_id -> { count, lastMessage }
const raidCache = { count: 0, lastJoin: Date.now(), locked: false };
const _settingsCache = new Collection(); // guild_id -> settings

async function loadSettings(guildId) {
  try {
    const s = await get('SELECT * FROM mod_settings WHERE guild_id = ?', [guildId]);
    if (s) _settingsCache.set(guildId, s);
  } catch (e) { console.error('[loadSettings]', e.message); }
}

function getSetting(guildId, key) {
  return _settingsCache.get(guildId)?.[key] ?? null;
}

// --- Bot Client ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent, 
    GatewayIntentBits.GuildMembers,
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
        .setTitle(`🛡️ Sentinal Action: ${action.toUpperCase()}`)
        .addFields(
          { name: 'Target', value: `<@${targetId}>`, inline: true },
          { name: 'Moderator', value: `<@${moderatorId}>`, inline: true },
          { name: 'Reason', value: reason }
        )
        .setColor(action === 'ban' ? 0xff0000 : action === 'timeout' ? 0xffa500 : 0x5865f2)
        .setTimestamp();
      if (evidence) embed.addFields({ name: 'Evidence', value: evidence.slice(0, 1024) });
      await channel.send({ embeds: [embed] });
    }
  }
}

async function addInfraction(userId) {
  await run('INSERT INTO mod_infractions (discord_id, count, last_infraction) VALUES (?, 1, CURRENT_TIMESTAMP) ON CONFLICT(discord_id) DO UPDATE SET count = count + 1, last_infraction = CURRENT_TIMESTAMP', [userId]);
  const inf = await get('SELECT count FROM mod_infractions WHERE discord_id = ?', [userId]);
  return inf.count;
}

// --- Event Handlers ---
client.on('ready', async () => {
  console.log(`🛡️ Sentinal Active as ${client.user.tag}`);
  // Initial settings load for known guilds
  for (const guild of client.guilds.cache.values()) {
    await loadSettings(guild.id);
  }
});

client.on('guildMemberAdd', async member => {
  const guildId = member.guild.id;
  
  // --- Raid Shield ---
  const now = Date.now();
  if (now - raidCache.lastJoin < 2000) { // Joins within 2 seconds
    raidCache.count++;
  } else {
    raidCache.count = 0;
  }
  raidCache.lastJoin = now;

  if (raidCache.count >= 5 && !raidCache.locked) { // More than 5 rapid joins
    raidCache.locked = true;
    await logAction(guildId, client.user.id, 'SERVER', 'LOCKDOWN', 'Raid velocity detected.');
    await member.guild.setVerificationLevel(4).catch(() => {}); // Highest
  }

  // --- Role Persistence ---
  const inf = await get('SELECT count FROM mod_infractions WHERE discord_id = ?', [member.id]);
  if (inf && inf.count >= 5) {
     // If they re-join with 5+ infractions, tag staff
     await logAction(guildId, client.user.id, member.id, 'ALERT', 'Repeat offender rejoined with high infraction count.');
  }
  
  // Cross-server Blacklist Check
  const blacklisted = await get('SELECT * FROM mod_global_blacklist WHERE discord_id = ?', [member.id]);
  if (blacklisted) {
    await member.ban({ reason: `Global Blacklist: ${blacklisted.reason}` }).catch(() => {});
    await logAction(guildId, client.user.id, member.id, 'GLOBAL-BAN', `Automatically removed blacklisted user: ${blacklisted.reason}`);
  }
});

client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;
  const { author, content, guild, channel } = message;

  // --- Regex Guard (No-AI Filtering) ---
  const filters = [
    /\b(n[i1]gg[e3]r|n[i1]gg[a4]|f[a4]gg[o0]t|k[y3]s|n[a4]z[i1])\b/i, // Basic Slurs + Leetspeak
    /discord\.gg\/[a-zA-Z0-9]+/i, // Invites
    /https?:\/\/(?:www\.)?(?:tinyurl|bit\.ly|shorturl)\.[a-z]+\/\w+/i // Shortlinks
  ];

  for (const regex of filters) {
    if (regex.test(content)) {
      await message.delete().catch(() => {});
      const count = await addInfraction(author.id);
      
      const reason = `Filtered word/link detection (#${count})`;
      if (count >= 3) {
        await message.member.timeout(10 * 60 * 1000, reason).catch(() => {});
        await logAction(guild.id, client.user.id, author.id, 'AUTO-TIMEOUT', reason, content);
      } else {
        await logAction(guild.id, client.user.id, author.id, 'AUTO-WARN', reason, content);
        await channel.send(`⚠️ <@${author.id}>, please follow the rules. Deleted message matches filter.`).then(m => setTimeout(() => m.delete(), 5000));
      }
      return;
    }
  }

  // --- Anti-Spam ---
  const last = spamCache.get(author.id);
  const now = Date.now();
  if (last && now - last.lastMessage < 1500) {
    last.count++;
    if (last.count >= 5) {
      await message.delete().catch(() => {});
      if (last.count === 5) {
        await channel.send(`🛑 <@${author.id}>, stop spamming!`).then(m => setTimeout(() => m.delete(), 3000));
        await logAction(guild.id, client.user.id, author.id, 'SPAM-WARNING', 'Rapid messaging detected.');
      }
    }
  } else {
    spamCache.set(author.id, { count: 1, lastMessage: now });
  }
});

// --- Interaction Handler ---
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName, options, guildId, user, member } = interaction;

  if (commandName === 'warn') {
    const target = options.getUser('user');
    const reason = options.getString('reason');
    const count = await addInfraction(target.id);
    await logAction(guildId, user.id, target.id, 'WARN', `${reason} (Total: ${count})`);
    await interaction.reply({ content: `✅ Warned <@${target.id}>. Total infractions: ${count}`, ephemeral: true });
    try { await target.send(`⚠️ You have been warned in **${interaction.guild.name}** for: ${reason}`); } catch(e){}
  }

  if (commandName === 'timeout') {
    const target = options.getMember('user');
    const mins = options.getInteger('minutes');
    const reason = options.getString('reason');
    if (!target) return interaction.reply({ content: 'User not found in this server.', ephemeral: true });
    
    await target.timeout(mins * 60 * 1000, reason);
    await logAction(guildId, user.id, target.id, 'TIMEOUT', `${mins}m | ${reason}`);
    await interaction.reply({ content: `⏳ Timed out <@${target.id}> for ${mins} minutes.`, ephemeral: true });
  }

  if (commandName === 'purge') {
    const count = options.getInteger('count');
    const deleted = await interaction.channel.bulkDelete(count, true);
    await logAction(guildId, user.id, 'CHAT', 'PURGE', `Deleted ${deleted.size} messages.`);
    await interaction.reply({ content: `🧹 Deleted ${deleted.size} messages.`, ephemeral: true });
  }

  if (commandName === 'set-log-channel') {
    const channel = options.getChannel('channel');
    await run('INSERT OR REPLACE INTO mod_settings (guild_id, log_channel) VALUES (?,?)', [guildId, channel.id]);
    await loadSettings(guildId);
    await interaction.reply({ content: `⚙️ Sentinal logs set to <#${channel.id}>`, ephemeral: true });
  }

  if (commandName === 'global-ban') {
    const id = options.getString('user_id');
    const reason = options.getString('reason');
    await run('INSERT INTO mod_global_blacklist (discord_id, reason, staff_id) VALUES (?,?,?)', [id, reason, user.id]);
    await interaction.reply({ content: `⚖️ User \`${id}\` has been globally blacklisted across all VBLL servers.`, ephemeral: true });
  }
});

client.login(process.env.MOD_DISCORD_TOKEN);
