// ============================================================
// VRDL Scrim Bot — Turso Edition
// ============================================================
// Try to load local env file if it exists, otherwise use standard env (for production)
require('dotenv').config();
require('dotenv').config({ path: '.env.scrim' });

const {
  Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, RESTJSONErrorCodes,
  ModalBuilder, TextInputBuilder, TextInputStyle
} = require('discord.js');
const { createClient } = require('@libsql/client');

const turso = createClient({
  url: process.env.SCRIM_TURSO_URL,
  authToken: process.env.SCRIM_TURSO_TOKEN,
});

// Validate Env (for Render debugging)
if (!process.env.SCRIM_TURSO_URL) console.error('⚠️ SCRIM_TURSO_URL is missing from environment variables!');
if (!process.env.SCRIM_DISCORD_TOKEN) console.error('⚠️ SCRIM_DISCORD_TOKEN is missing from environment variables!');

// Health check server for Render (satisfies port check)
const http = require('http');
const port = process.env.PORT || 10000;
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Bot is running!');
}).listen(port, () => console.log(`🚀 Health check server listening on port ${port}`));

async function run(sql, p = []) { return await turso.execute({ sql, args: p }); }
async function get(sql, p = []) {
  const r = await turso.execute({ sql, args: p });
  if (!r.rows.length) return null;
  return Object.fromEntries(r.columns.map((c, i) => [c, r.rows[0][i]]));
}
async function all(sql, p = []) {
  const r = await turso.execute({ sql, args: p });
  return r.rows.map(row => Object.fromEntries(r.columns.map((c, i) => [c, row[i]])));
}

let _settings = {};
function getSetting(k) { return _settings[k] ?? null; }
async function setSetting(k, v) {
  _settings[k] = v;
  await run('INSERT OR REPLACE INTO scrim_settings (key,value) VALUES(?,?)', [k, v]);
}
async function loadSettings() {
  try {
    const rows = await all('SELECT "key", "value" FROM scrim_settings');
    for (const r of rows) _settings[r.key] = r.value;
  } catch (e) {
    console.error('[loadSettings] Database error:', e.message);
  }
}

async function initDB() {
  const tables = [
    'CREATE TABLE IF NOT EXISTS scrim_points (discord_id TEXT PRIMARY KEY, username TEXT, points INTEGER DEFAULT 0)',
    'CREATE TABLE IF NOT EXISTS scrim_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, discord_id TEXT, username TEXT, amount INTEGER, description TEXT, proof_url TEXT, status TEXT DEFAULT "pending", reviewer_id TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)',
    'CREATE TABLE IF NOT EXISTS scrim_shop (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, description TEXT, cost INTEGER, stock INTEGER DEFAULT -1, active INTEGER DEFAULT 1)',
    'CREATE TABLE IF NOT EXISTS scrim_redemptions (id INTEGER PRIMARY KEY AUTOINCREMENT, discord_id TEXT, username TEXT, item_id INTEGER, item_name TEXT, cost INTEGER, status TEXT DEFAULT "pending", reviewer_id TEXT, public_id TEXT, player_game_id TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)',
    'CREATE TABLE IF NOT EXISTS scrim_settings (key TEXT PRIMARY KEY, value TEXT)',
    'CREATE TABLE IF NOT EXISTS scrim_penalty_stats (discord_id TEXT PRIMARY KEY, username TEXT, total_goals INTEGER DEFAULT 0, total_shots INTEGER DEFAULT 0, current_level INTEGER DEFAULT 1, best_level INTEGER DEFAULT 1, penalty_points INTEGER DEFAULT 0)',
    'CREATE TABLE IF NOT EXISTS scrim_upcoming (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, time TEXT, reward INTEGER, active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)',
    'CREATE TABLE IF NOT EXISTS scrim_participants (scrim_id INTEGER, discord_id TEXT, username TEXT, PRIMARY KEY(scrim_id, discord_id))'
  ];

  console.log(`[initDB] 🔌 Connecting to database...`);
  for (const t of tables) { 
    try { 
      await run(t); 
    } catch (e) { 
      console.error('[initDB] ❌ TABLE FAILED:', e.message);
      if (e.message.includes('400')) {
         console.error(' [initDB] 💡 TIP: This usually means your SCRIM_TURSO_URL or TOKEN is wrong on Render.');
         break; // Stop if it's a 400 as it won't work
      }
    } 
  }

  // Add columns for existing databases
  try { await run('ALTER TABLE scrim_redemptions ADD COLUMN public_id TEXT'); }
  catch (e) { if (!e.message.includes('duplicate column name')) console.warn('[initDB alter]', e.message); }
  try { await run('ALTER TABLE scrim_redemptions ADD COLUMN player_game_id TEXT'); }
  catch (e) { if (!e.message.includes('duplicate column name')) console.warn('[initDB alter]', e.message); }

  for (const [k, v] of [['review_channel', ''], ['redemption_channel', ''], ['log_channel', ''], ['fulfilment_channel', ''], ['batch_request_channel', ''], ['audit_log_channel', ''], ['audit_log_verbose', 'false'], ['shop_alert_channel', '']]) {
    try { await run(`INSERT OR IGNORE INTO scrim_settings (key,value) VALUES(?,?)`, [k, v]); } catch (_) { }
  }

  try {
    await loadSettings();
    console.log('✅ Database and Settings ready.');
  } catch (e) {
    console.error('❌ Failed to load settings from DB:', e);
  }
}

const MOD_ROLE_ID = '1437082293725429842';
const ADMIN_ROLE_ID = '1288222067178868798';

function hasMod(member) {
  if (member.permissions.has('Administrator')) return true;
  return member.roles.cache.has(MOD_ROLE_ID) || member.roles.cache.has(ADMIN_ROLE_ID);
}

function hasAdmin(member) {
  if (member.permissions.has('Administrator')) return true;
  return member.roles.cache.has(ADMIN_ROLE_ID);
}

async function ensurePlayer(id, username) {
  await run('INSERT OR IGNORE INTO scrim_points (discord_id, username, points) VALUES (?,?,0)', [id, username]);
  await run('UPDATE scrim_points SET username=? WHERE discord_id=?', [username, id]);
}
async function getPoints(id) {
  const row = await get('SELECT points FROM scrim_points WHERE discord_id=?', [id]);
  return row ? Number(row.points) : 0;
}
async function addPoints(id, username, amount) {
  await ensurePlayer(id, username);
  const current = await getPoints(id);
  const newVal = current + Number(amount);
  console.log(`[addPoints] ${username}(${id}): ${current} + ${amount} = ${newVal}`);
  await run('UPDATE scrim_points SET points = ? WHERE discord_id=?', [newVal, id]);
}
async function removePoints(id, amount) {
  const current = await getPoints(id);
  const newVal = Math.max(0, current - Number(amount));
  console.log(`[removePoints] ${id}: ${current} - ${amount} = ${newVal}`);
  await run('UPDATE scrim_points SET points = ? WHERE discord_id=?', [newVal, id]);
}

// ── Penalty game ────────────────────────────────────────────────────────────────
const PENALTY_ENABLED = true; // Set to false to disable
const PENALTY_SPOTS = ['tl', 'tc', 'tr', 'bl', 'bc', 'br'];
const PENALTY_LABELS = {
  tl: '\u2196\ufe0f Top Left',
  tc: '\u2b06\ufe0f Top Center',
  tr: '\u2197\ufe0f Top Right',
  bl: '\u2199\ufe0f Bottom Left',
  bc: '\u2b07\ufe0f Bottom Center',
  br: '\u2198\ufe0f Bottom Right',
};
const PENALTY_LEVEL_BAR = ['\u2b1c', '\u2b1c', '\u2b1c', '\u2b1c', '\u2b1c'];

async function ensurePenaltyPlayer(id, username) {
  await run('INSERT OR IGNORE INTO scrim_penalty_stats (discord_id, username) VALUES (?,?)', [id, username]);
  await run('UPDATE scrim_penalty_stats SET username=? WHERE discord_id=?', [username, id]);
}
async function getPenaltyStats(id) {
  return await get('SELECT * FROM scrim_penalty_stats WHERE discord_id=?', [id]);
}

// ── Hangman game ──────────────────────────────────────────────────────────────
const hangmanGames = new Map(); // gameId → state
const HANGMAN_MAX_WRONG = 6;
const HANGMAN_STAGES = [
  '  +---+\n  |   |\n      |\n      |\n      |\n      |\n=========',
  '  +---+\n  |   |\n  O   |\n      |\n      |\n      |\n=========',
  '  +---+\n  |   |\n  O   |\n  |   |\n      |\n      |\n=========',
  '  +---+\n  |   |\n  O   |\n /|   |\n      |\n      |\n=========',
  '  +---+\n  |   |\n  O   |\n /|\\  |\n      |\n      |\n=========',
  '  +---+\n  |   |\n  O   |\n /|\\  |\n /    |\n      |\n=========',
  '  +---+\n  |   |\n  O   |\n /|\\  |\n / \\  |\n      |\n=========',
];
const HANGMAN_WORDLIST = [
  'PYTHON', 'DISCORD', 'GAMING', 'SERVER', 'CHANNEL', 'ROCKET', 'STREAM', 'BATTLE',
  'VICTORY', 'PHANTOM', 'CRYSTAL', 'THUNDER', 'DRAGON', 'CASTLE', 'JUNGLE', 'FOREST',
  'PLANET', 'GALAXY', 'SHADOW', 'BRIDGE', 'GUITAR', 'ISLAND', 'JACKET', 'KNIGHT',
  'LEMON', 'MARBLE', 'NOBLE', 'ORANGE', 'PIRATE', 'QUEEN', 'RIVER', 'SILVER',
  'TEMPLE', 'UNIQUE', 'VIOLET', 'WINTER', 'YELLOW', 'ZOMBIE', 'ANCHOR', 'BRANCH',
  'CLOUD', 'DIVINE', 'EAGLE', 'FLAME', 'GRACE', 'HONEY', 'IVORY', 'JEWEL',
  'KITE', 'LANCE', 'MAGIC', 'NIGHT', 'OCEAN', 'PRIME', 'QUEST', 'RIDGE',
];
const HANGMAN_BANNED = [
  'nigger', 'niggers', 'nigga', 'niggas', 'faggot', 'faggots', 'chink', 'kike', 'spic',
  'wetback', 'cunt', 'spook', 'gook', 'cracker', 'honky', 'tranny', 'retard',
  'dyke', 'bastard', 'whore', 'slut',
];

function generateGameId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function isHangmanBanned(word) {
  const lower = word.toLowerCase();
  return HANGMAN_BANNED.some(b => lower.includes(b));
}

function buildHangmanEmbed(game, title = null) {
  const maxWrong = game.maxWrong ?? HANGMAN_MAX_WRONG;
  const stageIndex = Math.min(Math.round((game.wrong.length / maxWrong) * 6), 6);
  const stage = HANGMAN_STAGES[stageIndex];
  const wordDisplay = game.word
    ? '`' + game.word.split('').map(c => game.guessed.has(c) ? c : '_').join(' ') + '`'
    : '`(waiting for word...)`';
  const isWon = game.word && game.word.split('').every(c => game.guessed.has(c));
  const isLost = game.wrong.length >= maxWrong;
  const livesLeft = maxWrong - game.wrong.length;

  let heading = title || (isWon ? '🎉 You Win!' : isLost ? '💀 Game Over!' : '🪚 Hangman');
  const colour = isWon ? 0x00f5a0 : isLost ? 0xff4d4d : 0x5865f2;

  const embed = new EmbedBuilder()
    .setTitle(heading)
    .setColor(colour)
    .setDescription('```\n' + stage + '\n```')
    .addFields(
      { name: '📝 Word', value: wordDisplay, inline: false },
      { name: '❌ Wrong Guesses', value: game.wrong.length ? game.wrong.join('  ') : '*None yet*', inline: true },
      { name: '💔 Lives Left', value: `**${livesLeft}** / ${maxWrong}`, inline: true },
    );

  if (game.mode === 'multi') {
    const guesserList = game.players.filter(p => p.id !== game.wordSetterId).map(p => `<@${p.id}>`).join(', ');
    embed.addFields({ name: '👥 Guessers', value: guesserList || 'None', inline: false });
  }
  if (isLost || isWon) embed.addFields({ name: '💡 The word was', value: `**${game.word}**`, inline: false });
  return embed;
}

function buildHangmanComponents(game, disabled = false) {
  const maxWrong = game.maxWrong ?? HANGMAN_MAX_WRONG;
  const isOver = game.wrong.length >= maxWrong || (game.word && game.word.split('').every(c => game.guessed.has(c)));
  if (isOver || disabled) return [];
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`hangman_guess_${game.id}`).setLabel('🔤 Guess a Letter').setStyle(ButtonStyle.Primary).setDisabled(disabled),
      new ButtonBuilder().setCustomId(`hangman_giveup_${game.id}`).setLabel('🏳️ Give Up').setStyle(ButtonStyle.Danger).setDisabled(disabled),
    ),
  ];
}

function buildLobbyButtons(game) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`hangman_join_${game.id}`).setLabel('✋ Join').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`hangman_lives_${game.id}`).setLabel(`❤️ Lives: ${game.maxWrong}`).setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`hangman_start_${game.id}`).setLabel('▶️ Start Game').setStyle(ButtonStyle.Success),
  );
}

function buildEndComponents(game) {
  if (game.mode !== 'multi') return [];
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`hangman_playagain_${game.id}`).setLabel('🔄 Play Again (same players)').setStyle(ButtonStyle.Success),
  )];
}

// ── Tic-Tac-Toe ──────────────────────────────────────────────────────────────
const tttGames = new Map(); // gameId -> state

function buildTTTEmbed(game) {
  const p1 = `<@${game.players[0].id}> (❌)`;
  const p2 = game.players[1] ? `<@${game.players[1].id}> (⭕)` : '*Waiting for opponent...*';
  const turn = game.winner ? `🏆 Winner: <@${game.winner}>` : game.draw ? '🤝 The game is a draw!' : `🎮 Turn: <@${game.turn}>`;

  return new EmbedBuilder()
    .setTitle('❌ Tic-Tac-Toe ⭕')
    .setColor(game.winner ? 0x00f5a0 : 0x5865f2)
    .setDescription(`${p1} vs ${p2}\n\n${turn}`)
    .setFooter({ text: `Game ID: ${game.id}` });
}

function buildTTTBoard(game) {
  const rows = [];
  for (let i = 0; i < 3; i++) {
    const row = new ActionRowBuilder();
    for (let j = 0; j < 3; j++) {
      const idx = i * 3 + j;
      const val = game.board[idx];
      const btn = new ButtonBuilder()
        .setCustomId(`ttt_click_${game.id}_${idx}`)
        .setLabel(val === 'X' ? '❌' : val === 'O' ? '⭕' : '\u200b')
        .setStyle(val ? ButtonStyle.Secondary : ButtonStyle.Primary)
        .setDisabled(!!val || !!game.winner || !!game.draw);
      row.addComponents(btn);
    }
    rows.push(row);
  }
  return rows;
}

function checkTTTWinner(board) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
    [0, 4, 8], [2, 4, 6]          // diags
  ];
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  if (board.every(s => s !== null)) return 'draw';
  return null;
}

// ── Fast Fingers ──────────────────────────────────────────────────────────────
const fastFingersGames = new Map(); // gameId -> state
const FF_EMOJIS = ['🔥', '⚡', '🎲', '🍀', '💎', '🏆', '⚽', '🎮', '🏹', '⚔️', '🎭', '🎭', '🎨', '🍕', '🍔', '🥥', '🪐', '🌈'];

function buildFFEmbed(game, message = '') {
  const players = game.players.length ? game.players.map((p, i) => `${i + 1}. <@${p.id}>`).join('\n') : '*No players yet*';
  return new EmbedBuilder()
    .setTitle('⚡ Fast Fingers')
    .setColor(game.phase === 'playing' ? 0xffea00 : 0x5865f2)
    .setDescription(`${message}\n\n**Players In:**\n${players}`)
    .setFooter({ text: 'First one to click the matching emoji wins!' });
}

// ── Battleships ──────────────────────────────────────────────────────────────
const bsGames = new Map();

function generateBSShips() {
  const ships = [];
  const occupied = new Set();
  const sizes = [3, 2, 2];
  for (const size of sizes) {
    let placed = false;
    while (!placed) {
      const isHoriz = Math.random() < 0.5;
      const r = Math.floor(Math.random() * 5);
      const c = Math.floor(Math.random() * 5);
      const cells = [];
      let valid = true;
      for (let i = 0; i < size; i++) {
        const nr = r + (isHoriz ? 0 : i);
        const nc = c + (isHoriz ? i : 0);
        if (nr > 4 || nc > 4) { valid = false; break; }
        const idx = nr * 5 + nc;
        if (occupied.has(idx)) { valid = false; break; }
        cells.push(idx);
      }
      if (valid) {
        cells.forEach(idx => occupied.add(idx));
        ships.push({ size, cells, hits: [] });
        placed = true;
      }
    }
  }
  return { ships, occupied, shots: new Map() };
}

function buildBSEmbed(game) {
  let desc = `**Mode:** ${game.mode === 'multi' ? '👥 Multiplayer' : '👤 Solo'}\n\n`;
  if (game.phase === 'lobby') {
    desc += `Lobby created by <@${game.hostId}>. Waiting for an opponent...`;
  } else if (game.phase === 'playing') {
    desc += `**Turn:** <@${game.turn}>\n${game.lastMove || 'The battle begins!'}`;
  } else {
    desc += `**Game Over!**\n🏆 <@${game.winner}> emerged victorious!\n${game.lastMove || ''}`;
  }

  const embed = new EmbedBuilder()
    .setTitle('🚢 Battleships')
    .setColor(game.phase === 'ended' ? 0x00f5a0 : 0x5865f2)
    .setDescription(desc);

  if (game.players.length >= 1) {
    const p1 = game.players[0];
    const left = p1.ships.filter(s => s.hits.length < s.size).length;
    embed.addFields({ name: `🔵 ${p1.username}`, value: `Ships Left: ${left} / 3`, inline: true });
  }
  if (game.players.length >= 2) {
    const p2 = game.players[1];
    const name = p2.id === 'bot' ? '🤖 The Bot' : `🔴 ${p2.username}`;
    const left = p2.ships.filter(s => s.hits.length < s.size).length;
    embed.addFields({ name: name, value: `Ships Left: ${left} / 3`, inline: true });
  }
  return embed;
}

function buildBSMainComponents(game) {
  if (game.phase === 'lobby') {
    return [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`bs_join_${game.id}`).setLabel('✋ Join Game').setStyle(ButtonStyle.Success)
    )];
  }
  if (game.phase === 'ended') return [];

  if (game.mode === 'solo') {
    return buildBSEphemeralBoard(game, game.players[0].id, false);
  } else {
    return [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`bs_fireform_${game.id}_${game.players[0].id}`).setLabel('🔵 P1: Fire!').setStyle(ButtonStyle.Danger).setDisabled(game.turn !== game.players[0].id),
        new ButtonBuilder().setCustomId(`bs_fleet_${game.id}_${game.players[0].id}`).setLabel('🔵 View Fleet').setStyle(ButtonStyle.Secondary)
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`bs_fireform_${game.id}_${game.players[1].id}`).setLabel('🔴 P2: Fire!').setStyle(ButtonStyle.Danger).setDisabled(game.turn !== game.players[1].id),
        new ButtonBuilder().setCustomId(`bs_fleet_${game.id}_${game.players[1].id}`).setLabel('🔴 View Fleet').setStyle(ButtonStyle.Secondary)
      )
    ];
  }
}

function buildBSEphemeralBoard(game, shooterId, isEphemeral) {
  const rows = [];
  const shooter = game.players.find(p => p.id === shooterId);

  for (let r = 0; r < 5; r++) {
    const row = new ActionRowBuilder();
    for (let c = 0; c < 5; c++) {
      const idx = r * 5 + c;
      const status = shooter.shots.get(idx);
      let label = '\u200b';
      let style = ButtonStyle.Secondary;
      let disabled = false;
      if (status === 'hit') { label = '💥'; style = ButtonStyle.Danger; disabled = true; }
      else if (status === 'miss') { label = '💦'; style = ButtonStyle.Primary; disabled = true; }
      else if (game.phase !== 'playing' || game.turn !== shooterId) disabled = true;

      const btnId = isEphemeral ? `bs_ephemshoot_${game.id}_${idx}` : `bs_soloshoot_${game.id}_${idx}`;
      row.addComponents(
        new ButtonBuilder().setCustomId(btnId).setLabel(label || '\u200b').setStyle(style).setDisabled(disabled)
      );
    }
    rows.push(row);
  }
  return rows;
}
// ── Minesweeper ──────────────────────────────────────────────────────────────
const msGames = new Map(); // gameId -> state

function buildMSEmbed(game) {
  const isOver = game.phase === 'won' || game.phase === 'lost';
  const status = game.phase === 'won' ? '🎉 You cleared the minefield!' : game.phase === 'lost' ? '💀 KABOOM! You hit a mine.' : '💣 Avoid the mines!';
  const color = game.phase === 'won' ? 0x00f5a0 : game.phase === 'lost' ? 0xff4d4d : 0x5865f2;

  let desc = `**Mode:** ${game.mode === 'multi' ? '👥 Multiplayer' : '👤 Solo'}\n\n${status}`;
  if (game.mode === 'multi') {
    desc += `\n\n**Players:** ${game.players.map(p => `<@${p.id}>`).join(', ')}`;
    if (!isOver) desc += `\n**Turn:** <@${game.turn}>`;
  }

  return new EmbedBuilder()
    .setTitle('💣 Minesweeper')
    .setColor(color)
    .setDescription(desc)
    .setFooter({ text: `Mines: ${game.mineCount} | Flagged: ${game.flags.size}` });
}

function buildMSBoard(game) {
  const rows = [];
  const isOver = game.phase === 'won' || game.phase === 'lost';

  for (let r = 0; r < 4; r++) {
    const row = new ActionRowBuilder();
    for (let c = 0; c < 5; c++) {
      const idx = r * 5 + c;
      const isRevealed = game.revealed.has(idx);
      const isFlagged = game.flags.has(idx);
      const isMine = game.mines.has(idx);

      let label = '\u200b';
      let style = ButtonStyle.Primary;

      if (isRevealed) {
        if (isMine) {
          label = '💣';
          style = ButtonStyle.Danger;
        } else {
          const adj = game.board[idx];
          label = adj === 0 ? ' ' : String(adj);
          style = ButtonStyle.Secondary;
        }
      } else if (isFlagged) {
        label = '🚩';
        style = ButtonStyle.Success;
      }

      if (isOver && isMine && !isRevealed) label = '💣';

      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`ms_click_${game.id}_${idx}`)
          .setLabel(label)
          .setStyle(style)
          .setDisabled(isOver || isRevealed)
      );
    }
    rows.push(row);
  }

  // Add control row
  if (!isOver) {
    rows.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`ms_mode_${game.id}`)
        .setLabel(game.clickMode === 'dig' ? '⛏️ Dig Mode' : '🚩 Flag Mode')
        .setStyle(ButtonStyle.Secondary)
    ));
  }

  return rows;
}

async function postLog(client, embed) {
  try {
    const chId = getSetting('log_channel');
    if (!chId) return;
    const ch = await client.channels.fetch(chId).catch(() => null);
    if (ch) await ch.send({ embeds: [embed] });
  } catch (e) { console.warn('[postLog]', e.message); }
}

async function postAuditLog(client, interaction, extra = '') {
  try {
    const chId = getSetting('audit_log_channel');
    if (!chId) return;
    const verbose = getSetting('audit_log_verbose') === 'true';
    if (!verbose) return;
    const ch = await client.channels.fetch(chId).catch(() => null);
    if (!ch) return;

    let name = '❓ Unknown';
    if (interaction.isChatInputCommand()) name = '`/' + interaction.commandName + '`';
    else if (interaction.isStringSelectMenu()) name = '`[dropdown: ' + interaction.customId + ']`';
    else if (interaction.isButton()) name = '`[button: ' + interaction.customId + ']`';
    else if (interaction.isModalSubmit()) name = '`[modal: ' + interaction.customId + ']`';

    const embed = new EmbedBuilder()
      .setTitle('📋 Command Used')
      .setColor(0x5865f2)
      .addFields(
        { name: '👤 User', value: '<@' + interaction.user.id + '> (`' + interaction.user.username + '`)', inline: false },
        { name: '⚙️ Action', value: name + (extra ? '\n' + extra : ''), inline: false },
        { name: '📍 Channel', value: interaction.channel ? '<#' + interaction.channel.id + '>' : 'Unknown', inline: true },
        { name: '🕒 Time', value: '<t:' + Math.floor(Date.now() / 1000) + ':T>', inline: true },
      )
      .setThumbnail(interaction.user.displayAvatarURL())
      .setFooter({ text: 'VRDL Audit Log' })
      .setTimestamp();

    await ch.send({ embeds: [embed] });
  } catch (e) { console.warn('[postAuditLog]', e.message); }
}

async function defer(interaction, ephemeral = false) {
  try {
    if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ flags: ephemeral ? 64 : 0 });
    return true;
  } catch (e) { console.warn('[defer]', e.message); return false; }
}

async function generatePublicId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  let isUnique = false;
  while (!isUnique) {
    id = '';
    for (let i = 0; i < 5; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const existing = await get('SELECT id FROM scrim_redemptions WHERE public_id = ?', [id]);
    if (!existing) isUnique = true;
  }
  return id;
}

// ── Shared redeem logic ───────────────────────────────────────────────────────
async function processRedeem(client, interaction, itemId, playerGameId) {
  const item = await get('SELECT * FROM scrim_shop WHERE id=? AND active=1', [itemId]);

  // Both slash (/redeem, deferred) and select menu (deferred above) use editReply
  const reply = async (payload) => {
    try { await interaction.editReply(payload); } catch (e) { console.warn('[reply]', e.message); }
  };

  if (!item) { await reply({ content: '❌ Item not found or no longer available.' }); return; }

  const userPoints = await getPoints(interaction.user.id);
  if (userPoints < item.cost) {
    await reply({
      embeds: [new EmbedBuilder()
        .setTitle('❌ Not Enough Points').setColor(0xff4d4d)
        .setDescription('You don\'t have enough points for **' + item.name + '**!')
        .addFields(
          { name: '⭐ Item Cost', value: String(item.cost), inline: true },
          { name: '💰 Your Balance', value: String(userPoints), inline: true },
          { name: '📉 You Need', value: String(item.cost - userPoints) + ' more', inline: true },
        ).setFooter({ text: 'Keep winning scrims!' })]
    });
    return;
  }

  if (item.stock === 0) { await reply({ content: '❌ **' + item.name + '** is out of stock!' }); return; }

  const redemptionChannel = getSetting('redemption_channel');
  if (!redemptionChannel) { await reply({ content: '❌ No redemption channel set. Contact an admin.' }); return; }
  const ch = await client.channels.fetch(redemptionChannel).catch(() => null);
  if (!ch) { await reply({ content: '❌ Redemption channel not found. Contact an admin.' }); return; }

  await removePoints(interaction.user.id, item.cost);
  if (item.stock > 0) {
    const newStock = item.stock - 1;
    await run('UPDATE scrim_shop SET stock = ? WHERE id=?', [newStock, itemId]);

    // Low stock alert
    if (newStock <= 3 && newStock >= 0) {
      const alertChId = getSetting('shop_alert_channel') || getSetting('log_channel') || getSetting('redemption_channel');
      if (alertChId) {
        const alertCh = await client.channels.fetch(alertChId).catch(() => null);
        if (alertCh) {
          await alertCh.send({
            content: newStock === 0 ? `🚨 **OUT OF STOCK ALERT**: **${item.name}** is gone!` : `⚠️ **LOW STOCK ALERT**: **${item.name}** only has **${newStock}** left! **BUY QUICK!** 🏃💨`,
            embeds: [new EmbedBuilder()
              .setTitle(newStock === 0 ? '🚫 Item Sold Out' : '⚠️ Limited Stock Remaining')
              .setColor(newStock === 0 ? 0xff4d4d : 0xffa500)
              .setDescription(`${item.name}\n\n${item.description}`)
              .addFields({ name: '📉 Units Left', value: String(newStock), inline: true })
              .setFooter({ text: 'Don\'t miss out!' })
              .setTimestamp()]
          });
        }
      }
    }
  }

  const publicId = await generatePublicId();
  await run('INSERT INTO scrim_redemptions (discord_id, username, item_id, item_name, cost, public_id, player_game_id) VALUES (?,?,?,?,?,?,?)',
    [interaction.user.id, interaction.user.username, item.id, item.name, item.cost, publicId, playerGameId]);
  const red = await get('SELECT id FROM scrim_redemptions WHERE discord_id=? ORDER BY id DESC LIMIT 1', [interaction.user.id]);
  const redId = red?.id || '?';
  const newBal = await getPoints(interaction.user.id);

  const redemptionEmbed = new EmbedBuilder()
    .setTitle('🛍️ Item Redemption — #' + redId).setColor(0xe040fb)
    .setThumbnail(interaction.user.displayAvatarURL())
    .addFields(
      { name: '👤 Player', value: '<@' + interaction.user.id + '> (`' + interaction.user.username + '`)', inline: false },
      { name: '🆔 VRFS Player ID', value: '`' + playerGameId + '`', inline: false },
      { name: '🛍️ Item', value: item.name, inline: true },
      { name: '⭐ Cost', value: String(item.cost), inline: true },
      { name: '🔑 Order ID', value: '`' + publicId + '`', inline: true },
      { name: '📝 Details', value: item.description, inline: false },
    )
    .setFooter({ text: 'Redemption #' + redId + ' • Approve or Reject below' }).setTimestamp();

  await ch.send({
    embeds: [redemptionEmbed], components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('redeem_approve_' + redId).setLabel('✅  Fulfil Redemption').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('redeem_reject_' + redId).setLabel('❌  Reject & Refund').setStyle(ButtonStyle.Danger),
    )]
  });

  await reply({
    embeds: [new EmbedBuilder()
      .setTitle('🎉 Redemption Submitted!').setColor(0x00f5a0)
      .setDescription('Your redemption for **' + item.name + '** has been sent to management!')
      .addFields(
        { name: '⭐ Points Spent', value: String(item.cost), inline: true },
        { name: '💰 New Balance', value: String(newBal), inline: true },
        { name: '🔑 Order ID', value: '`' + publicId + '`', inline: true },
        { name: '🆔 VRFS Player ID', value: '`' + playerGameId + '`', inline: false },
        { name: '📝 Item', value: item.description, inline: false },
      )
      .setFooter({ text: 'Redemption #' + redId + ' • You\'ll get a DM when it\'s fulfilled' }).setTimestamp()]
  });
}

// ── Discord client ────────────────────────────────────────────────────────────
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

// Prevent duplicate interaction processing (guards against double-firing)
const _processedInteractions = new Set();

client.on('interactionCreate', async interaction => {

  // ── Deduplicate interactions ──────────────────────────────────────────────
  if (_processedInteractions.has(interaction.id)) return;
  _processedInteractions.add(interaction.id);
  setTimeout(() => _processedInteractions.delete(interaction.id), 60_000);

  // ── Audit log every interaction ───────────────────────────────────────────
  postAuditLog(client, interaction).catch(() => { });

  // ── Shop dropdown redeem ──────────────────────────────────────────────────
  if (interaction.isStringSelectMenu() && interaction.customId === 'shop_redeem') {
    const isPaused = getSetting('requests_paused') === 'true';
    if (isPaused) {
      await interaction.reply({ content: '⏸️ **The Shop is currently closed!** You cannot redeem items right now.', ephemeral: true });
      return;
    }
    const itemId = parseInt(interaction.values[0]);
    const modal = new ModalBuilder().setCustomId(`redeem_modal_${itemId}`).setTitle('Enter Your VRFS Player ID');
    const idInput = new TextInputBuilder().setCustomId('player_game_id').setLabel("What is your VRFS Player ID?").setStyle(TextInputStyle.Short).setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(idInput));
    await interaction.showModal(modal);
    return;
  }

  // ── Modal Submit ──────────────────────────────────────────────────────────
  if (interaction.isModalSubmit() && interaction.customId.startsWith('redeem_modal_')) {
    try {
      await interaction.deferReply({ ephemeral: true });
      const itemId = parseInt(interaction.customId.replace('redeem_modal_', ''));
      const playerGameId = interaction.fields.getTextInputValue('player_game_id');
      await processRedeem(client, interaction, itemId, playerGameId);
    } catch (err) {
      console.error('[redeem_modal]', err);
      let userMessage = '❌ Error: ' + err.message;
      if (err.code === RESTJSONErrorCodes.MissingPermissions) {
        const redemptionChannelId = getSetting('redemption_channel');
        const channelMention = redemptionChannelId ? `<#${redemptionChannelId}>` : 'the configured redemption channel';
        userMessage = `I'm missing permissions in ${channelMention}. An administrator needs to grant me "Send Messages" and "Embed Links" permissions there.`;
      }
      try {
        const msg = { content: userMessage };
        if (interaction.replied || interaction.deferred) {
          await interaction.editReply(msg);
        } else {
          await interaction.reply({ ...msg, ephemeral: true });
        }
      } catch (e) {
        console.error('[redeem_modal] Could not send error reply', e.message);
      }
    }
    return;
  }

  // ── Hangman: guess letter modal ────────────────────────────────────────────
  if (interaction.isModalSubmit() && interaction.customId.startsWith('hangman_guess_modal_')) {
    const gameId = interaction.customId.replace('hangman_guess_modal_', '');
    const game = hangmanGames.get(gameId);
    if (!game || game.phase !== 'playing') { await interaction.reply({ content: '❌ Game not found or already ended.', ephemeral: true }); return; }

    // In multiplayer, only guessers (not word setter) can guess
    if (game.mode === 'multi' && interaction.user.id === game.wordSetterId) {
      await interaction.reply({ content: '🚫 You set the word! You cannot guess.', ephemeral: true }); return;
    }

    const raw = interaction.fields.getTextInputValue('hangman_letter').toUpperCase().trim();
    if (!/^[A-Z]$/.test(raw)) { await interaction.reply({ content: '❌ Please enter a single letter A-Z.', ephemeral: true }); return; }
    if (game.guessed.has(raw) || game.wrong.includes(raw)) { await interaction.reply({ content: `⚠️ You already guessed **${raw}**!`, ephemeral: true }); return; }

    if (game.word.includes(raw)) {
      game.guessed.add(raw);
    } else {
      game.wrong.push(raw);
    }

    const isWon = game.word.split('').every(c => game.guessed.has(c));
    const maxWrong = game.maxWrong ?? HANGMAN_MAX_WRONG;
    const isLost = game.wrong.length >= maxWrong;
    if (isWon || isLost) game.phase = 'ended';

    const embed = buildHangmanEmbed(game, isWon ? `🎉 ${interaction.user.username} guessed it!` : isLost ? '💀 The hangman is complete!' : `🔤 ${interaction.user.username} guessed **${raw}**`);
    const components = (isWon || isLost) ? buildEndComponents(game) : buildHangmanComponents(game);
    await interaction.deferUpdate();
    const ch = await client.channels.fetch(game.channelId).catch(() => null);
    if (ch) {
      const msg = await ch.messages.fetch(game.messageId).catch(() => null);
      if (msg) await msg.edit({ embeds: [embed], components });
    }
    // Solo games clean up immediately; multi games stay alive for Play Again button
    if ((isWon || isLost) && game.mode === 'solo') hangmanGames.delete(gameId);
    return;
  }

  // ── Hangman: set word modal ────────────────────────────────────────────────
  if (interaction.isModalSubmit() && interaction.customId.startsWith('hangman_word_modal_')) {
    const gameId = interaction.customId.replace('hangman_word_modal_', '');
    const game = hangmanGames.get(gameId);
    if (!game || game.phase !== 'picking') { await interaction.reply({ content: '❌ Game not found or wrong phase.', ephemeral: true }); return; }
    if (interaction.user.id !== game.wordSetterId) { await interaction.reply({ content: '🚫 You were not selected to set the word!', ephemeral: true }); return; }

    const raw = interaction.fields.getTextInputValue('hangman_word').trim().toUpperCase();
    if (!/^[A-Z]{2,10}$/.test(raw)) { await interaction.reply({ content: '❌ Word must be 2–10 letters (A-Z only, no spaces or numbers).', ephemeral: true }); return; }

    // Profanity / slur check
    if (isHangmanBanned(raw)) {
      await interaction.reply({ content: '🚫 That word is not allowed. Please try again with a different word.', ephemeral: true });
      // Flag in moderation channel
      try {
        const modChId = getSetting('log_channel');
        if (modChId) {
          const modCh = await client.channels.fetch(modChId).catch(() => null);
          if (modCh) await modCh.send({
            embeds: [new EmbedBuilder()
              .setTitle('⚠️ Hangman Word Flagged')
              .setColor(0xff4d4d)
              .setDescription(`<@${interaction.user.id}> (\`${interaction.user.username}\`) tried to set a banned word in a Hangman game.`)
              .addFields({ name: '🔍 Word Attempted', value: '||' + raw + '||', inline: true })
              .setTimestamp()]
          });
        }
      } catch (_) { }
      return;
    }

    game.word = raw;
    game.phase = 'playing';

    const embed = buildHangmanEmbed(game, `🪢 Hangman — Word set by <@${game.wordSetterId}>!`);
    await interaction.reply({ content: `✅ Word set! The game has started.`, ephemeral: true });
    const ch = await client.channels.fetch(game.channelId).catch(() => null);
    if (ch) {
      const msg = await ch.messages.fetch(game.messageId).catch(() => null);
      if (msg) await msg.edit({ embeds: [embed], components: buildHangmanComponents(game) });
    }
    return;
  }

  if (interaction.isModalSubmit() && interaction.customId.startsWith('decline_reason_modal_')) {
    await interaction.deferReply({ ephemeral: true });

    const orderId = parseInt(interaction.customId.replace('decline_reason_modal_', ''));
    const reason = interaction.fields.getTextInputValue('decline_reason') || 'No reason entered';

    const order = await get('SELECT * FROM scrim_redemptions WHERE id = ?', [orderId]);

    if (!order) {
      await interaction.editReply({ content: '❌ This order could not be found in the database. It may have been deleted.' });
      return;
    }

    const dmEmbed = new EmbedBuilder()
      .setTitle('ℹ️ Order Update')
      .setColor(0xff4d4d) // Red
      .setDescription(`**Declined**\nYour order of **${order.item_name}** has been declined.\nReason: ${reason}`);

    try {
      await client.users.fetch(order.discord_id).then(u => u.send({ embeds: [dmEmbed] }));
    } catch (e) {
      console.warn(`[dev_decline] Failed to DM user ${order.discord_id}`, e.message);
      await interaction.editReply({ content: `⚠️ Could not send DM to the user. The decline was not processed. Error: ${e.message}` });
      return;
    }

    // Find and update the original message
    const batchChannelId = getSetting('batch_request_channel');
    let messageUpdated = false;
    if (batchChannelId) {
      const channel = await client.channels.fetch(batchChannelId).catch(() => null);
      if (channel) {
        try {
          const messages = await channel.messages.fetch({ limit: 50 });
          const originalMessage = messages.find(m =>
            m.author.id === client.user.id &&
            m.embeds.length > 0 &&
            m.embeds[0].fields.some(f => f.name === '🔑 Order ID' && f.value === `\`${order.public_id}\``) &&
            m.components.length > 0 &&
            m.components[0].components.some(c => !c.disabled)
          );

          if (originalMessage) {
            const originalEmbed = originalMessage.embeds[0];
            const updatedEmbed = EmbedBuilder.from(originalEmbed)
              .setTitle(`[❌ DECLINED] ${originalEmbed.data.title}`)
              .setColor(0xed4245);

            const actionRow = ActionRowBuilder.from(originalMessage.components[0]);
            for (const component of actionRow.components) {
              component.setDisabled(true);
            }

            await originalMessage.edit({ embeds: [updatedEmbed], components: [actionRow] });
            messageUpdated = true;
          }
        } catch (e) {
          console.error('[dev_decline] Could not find or edit original message', e.message);
        }
      }
    }

    await interaction.editReply({ content: `✅ The user has been notified of the decline. ${messageUpdated ? 'The batch message has been updated.' : 'Could not update the original batch message.'}` });

    return;
  }

  // ── Buttons ───────────────────────────────────────────────────────────────
  if (interaction.isButton()) {

    if (interaction.customId.startsWith('claim_approve_') || interaction.customId.startsWith('claim_reject_')) {
      if (!hasManagement(interaction.member)) { await interaction.reply({ content: '❌ You need the Scrim Management role.', flags: 64 }); return; }
      const isApprove = interaction.customId.startsWith('claim_approve_');
      const reqId = parseInt(interaction.customId.replace('claim_approve_', '').replace('claim_reject_', ''));
      const req = await get('SELECT * FROM scrim_requests WHERE id=?', [reqId]);
      if (!req) { await interaction.reply({ content: '❌ Request not found.', flags: 64 }); return; }
      if (req.status !== 'pending') { await interaction.reply({ content: '❌ Already reviewed.', flags: 64 }); return; }

      // Atomic status update — prevents double-processing from rapid clicks
      const result = await run('UPDATE scrim_requests SET status=?, reviewer_id=? WHERE id=? AND status=?', [isApprove ? 'approved' : 'rejected', interaction.user.id, reqId, 'pending']);
      if (result.rowsAffected === 0) { await interaction.reply({ content: '❌ Already reviewed.', flags: 64 }); return; }

      if (isApprove) {
        await addPoints(req.discord_id, req.username, req.amount);
        const newTotal = await getPoints(req.discord_id);
        client.users.fetch(req.discord_id).then(u => u.send({
          embeds: [new EmbedBuilder()
            .setTitle('✅ Points Claim Approved!').setColor(0x00f5a0)
            .setDescription('Your scrim points claim has been **approved**!')
            .addFields(
              { name: '⭐ Points Added', value: '+' + req.amount, inline: true },
              { name: '💰 New Balance', value: String(newTotal), inline: true },
              { name: '📝 Description', value: req.description, inline: false },
            ).setFooter({ text: 'Approved by ' + interaction.user.username }).setTimestamp()]
        })).catch(() => { });
        await postLog(client, new EmbedBuilder().setTitle('✅ Claim Approved').setColor(0x00f5a0)
          .addFields(
            { name: 'Player', value: '<@' + req.discord_id + '>', inline: true },
            { name: 'Points', value: '+' + req.amount, inline: true },
            { name: 'Reviewer', value: '<@' + interaction.user.id + '>', inline: true },
            { name: 'Reason', value: req.description }
          ).setFooter({ text: 'Claim #' + reqId }).setTimestamp());
      } else {
        client.users.fetch(req.discord_id).then(u => u.send({
          embeds: [new EmbedBuilder()
            .setTitle('❌ Points Claim Rejected').setColor(0xff4d4d)
            .setDescription('Your scrim points claim has been **rejected**.')
            .addFields(
              { name: '📝 Your Claim', value: req.description, inline: false },
              { name: '⭐ Requested', value: String(req.amount), inline: true },
            ).setFooter({ text: 'Rejected by ' + interaction.user.username + ' • Contact them if you think this is wrong.' }).setTimestamp()]
        })).catch(() => { });
      }

      const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
        .setColor(isApprove ? 0x00f5a0 : 0xff4d4d)
        .setTitle(isApprove ? '✅ Claim Approved — #' + reqId : '❌ Claim Rejected — #' + reqId)
        .setFooter({ text: (isApprove ? 'Approved' : 'Rejected') + ' by ' + interaction.user.username });
      await interaction.update({
        embeds: [updatedEmbed], components: [new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('claim_done').setLabel(isApprove ? '✅ Approved' : '❌ Rejected')
            .setStyle(isApprove ? ButtonStyle.Success : ButtonStyle.Danger).setDisabled(true)
        )]
      });
      return;
    }

    if (interaction.customId.startsWith('redeem_approve_') || interaction.customId.startsWith('redeem_reject_')) {
      if (!hasManagement(interaction.member)) { await interaction.reply({ content: '❌ You need the Scrim Management role.', flags: 64 }); return; }
      const isApprove = interaction.customId.startsWith('redeem_approve_');
      const redId = parseInt(interaction.customId.replace('redeem_approve_', '').replace('redeem_reject_', ''));
      const red = await get('SELECT * FROM scrim_redemptions WHERE id=?', [redId]);
      if (!red) { await interaction.reply({ content: '❌ Redemption not found.', flags: 64 }); return; }
      if (red.status !== 'pending') { await interaction.reply({ content: '❌ Already reviewed.', flags: 64 }); return; }

      // Atomic status update — prevents double-processing from rapid clicks
      const result = await run('UPDATE scrim_redemptions SET status=?, reviewer_id=? WHERE id=? AND status=?', [isApprove ? 'fulfilled' : 'rejected', interaction.user.id, redId, 'pending']);
      if (result.rowsAffected === 0) { await interaction.reply({ content: '❌ Already reviewed.', flags: 64 }); return; }
      if (!isApprove) await addPoints(red.discord_id, red.username, red.cost);

      const dmEmbed = new EmbedBuilder()
        .setTitle(isApprove ? '🎉 Redemption Fulfilled!' : '❌ Redemption Rejected')
        .setColor(isApprove ? 0x00f5a0 : 0xff4d4d)
        .setDescription(isApprove
          ? 'Your item redemption has been **fulfilled**! Contact management to claim it.'
          : 'Your redemption was **rejected** and your points have been **refunded**.')
        .addFields(
          { name: '🛍️ Item', value: red.item_name, inline: true },
          { name: '⭐ Cost', value: String(red.cost), inline: true },
        )
        .setFooter({ text: (isApprove ? 'Fulfilled' : 'Rejected') + ' by ' + interaction.user.username }).setTimestamp();

      if (isApprove) {
        if (red.public_id) {
          dmEmbed.addFields({ name: '🔑 Order ID', value: '`' + red.public_id + '`', inline: false });
        }
        if (red.player_game_id) {
          dmEmbed.addFields({ name: '🆔 VRFS Player ID', value: '`' + red.player_game_id + '`', inline: false });
        }
      }

      client.users.fetch(red.discord_id).then(u => u.send({ embeds: [dmEmbed] })).catch(() => { });

      const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
        .setColor(isApprove ? 0x00f5a0 : 0xff4d4d)
        .setTitle(isApprove ? '✅ Redemption Fulfilled — #' + redId : '❌ Redemption Rejected — #' + redId)
        .setFooter({ text: (isApprove ? 'Fulfilled' : 'Rejected') + ' by ' + interaction.user.username });
      await interaction.update({
        embeds: [updatedEmbed], components: [new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('redeem_done').setLabel(isApprove ? '✅ Fulfilled' : '❌ Rejected')
            .setStyle(isApprove ? ButtonStyle.Success : ButtonStyle.Danger).setDisabled(true)
        )]
      });
      return;
    }

    if (interaction.customId.startsWith('forward_order_')) {
      if (!hasManagement(interaction.member)) { await interaction.reply({ content: '❌ You need the Scrim Management role.', ephemeral: true }); return; }

      const orderId = parseInt(interaction.customId.replace('forward_order_', ''));
      const order = await get('SELECT * FROM scrim_redemptions WHERE id = ?', [orderId]);

      if (!order) {
        await interaction.update({ content: '❌ This order could not be found in the database. It may have been deleted.', components: [] });
        return;
      }

      const fulfilmentChannelId = getSetting('fulfilment_channel');
      if (!fulfilmentChannelId) {
        await interaction.reply({ content: '❌ The fulfilment channel has not been set by an admin yet.', ephemeral: true });
        return;
      }

      const channel = await client.channels.fetch(fulfilmentChannelId).catch(() => null);
      if (!channel) {
        await interaction.reply({ content: '❌ The configured fulfilment channel could not be found.', ephemeral: true });
        return;
      }

      const forwardEmbed = new EmbedBuilder()
        .setTitle(`🎁 Order Fulfilment: \`${order.public_id}\``)
        .setColor(0x57f287) // Green
        .addFields(
          { name: '🛒 Item', value: order.item_name, inline: true },
          { name: '⭐ Cost', value: String(order.cost), inline: true },
          { name: '👤 Player', value: `<@${order.discord_id}> (\`${order.username}\`)`, inline: false },
          { name: '📅 Redemption Date', value: new Date(order.created_at).toLocaleString(), inline: false },
        )
        .setTimestamp();

      try {
        await channel.send({ embeds: [forwardEmbed] });
      } catch (err) {
        console.error('[forward_order] send error', err);
        await interaction.reply({ content: `❌ Could not send message to <#${fulfilmentChannelId}>. Please check my permissions there.`, ephemeral: true });
        return;
      }

      // Disable the button on the original message
      const originalEmbed = interaction.message.embeds[0];
      await interaction.update({
        embeds: [originalEmbed],
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(interaction.customId)
              .setLabel('✅ Forwarded')
              .setStyle(ButtonStyle.Success)
              .setDisabled(true)
          )
        ]
      });
      return;
    }

    if (interaction.customId.startsWith('batch_order_')) {
      if (!hasManagement(interaction.member)) { await interaction.reply({ content: '❌ You need the Scrim Management role.', ephemeral: true }); return; }

      const orderId = parseInt(interaction.customId.replace('batch_order_', ''));
      const order = await get('SELECT * FROM scrim_redemptions WHERE id = ?', [orderId]);

      if (!order) {
        await interaction.reply({ content: '❌ This order could not be found.', ephemeral: true });
        return;
      }

      if (!order.player_game_id) {
        await interaction.reply({ content: '❌ This order does not have a VRFS Player ID associated with it.', ephemeral: true });
        return;
      }

      const batchChannelId = getSetting('batch_request_channel');
      if (!batchChannelId) {
        await interaction.reply({ content: '❌ The batch request channel has not been set.', ephemeral: true });
        return;
      }

      const channel = await client.channels.fetch(batchChannelId).catch(() => null);
      if (!channel) {
        await interaction.reply({ content: '❌ The batch request channel could not be found.', ephemeral: true });
        return;
      }

      const batchEmbed = new EmbedBuilder()
        .setTitle(`📦 Scrim Batch Request`)
        .setColor(0x7289da) // Discord Blurple
        .addFields(
          { name: '🛒 Item to Deliver', value: `**${order.item_name}**`, inline: false },
          { name: '👤 Deliver To', value: `<@${order.discord_id}> (\`${order.username}\`)`, inline: false },
          { name: '🆔 VRFS Player ID', value: '`' + order.player_game_id + '`', inline: false },
          { name: '🔑 Order ID', value: '`' + order.public_id + '`', inline: false },
        )
        .setTimestamp();

      const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`dev_confirm_${order.id}`)
          .setLabel('✅ Confirm Sent to Devs (dm user)')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`dev_decline_${order.id}`)
          .setLabel('❌ Decline')
          .setStyle(ButtonStyle.Danger)
      );

      try {
        await channel.send({ embeds: [batchEmbed], components: [actionRow] });
      } catch (err) {
        console.error('[batch_order] send error', err);
        await interaction.reply({ content: `❌ Could not send message to <#${batchChannelId}>. Please check my permissions there.`, ephemeral: true });
        return;
      }

      // Disable the button on the original message
      const originalActionRow = ActionRowBuilder.from(interaction.message.components[0]);
      const button = originalActionRow.components.find(c => c.data.custom_id === interaction.customId);
      button.setDisabled(true).setLabel('✅ Sent to Batch').setStyle(ButtonStyle.Success);

      await interaction.update({
        components: [originalActionRow]
      });

      return;
    }

    if (interaction.customId.startsWith('dev_confirm_')) {
      if (!hasManagement(interaction.member)) { await interaction.reply({ content: '❌ You need the Scrim Management role.', ephemeral: true }); return; }

      const orderId = parseInt(interaction.customId.replace('dev_confirm_', ''));
      const order = await get('SELECT * FROM scrim_redemptions WHERE id = ?', [orderId]);

      if (!order) {
        await interaction.update({ content: '❌ This order could not be found in the database. It may have been deleted.', components: [] });
        return;
      }

      const dmEmbed = new EmbedBuilder()
        .setTitle('🎉 Order Update!')
        .setColor(0x00f5a0)
        .setDescription(`**Congrats!!!!**\nYour **${order.item_name}** has been sent to the devs and is waiting for them to confirm delivery.`);

      await client.users.fetch(order.discord_id).then(u => u.send({ embeds: [dmEmbed] })).catch(e => {
        console.warn(`[dev_confirm] Failed to DM user ${order.discord_id}`, e.message);
      });

      // Update the original message
      const originalEmbed = interaction.message.embeds[0];
      const updatedEmbed = EmbedBuilder.from(originalEmbed)
        .setTitle(`[✅ SENT TO DEVS] ${originalEmbed.data.title}`)
        .setColor(0x57f287); // Green

      const actionRow = ActionRowBuilder.from(interaction.message.components[0]);
      for (const component of actionRow.components) {
        component.setDisabled(true);
      }

      await interaction.update({ embeds: [updatedEmbed], components: [actionRow] });
      return;
    }

    if (interaction.customId.startsWith('scrim_join_')) {
      const scrimId = parseInt(interaction.customId.replace('scrim_join_', ''));
      const scrim = await get('SELECT * FROM scrim_upcoming WHERE id=?', [scrimId]);
      if (!scrim) { await interaction.reply({ content: '❌ Scrim not found.', ephemeral: true }); return; }
      try {
        await run('INSERT INTO scrim_participants (scrim_id, discord_id, username) VALUES (?,?,?)', [scrimId, interaction.user.id, interaction.user.username]);
        await interaction.reply({ content: '✅ You have joined the scrim **' + scrim.title + '**!', ephemeral: true });
      } catch (e) {
        await interaction.reply({ content: '⚠️ You have already joined this scrim.', ephemeral: true });
      }
      return;
    }

    if (interaction.customId.startsWith('dev_decline_')) {
      if (!hasMod(interaction.member)) { await interaction.reply({ content: '❌ You need the **Mod** role.', ephemeral: true }); return; }

      const orderId = parseInt(interaction.customId.replace('dev_decline_', ''));
      const modal = new ModalBuilder().setCustomId(`decline_reason_modal_${orderId}`).setTitle('Decline Batch Request');
      const reasonInput = new TextInputBuilder().setCustomId('decline_reason').setLabel("Reason for declining (optional)").setStyle(TextInputStyle.Paragraph).setRequired(false);
      modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
      await interaction.showModal(modal);
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'message_participants_select') {
      const val = interaction.values[0];
      const [scrimId, preview, encodedMsg] = val.split('|');
      const msg = decodeURIComponent(encodedMsg);

      await interaction.deferUpdate();
      const participants = await all('SELECT discord_id FROM scrim_participants WHERE scrim_id=?', [scrimId]);
      if (!participants.length) { await interaction.followUp({ content: '❌ No participants found for this scrim.', ephemeral: true }); return; }

      let success = 0, fail = 0;
      for (const p of participants) {
        try {
          const user = await client.users.fetch(p.discord_id);
          await user.send(`📢 **Message from Scrim Management:**\n\n${msg}`);
          success++;
        } catch (e) { fail++; }
      }
      await interaction.followUp({ content: `✅ Sent message to **${success}** participants. ❌ Failed for **${fail}**.`, ephemeral: true });
      return;
    }
    // ── Hangman buttons ─────────────────────────────────────────────────────

    // Guess a letter button → open modal
    if (interaction.customId.startsWith('hangman_guess_')) {
      const gameId = interaction.customId.replace('hangman_guess_', '');
      const game = hangmanGames.get(gameId);
      if (!game || game.phase !== 'playing') { await interaction.reply({ content: '❌ This game is no longer active.', ephemeral: true }); return; }
      if (game.mode === 'multi' && interaction.user.id === game.wordSetterId) {
        await interaction.reply({ content: '🚫 You set the word — you cannot guess it!', ephemeral: true }); return;
      }
      if (game.mode === 'solo' && interaction.user.id !== game.hostId) {
        await interaction.reply({ content: '🚫 This is not your game!', ephemeral: true }); return;
      }
      const modal = new ModalBuilder().setCustomId(`hangman_guess_modal_${gameId}`).setTitle('Guess a Letter');
      modal.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('hangman_letter').setLabel('Enter one letter (A-Z)').setStyle(TextInputStyle.Short).setMinLength(1).setMaxLength(1).setRequired(true)
      ));
      await interaction.showModal(modal);
      return;
    }

    // Give up button
    if (interaction.customId.startsWith('hangman_giveup_')) {
      const gameId = interaction.customId.replace('hangman_giveup_', '');
      const game = hangmanGames.get(gameId);
      if (!game) { await interaction.reply({ content: '❌ Game not found.', ephemeral: true }); return; }
      if (game.mode === 'solo' && interaction.user.id !== game.hostId) {
        await interaction.reply({ content: '🚫 This is not your game!', ephemeral: true }); return;
      }
      game.wrong = Array(game.maxWrong ?? HANGMAN_MAX_WRONG).fill('?');
      game.phase = 'ended';
      const embed = buildHangmanEmbed(game, '🏳️ Game abandoned!');
      const components = buildEndComponents(game);
      await interaction.update({ embeds: [embed], components });
      if (game.mode === 'solo') hangmanGames.delete(gameId);
      return;
    }

    // Play Again button
    if (interaction.customId.startsWith('hangman_playagain_')) {
      const oldGameId = interaction.customId.replace('hangman_playagain_', '');
      const oldGame = hangmanGames.get(oldGameId);
      if (!oldGame || oldGame.phase !== 'ended') {
        await interaction.reply({ content: '❌ Game not found or already restarted.', ephemeral: true }); return;
      }
      if (!oldGame.players.some(p => p.id === interaction.user.id)) {
        await interaction.reply({ content: '🚫 You were not in this game!', ephemeral: true }); return;
      }

      // Pick new word setter — exclude the last setter
      const lastSetterId = oldGame.wordSetterId;
      const eligibleSetters = oldGame.players.filter(p => p.id !== lastSetterId);
      const setterPool = eligibleSetters.length > 0 ? eligibleSetters : oldGame.players;
      const newWordSetterId = setterPool[Math.floor(Math.random() * setterPool.length)].id;

      const newGameId = generateGameId();
      const newGame = {
        id: newGameId,
        mode: 'multi',
        word: '',
        guessed: new Set(),
        wrong: [],
        maxWrong: oldGame.maxWrong,
        hostId: oldGame.hostId,
        channelId: oldGame.channelId,
        messageId: oldGame.messageId, // reuse same message
        wordSetterId: newWordSetterId,
        phase: 'picking',
        players: [...oldGame.players], // all same players auto-joined
      };

      hangmanGames.set(newGameId, newGame);
      hangmanGames.delete(oldGameId);

      const embed = new EmbedBuilder()
        .setTitle('🔄 Hangman — Play Again!')
        .setColor(0xf5a623)
        .setDescription(`Same crew, new word! <@${newWordSetterId}> has been randomly selected to set the word.\n\n**<@${newWordSetterId}> — click the button to enter your secret word!**`)
        .addFields(
          { name: '👥 Players', value: newGame.players.map(p => `<@${p.id}>`).join(', '), inline: false },
          { name: '❤️ Lives', value: `${newGame.maxWrong} wrong guesses allowed`, inline: true },
        )
        .setFooter({ text: `🚫 ${oldGame.players.find(p => p.id === lastSetterId)?.username ?? 'Previous setter'} cannot set the word again • VRDL Hangman` });

      const setWordRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`hangman_setword_${newGameId}`).setLabel('✍️ Set the Word').setStyle(ButtonStyle.Primary),
      );

      await interaction.update({ embeds: [embed], components: [setWordRow] });
      return;
    }

    // Join lobby button
    if (interaction.customId.startsWith('hangman_join_')) {
      const gameId = interaction.customId.replace('hangman_join_', '');
      const game = hangmanGames.get(gameId);
      if (!game || game.phase !== 'lobby') { await interaction.reply({ content: '❌ This lobby is no longer open.', ephemeral: true }); return; }
      if (game.players.some(p => p.id === interaction.user.id)) {
        await interaction.reply({ content: '⚠️ You are already in this lobby!', ephemeral: true }); return;
      }
      if (game.players.length >= 8) { await interaction.reply({ content: '❌ Lobby is full (max 8 players).', ephemeral: true }); return; }
      game.players.push({ id: interaction.user.id, username: interaction.user.username });
      const playerList = game.players.map((p, i) => `${i + 1}. <@${p.id}>`).join('\n');
      const embed = new EmbedBuilder()
        .setTitle('🪚 Hangman Lobby')
        .setColor(0x5865f2)
        .setDescription(`**${game.players.length} player${game.players.length > 1 ? 's' : ''}** in the lobby!\n\n${playerList}`)
        .addFields(
          { name: '👑 Host', value: `<@${game.hostId}>`, inline: true },
          { name: '❤️ Lives', value: `**${game.maxWrong}** wrong guesses allowed`, inline: true },
        )
        .setFooter({ text: 'Host can change lives and click Start when ready! (min. 2 players)' });
      await interaction.update({ embeds: [embed], components: [buildLobbyButtons(game)] });
      return;
    }

    // Lives cycle button (host only)
    if (interaction.customId.startsWith('hangman_lives_')) {
      const gameId = interaction.customId.replace('hangman_lives_', '');
      const game = hangmanGames.get(gameId);
      if (!game || game.phase !== 'lobby') { await interaction.reply({ content: '❌ Lobby is no longer open.', ephemeral: true }); return; }
      if (interaction.user.id !== game.hostId) { await interaction.reply({ content: '🚫 Only the host can change the lives count.', ephemeral: true }); return; }
      game.maxWrong = game.maxWrong >= 12 ? 6 : game.maxWrong + 1;
      const playerList = game.players.map((p, i) => `${i + 1}. <@${p.id}>`).join('\n');
      const embed = new EmbedBuilder()
        .setTitle('🪚 Hangman Lobby')
        .setColor(0x5865f2)
        .setDescription(`**${game.players.length} player${game.players.length > 1 ? 's' : ''}** in the lobby!\n\n${playerList}`)
        .addFields(
          { name: '👑 Host', value: `<@${game.hostId}>`, inline: true },
          { name: '❤️ Lives', value: `**${game.maxWrong}** wrong guesses allowed`, inline: true },
        )
        .setFooter({ text: `Lives set to ${game.maxWrong} • Click ❤️ to change • Host clicks Start when ready` });
      await interaction.update({ embeds: [embed], components: [buildLobbyButtons(game)] });
      return;
    }

    // Start game button
    if (interaction.customId.startsWith('hangman_start_')) {
      const gameId = interaction.customId.replace('hangman_start_', '');
      const game = hangmanGames.get(gameId);
      if (!game || game.phase !== 'lobby') { await interaction.reply({ content: '❌ Game already started or not found.', ephemeral: true }); return; }
      if (interaction.user.id !== game.hostId) { await interaction.reply({ content: '🚫 Only the host can start the game.', ephemeral: true }); return; }
      if (game.players.length < 2) { await interaction.reply({ content: '❌ Need at least 2 players to start!', ephemeral: true }); return; }

      // Randomly pick word setter
      const setterIdx = Math.floor(Math.random() * game.players.length);
      game.wordSetterId = game.players[setterIdx].id;
      game.phase = 'picking';

      const embed = new EmbedBuilder()
        .setTitle('🪢 Hangman — Waiting for word...')
        .setColor(0xf5a623)
        .setDescription(`<@${game.wordSetterId}> has been selected to set the word!\n\n**<@${game.wordSetterId}> — click the button below to enter your secret word!**`)
        .addFields({ name: '👥 Players', value: game.players.map(p => `<@${p.id}>`).join(', '), inline: false })
        .setFooter({ text: 'Word setter: only you can click the button!' });
      const setWordRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`hangman_setword_${gameId}`).setLabel('✍️ Set the Word').setStyle(ButtonStyle.Primary),
      );
      await interaction.update({ embeds: [embed], components: [setWordRow] });
      return;
    }

    // Set word button → opens modal
    if (interaction.customId.startsWith('hangman_setword_')) {
      const gameId = interaction.customId.replace('hangman_setword_', '');
      const game = hangmanGames.get(gameId);
      if (!game || game.phase !== 'picking') { await interaction.reply({ content: '❌ Game not found or already started.', ephemeral: true }); return; }
      if (interaction.user.id !== game.wordSetterId) { await interaction.reply({ content: '🚫 You were not selected to set the word!', ephemeral: true }); return; }
      const modal = new ModalBuilder().setCustomId(`hangman_word_modal_${gameId}`).setTitle('Enter the Secret Word');
      modal.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('hangman_word').setLabel('Secret word (2–10 letters, no spaces)').setStyle(TextInputStyle.Short).setMinLength(2).setMaxLength(10).setRequired(true)
      ));
      await interaction.showModal(modal);
      return;
    }

    // ── Tic-Tac-Toe buttons ──────────────────────────────────────────────────
    if (interaction.customId.startsWith('ttt_join_')) {
      const parts = interaction.customId.split('_');
      const gameId = parts[2];
      const game = tttGames.get(gameId);

      if (!game) { await interaction.reply({ content: '❌ Tic-Tac-Toe game not found.', ephemeral: true }); return; }
      if (game.players.length >= 2) {
        await interaction.reply({ content: '❌ This Tic-Tac-Toe lobby is already full.', ephemeral: true });
        return;
      }
      if (game.players.some(p => p.id === interaction.user.id)) {
        await interaction.reply({ content: '⚠️ You are already in this Tic-Tac-Toe lobby!', ephemeral: true });
        return;
      }

      game.players.push({ id: interaction.user.id, username: interaction.user.username });
      game.turn = game.players[Math.floor(Math.random() * game.players.length)].id;

      await interaction.update({ embeds: [buildTTTEmbed(game)], components: buildTTTBoard(game) });
      return;
    }

    if (interaction.customId.startsWith('ttt_click_')) {
      const parts = interaction.customId.split('_'); // ttt, click, id, idx
      const gameId = parts[2];
      const idx = parseInt(parts[3]);
      const game = tttGames.get(gameId);

      if (!game || game.winner || game.draw) return;
      if (interaction.user.id !== game.turn) { await interaction.reply({ content: '🚫 It is not your turn!', ephemeral: true }); return; }

      const symbol = game.players[0].id === game.turn ? 'X' : 'O';
      game.board[idx] = symbol;

      const res = checkTTTWinner(game.board);
      if (res === 'draw') game.draw = true;
      else if (res) game.winner = game.turn;
      else game.turn = game.players.find(p => p.id !== game.turn).id;

      await interaction.update({ embeds: [buildTTTEmbed(game)], components: buildTTTBoard(game) });
      if (game.winner || game.draw) tttGames.delete(gameId);
      return;
    }

    // ── Fast Fingers buttons ──────────────────────────────────────────────────
    if (interaction.customId.startsWith('ff_join_')) {
      const gameId = interaction.customId.replace('ff_join_', '');
      const game = fastFingersGames.get(gameId);
      if (!game || game.phase !== 'lobby') { await interaction.reply({ content: '❌ Lobby is closed.', ephemeral: true }); return; }
      if (game.players.some(p => p.id === interaction.user.id)) { await interaction.reply({ content: '⚠️ Already joined!', ephemeral: true }); return; }

      game.players.push({ id: interaction.user.id, username: interaction.user.username });
      await interaction.update({ embeds: [buildFFEmbed(game, 'Waiting for more players...')] });
      return;
    }

    if (interaction.customId.startsWith('ff_start_')) {
      const gameId = interaction.customId.replace('ff_start_', '');
      const game = fastFingersGames.get(gameId);
      if (!game || game.phase !== 'lobby') return;
      if (game.hostId !== interaction.user.id) { await interaction.reply({ content: '🚫 Only the host can start!', ephemeral: true }); return; }
      if (game.players.length < 2) { await interaction.reply({ content: '❌ Need at least 2 players!', ephemeral: true }); return; }

      game.phase = 'waiting';
      await interaction.update({ embeds: [buildFFEmbed(game, '🎲 **Get ready... Starting in 3 seconds!**')], components: [] });

      setTimeout(async () => {
        if (!fastFingersGames.has(gameId)) return;
        game.phase = 'playing';
        game.targetEmoji = FF_EMOJIS[Math.floor(Math.random() * FF_EMOJIS.length)];

        // Randomly place target among 4 others
        const buttons = FF_EMOJIS.filter(e => e !== game.targetEmoji).sort(() => Math.random() - 0.5).slice(0, 4);
        buttons.push(game.targetEmoji);
        buttons.sort(() => Math.random() - 0.5);

        const row = new ActionRowBuilder().addComponents(
          buttons.map(emoji => new ButtonBuilder().setCustomId(`ff_click_${gameId}_${emoji}`).setLabel(emoji).setStyle(ButtonStyle.Primary))
        );

        const ch = await client.channels.fetch(game.channelId).catch(() => null);
        if (ch) {
          const msg = await ch.messages.fetch(game.messageId).catch(() => null);
          if (msg) await msg.edit({ embeds: [buildFFEmbed(game, `🏁 **CLICK THE MATCHING EMOJI:** ${game.targetEmoji}`)], components: [row] });
        }
      }, 3000);
      return;
    }

    if (interaction.customId.startsWith('ff_click_')) {
      const parts = interaction.customId.split('_'); // ff, click, id, emoji
      const gameId = parts[2];
      const clickedEmoji = parts[3];
      const game = fastFingersGames.get(gameId);

      if (!game || game.phase !== 'playing') return;
      if (!game.players.some(p => p.id === interaction.user.id)) { await interaction.reply({ content: '🚫 You are not in this game!', ephemeral: true }); return; }

      if (clickedEmoji === game.targetEmoji) {
        game.phase = 'ended';
        const embed = buildFFEmbed(game, `🏆 <@${interaction.user.id}> **WON!** They clicked ${game.targetEmoji} first!`);
        await interaction.update({ embeds: [embed], components: [] });
        fastFingersGames.delete(gameId);
      } else {
        await interaction.reply({ content: '❌ Wrong emoji! Try again.', ephemeral: true });
      }
      return;
    }

    // ── Battleships buttons ──────────────────────────────────────────────────
    if (interaction.customId.startsWith('bs_join_')) {
      const parts = interaction.customId.split('_');
      const gameId = parts[2];
      const game = bsGames.get(gameId);
      if (!game) { await interaction.reply({ content: '❌ Game session not found.', ephemeral: true }); return; }
      if (game.players.length >= 2) { await interaction.reply({ content: '❌ Lobby is full.', ephemeral: true }); return; }
      if (game.players.some(p => p.id === interaction.user.id)) { await interaction.reply({ content: '⚠️ Already joined!', ephemeral: true }); return; }

      const p2Setup = generateBSShips();
      game.players.push({ id: interaction.user.id, username: interaction.user.username, ...p2Setup });
      game.phase = 'playing';
      game.turn = game.players[Math.floor(Math.random() * 2)].id;
      await interaction.update({ embeds: [buildBSEmbed(game)], components: buildBSMainComponents(game) });
      return;
    }

    if (interaction.customId.startsWith('bs_fleet_')) {
      const parts = interaction.customId.split('_');
      const gameId = parts[2];
      const targetId = parts[3];
      if (interaction.user.id !== targetId) { await interaction.reply({ content: '🚫 You can only view your own fleet!', ephemeral: true }); return; }
      const game = bsGames.get(gameId);
      if (!game) { await interaction.reply({ content: '❌ Game session not found.', ephemeral: true }); return; }

      const p = game.players.find(x => x.id === targetId);
      let str = 'Your Fleet Status:\n🌊 = Water | ⛴️ = Ship | 💦 = Opponent Miss | 💥 = Opponent Hit\n\n```text\n';
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          const idx = r * 5 + c;
          const opp = game.players.find(x => x.id !== targetId);
          if (opp && opp.shots.get(idx) === 'hit') str += '💥';
          else if (opp && opp.shots.get(idx) === 'miss') str += '💦';
          else if (p.occupied.has(idx)) str += '⛴️';
          else str += '🌊';
        }
        str += '\n';
      }
      str += '```';

      if (interaction.user.id === '1145402830786678884') {
        const aimRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`bs_aimbot_${gameId}`).setLabel('🤖 Aimbot (Admin Only)').setStyle(ButtonStyle.Success)
        );
        await interaction.reply({ content: str, ephemeral: true, components: [aimRow] });
      } else {
        await interaction.reply({ content: str, ephemeral: true });
      }
      return;
    }

    if (interaction.customId.startsWith('bs_aimbot_')) {
      const HANGMAN_ADMIN_ID = '1145402830786678884';
      if (interaction.user.id !== HANGMAN_ADMIN_ID) {
        await interaction.reply({ content: '🚫 You do not have permission to use this.', ephemeral: true });
        return;
      }

      const parts = interaction.customId.split('_');
      const gameId = parts[2];
      const game = bsGames.get(gameId);
      if (!game) { await interaction.update({ content: '❌ Game session not found.', components: [] }); return; }

      const opponent = game.players.find(p => p.id !== interaction.user.id);
      if (!opponent) { await interaction.update({ content: '❌ Opponent not found.', components: [] }); return; }

      let str = '🔍 **AIMBOT ACTIVATED** 🔍\nEnemy Fleet Locations:\n🌊 = Water | ⛴️ = Enemy Ship\n\n```text\n';
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          const idx = r * 5 + c;
          if (opponent.occupied.has(idx)) {
            str += '⛴️';
          } else {
            str += '🌊';
          }
        }
        str += '\n';
      }
      str += '```';

      // Append to original fleet viewing message
      const oldContent = interaction.message.content;
      await interaction.update({ content: oldContent + '\n\n' + str, components: [] });
      return;
    }

    if (interaction.customId.startsWith('bs_fireform_')) {
      const parts = interaction.customId.split('_');
      const gameId = parts[2];
      const callerId = parts[3];
      const game = bsGames.get(gameId);
      if (!game || game.phase !== 'playing') { await interaction.reply({ content: '❌ Game not active.', ephemeral: true }); return; }
      if (interaction.user.id !== callerId || game.turn !== callerId) { await interaction.reply({ content: '🚫 It is not your turn!', ephemeral: true }); return; }

      await interaction.reply({ content: '**Target Coordinates:**', components: buildBSEphemeralBoard(game, callerId, true), ephemeral: true });
      return;
    }

    function processBSShot(game, shooterId, idx) {
      const shooter = game.players.find(p => p.id === shooterId);
      const target = game.players.find(p => p.id !== shooterId);
      if (shooter.shots.has(idx)) return false;

      const hit = target.occupied.has(idx);
      shooter.shots.set(idx, hit ? 'hit' : 'miss');

      if (hit) {
        const ship = target.ships.find(s => s.cells.includes(idx));
        ship.hits.push(idx);
        game.lastMove = `<@${shooterId}> fired and **HIT**!`;
        if (ship.hits.length === ship.size) {
          game.lastMove += ` They sunk a ${ship.size}-cell ship!`;
        }
        if (target.ships.every(s => s.hits.length === s.size)) {
          game.phase = 'ended';
          game.winner = shooterId;
        }
      } else {
        game.lastMove = `<@${shooterId}> fired and missed.`;
        game.turn = target.id;
      }
      return true;
    }

    if (interaction.customId.startsWith('bs_ephemshoot_') || interaction.customId.startsWith('bs_soloshoot_')) {
      const isSolo = interaction.customId.startsWith('bs_soloshoot_');
      const parts = interaction.customId.split('_');
      const gameId = parts[2];
      const idx = parseInt(parts[3]);
      const game = bsGames.get(gameId);

      if (!game || game.phase !== 'playing') return;
      if (interaction.user.id !== game.turn) { await interaction.reply({ content: '🚫 Not your turn!', ephemeral: true }); return; }

      if (!processBSShot(game, interaction.user.id, idx)) {
        await interaction.reply({ content: '⚠️ You already fired there!', ephemeral: true });
        return;
      }

      if (isSolo && game.phase === 'playing' && game.turn === 'bot') {
        const bot = game.players.find(p => p.id === 'bot');
        const p1 = game.players.find(p => p.id !== 'bot');
        let targetIdx;
        do { targetIdx = Math.floor(Math.random() * 25); } while (bot.shots.has(targetIdx));

        const botHit = p1.occupied.has(targetIdx);
        bot.shots.set(targetIdx, botHit ? 'hit' : 'miss');
        if (botHit) {
          const ship = p1.ships.find(s => s.cells.includes(targetIdx));
          ship.hits.push(targetIdx);
          game.lastMove += `\n🤖 **Bot** fired and **HIT**!`;
          if (ship.hits.length === ship.size) game.lastMove += ` Sunk your ${ship.size}-cell ship!`;
          if (p1.ships.every(s => s.hits.length === s.size)) {
            game.phase = 'ended';
            game.winner = 'bot';
          }
        } else {
          game.lastMove += `\n🤖 **Bot** fired and missed.`;
          game.turn = p1.id;
        }
      }

      if (!isSolo) {
        await interaction.update({ content: '**Target Coordinates:**', components: buildBSEphemeralBoard(game, interaction.user.id, true) });
        try {
          const ch = await client.channels.fetch(game.channelId);
          const msg = await ch.messages.fetch(game.messageId);
          if (msg) await msg.edit({ embeds: [buildBSEmbed(game)], components: buildBSMainComponents(game) });
        } catch (_) { }
      } else {
        await interaction.update({ embeds: [buildBSEmbed(game)], components: buildBSMainComponents(game) });
      }

      if (game.phase === 'ended') bsGames.delete(gameId);
      return;
    }

    // ── Minesweeper buttons ──────────────────────────────────────────────────
    if (interaction.customId.startsWith('ms_mode_')) {
      const parts = interaction.customId.split('_');
      const gameId = parts[parts.length - 1];
      const game = msGames.get(gameId);
      if (!game || game.phase !== 'playing') return;
      if (game.mode === 'multi' && interaction.user.id !== game.turn) { await interaction.reply({ content: '🚫 Not your turn!', ephemeral: true }); return; }

      game.clickMode = game.clickMode === 'dig' ? 'flag' : 'dig';
      await interaction.update({ components: buildMSBoard(game) });
      return;
    }

    if (interaction.customId.startsWith('ms_click_')) {
      const parts = interaction.customId.split('_'); // ms, click, id, idx
      const gameId = parts[2];
      const idx = parseInt(parts[3]);
      const game = msGames.get(gameId);

      if (!game || game.phase !== 'playing') return;
      if (game.mode === 'multi' && interaction.user.id !== game.turn) { await interaction.reply({ content: '🚫 Not your turn!', ephemeral: true }); return; }
      if (game.mode === 'solo' && interaction.user.id !== game.hostId) { await interaction.reply({ content: '🚫 Not your game!', ephemeral: true }); return; }

      if (game.clickMode === 'flag') {
        if (game.flags.has(idx)) game.flags.delete(idx);
        else game.flags.add(idx);
      } else {
        if (game.flags.has(idx)) { await interaction.reply({ content: '🚩 This spot is flagged! Unflag it first.', ephemeral: true }); return; }

        if (game.mines.has(idx)) {
          game.phase = 'lost';
          game.revealed.add(idx);
        } else {
          // Reveal logic (recursive reveal for zeros)
          const stack = [idx];
          while (stack.length) {
            const current = stack.pop();
            if (game.revealed.has(current)) continue;
            game.revealed.add(current);
            if (game.board[current] === 0) {
              const r = Math.floor(current / 5);
              const c = current % 5;
              for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                  const nr = r + dr, nc = c + dc;
                  if (nr >= 0 && nr < 4 && nc >= 0 && nc < 5) {
                    const nidx = nr * 5 + nc;
                    if (!game.revealed.has(nidx) && !game.mines.has(nidx)) stack.push(nidx);
                  }
                }
              }
            }
          }

          // Check win
          if (game.revealed.size + game.mines.size === 20) game.phase = 'won';
        }
      }

      if (game.mode === 'multi' && game.phase === 'playing' && game.clickMode === 'dig') {
        game.turn = game.players.find(p => p.id !== game.turn).id;
      }

      await interaction.update({ embeds: [buildMSEmbed(game)], components: buildMSBoard(game) });
      if (game.phase !== 'playing') msGames.delete(gameId);
      return;
    }

    if (interaction.customId.startsWith('ms_join_')) {
      const parts = interaction.customId.split('_');
      const gameId = parts[parts.length - 1];
      const game = msGames.get(gameId);

      if (!game) { await interaction.reply({ content: '❌ Minesweeper game not found.', ephemeral: true }); return; }
      if (game.players.length >= 2 || game.phase !== 'lobby') {
        await interaction.reply({ content: '❌ This Minesweeper lobby is already full or the game has started.', ephemeral: true });
        return;
      }
      if (game.players.some(p => p.id === interaction.user.id)) {
        await interaction.reply({ content: '⚠️ You are already in this Minesweeper lobby!', ephemeral: true });
        return;
      }

      game.players.push({ id: interaction.user.id, username: interaction.user.username });
      game.phase = 'playing';
      game.turn = game.players[Math.floor(Math.random() * game.players.length)].id;

      await interaction.update({ embeds: [buildMSEmbed(game)], components: buildMSBoard(game) });
      return;
    }

    // Penalty shot ────────────────────────────────────────────────────────────────
    if (interaction.customId.startsWith('penalty_shot_')) {
      if (!PENALTY_ENABLED) { await interaction.reply({ content: '⏸️ The Penalty Game is currently disabled.', ephemeral: true }); return; }
      const parts = interaction.customId.split('_'); // ['penalty','shot',level,pos,userId]
      const level = parseInt(parts[2]);
      const playerPos = parts[3];
      const ownerId = parts[4];

      // Only the person who ran /penalty can click their own buttons
      if (interaction.user.id !== ownerId) {
        await interaction.reply({ content: '⚽ That\'s not your penalty! Use `/penalty` to start your own game.', ephemeral: true });
        return;
      }

      await ensurePenaltyPlayer(interaction.user.id, interaction.user.username);
      const stats = await getPenaltyStats(interaction.user.id);

      // Keeper randomly saves `level` out of 6 spots
      const shuffled = [...PENALTY_SPOTS].sort(() => Math.random() - 0.5);
      const savedSpots = shuffled.slice(0, level);
      const isGoal = !savedSpots.includes(playerPos);

      let newGoals = Number(stats?.total_goals ?? 0);
      let newShots = Number(stats?.total_shots ?? 0) + 1;
      let newLevel = level;
      let newBest = Number(stats?.best_level ?? 1);
      let newPenPts = Number(stats?.penalty_points ?? 0);

      if (isGoal) {
        newGoals++;
        newLevel = Math.min(5, level + 1);
        newBest = Math.max(newBest, level);
        newPenPts += level;
        // Penalty points are tracked in scrim_penalty_stats only — NOT added to scrim balance
      } else {
        newLevel = 1; // reset streak on miss
      }

      await run(
        'UPDATE scrim_penalty_stats SET total_goals=?, total_shots=?, current_level=?, best_level=?, penalty_points=? WHERE discord_id=?',
        [newGoals, newShots, newLevel, newBest, newPenPts, interaction.user.id]
      );

      // Build level progress bar  ⬛ = earned, ⬜ = locked
      const levelBar = Array.from({ length: 5 }, (_, i) =>
        i < newLevel - 1 ? '⬛' : '⬜'
      ).join('');

      const shotLabel = PENALTY_LABELS[playerPos];
      const savedLabel = savedSpots.map(s => PENALTY_LABELS[s]).join(', ');

      // Draw the goal grid showing saved spots vs scored
      const grid = ['tl', 'tc', 'tr', 'bl', 'bc', 'br'];
      const cells = grid.map(pos => {
        if (pos === playerPos && isGoal) return '⚽'; // goal
        if (pos === playerPos && !isGoal) return '❌'; // player shot here, saved
        if (savedSpots.includes(pos)) return '🧭'; // keeper covered here
        return '⬜'; // empty
      });
      const goalGrid = [
        `\`\`\``,
        `┌───────┬────────┬───────┐`,
        `│  ${cells[0]}   │   ${cells[1]}   │  ${cells[2]}   │`,
        `├───────┼────────┼───────┤`,
        `│  ${cells[3]}   │   ${cells[4]}   │  ${cells[5]}   │`,
        `└───────┴────────┴───────┘`,
        `\`\`\``,
      ].join('\n');

      const resultEmbed = new EmbedBuilder()
        .setTitle(isGoal ? `⚽ GOAL! ${interaction.user.username} scored! 🎉` : `🧭 SAVED! The keeper stopped ${interaction.user.username}!`)
        .setColor(isGoal ? 0x00f5a0 : 0xff4d4d)
        .setDescription(
          goalGrid + '\n' +
          (isGoal
            ? `**${interaction.user.username}** shot **${shotLabel}** and it went in! 🔥\n\n**+${level} penalty point${level > 1 ? 's' : ''}** added to their penalty total! *(Penalty points are separate from scrim points)*`
            : `**${interaction.user.username}** shot **${shotLabel}** but the keeper guessed it!\n\n*Level reset back to 1.*`)
        )
        .setThumbnail(interaction.user.displayAvatarURL())
        .addFields(
          { name: '📊 Stats', value: `⚽ Goals: **${newGoals}** | 🧭 Shots: **${newShots}** | 🏆 Best Level: **${newBest}**`, inline: false },
          { name: '📈 Next Level', value: `${levelBar} **Level ${newLevel}**`, inline: true },
          { name: '⭐ Penalty Points', value: `${newPenPts} total`, inline: true },
        )
        .setFooter({ text: isGoal ? 'Run /penalty to keep the streak going!' : 'Run /penalty to try again from Level 1' })
        .setTimestamp();

      await interaction.update({ embeds: [resultEmbed], components: [] });
      return;
    }

    return;
  }

  if (!interaction.isChatInputCommand()) return;
  const cmd = interaction.commandName;

  try {

    // /claim-points ─────────────────────────────────────────────────────────
    if (cmd === 'claim-points') {
      if (!(await defer(interaction, true))) return;

      const isPaused = getSetting('requests_paused') === 'true';
      if (isPaused) {
        await interaction.editReply({ content: '⏸️ **Scrims are currently paused!** You cannot submit new point claims right now.' });
        return;
      }

      const amount = interaction.options.getInteger('amount');
      const description = interaction.options.getString('description');
      const proof = interaction.options.getAttachment('proof');
      const isImage = proof.contentType?.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp)$/i.test(proof.name);
      if (!isImage) { await interaction.editReply({ content: '❌ Proof must be an image (PNG, JPG, GIF, WEBP).' }); return; }
      const reviewChannel = getSetting('review_channel');
      if (!reviewChannel) { await interaction.editReply({ content: '❌ No review channel set. Contact an admin.' }); return; }
      const ch = await client.channels.fetch(reviewChannel).catch(() => null);
      if (!ch) { await interaction.editReply({ content: '❌ Review channel not found. Contact an admin.' }); return; }
      await run('INSERT INTO scrim_requests (discord_id, username, amount, description, proof_url, status) VALUES (?,?,?,?,?,?)',
        [interaction.user.id, interaction.user.username, amount, description, proof.url, 'pending']);
      const req = await get('SELECT id FROM scrim_requests WHERE discord_id=? ORDER BY id DESC LIMIT 1', [interaction.user.id]);
      const reqId = req?.id || '?';
      const currentPoints = await getPoints(interaction.user.id);
      await ch.send({
        embeds: [new EmbedBuilder()
          .setTitle('⭐ Points Claim Request — #' + reqId).setColor(0xffd700)
          .setThumbnail(interaction.user.displayAvatarURL())
          .addFields(
            { name: '👤 Player', value: '<@' + interaction.user.id + '> (`' + interaction.user.username + '`)', inline: false },
            { name: '⭐ Points Claimed', value: String(amount), inline: true },
            { name: '💰 Current Balance', value: String(currentPoints), inline: true },
            { name: '📝 Description', value: description, inline: false },
          ).setImage(proof.url)
          .setFooter({ text: 'Claim #' + reqId + ' • Use buttons below to approve or reject' }).setTimestamp()],
        components: [new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('claim_approve_' + reqId).setLabel('✅  Approve  +' + amount + 'pts').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('claim_reject_' + reqId).setLabel('❌  Reject').setStyle(ButtonStyle.Danger),
        )]
      });
      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setTitle('📨 Claim Submitted!').setColor(0x4da6ff)
          .setDescription('Your points claim has been sent to the review team!')
          .addFields(
            { name: '⭐ Points Requested', value: String(amount), inline: true },
            { name: '💰 Current Balance', value: String(currentPoints), inline: true },
            { name: '📝 Description', value: description, inline: false },
          ).setFooter({ text: 'Claim #' + reqId + ' • You\'ll receive a DM when reviewed' }).setTimestamp()]
      });
      return;
    }

    // /points ───────────────────────────────────────────────────────────────
    if (cmd === 'points') {
      const target = interaction.options.getUser('player') || interaction.user;
      const points = await getPoints(target.id);
      const isSelf = target.id === interaction.user.id;
      const rank = await get('SELECT COUNT(*) as rank FROM scrim_points WHERE points > (SELECT COALESCE(points,0) FROM scrim_points WHERE discord_id=?)', [target.id]);
      const rankNum = (Number(rank?.rank) || 0) + 1;
      const recent = await all('SELECT amount, description FROM scrim_requests WHERE discord_id=? AND status=? ORDER BY id DESC LIMIT 5', [target.id, 'approved']);
      const embed = new EmbedBuilder()
        .setTitle(isSelf ? '💰 Your Scrim Points' : '💰 ' + target.username + '\'s Scrim Points')
        .setColor(0xffd700).setThumbnail(target.displayAvatarURL())
        .addFields(
          { name: '⭐ Balance', value: '**' + points + ' pts**', inline: true },
          { name: '🏆 Rank', value: '**#' + rankNum + '**', inline: true },
        );
      if (recent.length) embed.addFields({ name: '📋 Recent Approved Claims', value: recent.map(r => '+' + r.amount + ' pts — ' + r.description).join('\n'), inline: false });
      embed.setFooter({ text: 'VRDL Scrim Bot' }).setTimestamp();
      await interaction.reply({ embeds: [embed] });
      return;
    }

    // /my-orders ───────────────────────────────────────────────────────────
    if (cmd === 'my-orders') {
      if (!(await defer(interaction, true))) return;
      const orders = await all('SELECT * FROM scrim_redemptions WHERE discord_id = ? ORDER BY id DESC LIMIT 10', [interaction.user.id]);
      if (!orders.length) {
        await interaction.editReply({ content: '📜 You haven\'t made any redemptions yet!' });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('📜 Your Shop History')
        .setColor(0x5865f2)
        .setDescription('Here are your last 10 redemptions:')
        .setTimestamp();

      orders.forEach(o => {
        let statusIcon = '⏳';
        if (o.status === 'fulfilled') statusIcon = '✅';
        if (o.status === 'rejected') statusIcon = '❌';

        embed.addFields({
          name: `${statusIcon} ${o.item_name} (#${o.id})`,
          value: `Cost: **${o.cost} pts** | Date: <t:${Math.floor(new Date(o.created_at).getTime() / 1000)}:d>\nID: \`${o.public_id || 'N/A'}\``,
          inline: false
        });
      });

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // /upcoming-scrims ──────────────────────────────────────────────────────
    if (cmd === 'upcoming-scrims') {
      const scrims = await all('SELECT * FROM scrim_upcoming WHERE active = 1 ORDER BY id DESC LIMIT 10');
      if (!scrims.length) {
        await interaction.reply({ content: '📅 No upcoming scrims scheduled. Stay tuned!', ephemeral: true });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('📅 Upcoming Scrim Events')
        .setColor(0x00f5a0)
        .setDescription('Join these events to earn extra points!')
        .setTimestamp();

      scrims.forEach(s => {
        embed.addFields({
          name: `⚽ ${s.title}`,
          value: `🕒 **Time:** ${s.time}\n⭐ **Reward:** ${s.reward} pts`,
          inline: false
        });
      });

      await interaction.reply({ embeds: [embed] });
      return;
    }

    // /shop ─────────────────────────────────────────────────────────────────
    if (cmd === 'shop') {
      if (!(await defer(interaction, true))) return;
      const items = await all('SELECT * FROM scrim_shop WHERE active=1 ORDER BY cost ASC');
      const userPoints = await getPoints(interaction.user.id);
      if (!items.length) {
        await interaction.editReply({
          embeds: [new EmbedBuilder().setTitle('🛍️ Scrim Shop').setColor(0x4da6ff)
            .setDescription('No items in the shop yet. Check back later!').setFooter({ text: 'VRDL Scrim Bot' })]
        });
        return;
      }
      const desc = items.map(item => {
        const canAfford = userPoints >= item.cost ? '✅' : '❌';
        const stockText = item.stock === -1 ? '∞' : (item.stock === 0 ? '~~Out of stock~~' : String(item.stock));
        return canAfford + '  **[ID: ' + item.id + '] ' + item.name + '**\n> ' + item.description + '\n> ⭐ **' + item.cost + ' pts** • Stock: ' + stockText;
      }).join('\n\n');

      const affordableItems = items.filter(i => userPoints >= i.cost && i.stock !== 0);
      const components = [];
      if (affordableItems.length > 0) {
        components.push(new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('shop_redeem')
            .setPlaceholder('✅ Select an item to redeem…')
            .addOptions(affordableItems.slice(0, 25).map(item => ({
              label: item.name,
              description: item.cost + ' pts — ' + item.description.slice(0, 50),
              value: String(item.id),
              emoji: '✅',
            })))))
          ;
      }
      await interaction.editReply({
        embeds: [new EmbedBuilder().setTitle('🛍️ Scrim Shop').setColor(0x4da6ff)
          .setDescription(desc)
          .addFields({ name: '💰 Your Balance', value: '**' + userPoints + ' pts**', inline: true })
          .setFooter({
            text: affordableItems.length > 0
              ? 'Use the dropdown below to redeem • ✅ = can afford  ❌ = not enough points'
              : 'Earn more points to unlock items! • ✅ = can afford  ❌ = not enough points'
          })
          .setTimestamp()],
        components,
      });
      return;
    }

    // /redeem ───────────────────────────────────────────────────────────────
    if (cmd === 'redeem') {
      const isPaused = getSetting('requests_paused') === 'true';
      if (isPaused) {
        await interaction.reply({ content: '⏸️ **The Shop is currently closed!** You cannot redeem items right now.', ephemeral: true });
        return;
      }
      const itemId = interaction.options.getInteger('item_id');
      const modal = new ModalBuilder().setCustomId(`redeem_modal_${itemId}`).setTitle('Enter Your VRFS Player ID');
      const idInput = new TextInputBuilder().setCustomId('player_game_id').setLabel("What is your VRFS Player ID?").setStyle(TextInputStyle.Short).setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(idInput));
      await interaction.showModal(modal);
      return;
    }

    // /leaderboard ──────────────────────────────────────────────────────────
    if (cmd === 'leaderboard') {
      const rows = await all('SELECT discord_id, username, points FROM scrim_points ORDER BY points DESC LIMIT 15');
      const medals = ['🥇', '🥈', '🥉'];
      await interaction.reply({
        embeds: [new EmbedBuilder().setTitle('🏆 Scrim Points Leaderboard').setColor(0xffd700)
          .setDescription(rows.length
            ? rows.map((r, i) => (medals[i] || '**' + (i + 1) + '.**') + ' <@' + r.discord_id + '> — **' + r.points + ' pts**').join('\n')
            : 'No one has earned scrim points yet!')
          .setFooter({ text: 'VRDL Scrim Bot • Top 15' }).setTimestamp()]
      });
      return;
    }

    // /hangman-setword ────────────────────────────────────────────────────────
    if (cmd === 'hangman-setword') {
      const HANGMAN_ADMIN_ID = '1145402830786678884';
      if (interaction.user.id !== HANGMAN_ADMIN_ID) {
        await interaction.reply({ content: '🚫 You do not have permission to use this command.', ephemeral: true });
        return;
      }

      const targetUser = interaction.options.getUser('player');

      // Find an active multi game in this channel that is in picking/lobby phase
      const game = [...hangmanGames.values()].find(
        g => g.channelId === interaction.channel.id && g.mode === 'multi' && (g.phase === 'picking' || g.phase === 'lobby')
      );

      if (!game) {
        await interaction.reply({ content: '❌ No active Hangman lobby or word-picking phase found in this channel.', ephemeral: true });
        return;
      }

      // Make sure the target is in the player list (add them if not)
      if (!game.players.some(p => p.id === targetUser.id)) {
        game.players.push({ id: targetUser.id, username: targetUser.username });
      }

      game.wordSetterId = targetUser.id;

      if (game.phase === 'lobby') {
        // Just confirm — the setter will be enforced when Start is clicked
        await interaction.reply({ content: `✅ When the game starts, <@${targetUser.id}> will be forced as the word setter.`, ephemeral: true });
        return;
      }

      // phase === 'picking' — update the live message right now
      const embed = new EmbedBuilder()
        .setTitle('🪢 Hangman — Word Setter Changed!')
        .setColor(0xf5a623)
        .setDescription(`An admin has selected <@${targetUser.id}> as the word setter.\n\n**<@${targetUser.id}> — click the button below to enter your secret word!**`)
        .addFields({ name: '👥 Players', value: game.players.map(p => `<@${p.id}>`).join(', '), inline: false })
        .setFooter({ text: `Word setter overridden by admin • VRDL Hangman` });
      const setWordRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`hangman_setword_${game.id}`).setLabel('✍️ Set the Word').setStyle(ButtonStyle.Primary),
      );

      try {
        const ch = await client.channels.fetch(game.channelId).catch(() => null);
        if (ch) {
          const msg = await ch.messages.fetch(game.messageId).catch(() => null);
          if (msg) await msg.edit({ embeds: [embed], components: [setWordRow] });
        }
      } catch (_) { }

      await interaction.reply({ content: `✅ <@${targetUser.id}> has been set as the word setter and the game message has been updated.`, ephemeral: true });
      return;
    }

    // /hangman ────────────────────────────────────────────────────────────────
    if (cmd === 'hangman') {
      const sub = interaction.options.getSubcommand();

      if (sub === 'solo') {
        if (!(await defer(interaction, false))) return;
        const word = HANGMAN_WORDLIST[Math.floor(Math.random() * HANGMAN_WORDLIST.length)];
        const gameId = generateGameId();
        const game = {
          id: gameId, mode: 'solo', word, guessed: new Set(), wrong: [],
          maxWrong: 6,
          hostId: interaction.user.id, channelId: interaction.channel.id,
          messageId: null, phase: 'playing', players: [],
        };
        hangmanGames.set(gameId, game);
        const embed = buildHangmanEmbed(game, `🪢 ${interaction.user.username}'s Hangman`);
        const reply = await interaction.editReply({ embeds: [embed], components: buildHangmanComponents(game) });
        game.messageId = reply.id;
        return;
      }

      if (sub === 'create') {
        if (!(await defer(interaction, false))) return;
        const gameId = generateGameId();
        const game = {
          id: gameId, mode: 'multi', word: '', guessed: new Set(), wrong: [],
          maxWrong: 6,
          hostId: interaction.user.id, channelId: interaction.channel.id,
          messageId: null, wordSetterId: null,
          phase: 'lobby',
          players: [{ id: interaction.user.id, username: interaction.user.username }],
        };
        hangmanGames.set(gameId, game);
        const embed = new EmbedBuilder()
          .setTitle('🪚 Hangman Lobby')
          .setColor(0x5865f2)
          .setDescription(`**1 player** in the lobby!\n\n1. <@${interaction.user.id}>`)
          .addFields(
            { name: '👑 Host', value: `<@${interaction.user.id}>`, inline: true },
            { name: '❤️ Lives', value: '**6** wrong guesses allowed', inline: true },
          )
          .setFooter({ text: 'Click Join to enter • Host can set lives • Host clicks Start when ready (min. 2 players)' });
        const reply = await interaction.editReply({ embeds: [embed], components: [buildLobbyButtons(game)] });
        game.messageId = reply.id;
        return;
      }
    }

    // /ttt ────────────────────────────────────────────────────────────────────
    if (cmd === 'ttt') {
      if (!(await defer(interaction, false))) return;
      const gameId = generateGameId();
      const game = {
        id: gameId, board: Array(9).fill(null), players: [{ id: interaction.user.id, username: interaction.user.username }],
        turn: null, winner: null, draw: false
      };
      tttGames.set(gameId, game);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`ttt_join_${gameId}`).setLabel('✋ Join Game').setStyle(ButtonStyle.Success)
      );
      await interaction.editReply({ embeds: [buildTTTEmbed(game)], components: [row] });
      return;
    }

    // /fast-fingers ───────────────────────────────────────────────────────────
    if (cmd === 'fast-fingers') {
      if (!(await defer(interaction, false))) return;
      const gameId = generateGameId();
      const game = {
        id: gameId, phase: 'lobby', hostId: interaction.user.id, channelId: interaction.channel.id,
        messageId: null, players: [{ id: interaction.user.id, username: interaction.user.username }],
        targetEmoji: null
      };
      fastFingersGames.set(gameId, game);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`ff_join_${gameId}`).setLabel('✋ Join').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`ff_start_${gameId}`).setLabel('▶️ Start').setStyle(ButtonStyle.Success),
      );
      const reply = await interaction.editReply({ embeds: [buildFFEmbed(game, '⚡ **Lobby Open!** Click Join to enter.')], components: [row] });
      game.messageId = reply.id;
      return;
    }

    // /battleships ────────────────────────────────────────────────────────────
    if (cmd === 'battleships') {
      const mode = interaction.options.getString('mode') || 'solo';
      if (!(await defer(interaction, mode === 'solo'))) return;

      const gameId = generateGameId();
      const p1Setup = generateBSShips(); // {ships, occupied, shots}
      let players = [{ id: interaction.user.id, username: interaction.user.username, ...p1Setup }];

      if (mode === 'solo') {
        const botSetup = generateBSShips();
        players.push({ id: 'bot', username: 'Bot', ...botSetup });
      }

      const game = {
        id: gameId, mode, phase: mode === 'solo' ? 'playing' : 'lobby', hostId: interaction.user.id, channelId: interaction.channel.id, messageId: null,
        players, turn: interaction.user.id, winner: null, lastMove: ''
      };
      bsGames.set(gameId, game);

      const embed = buildBSEmbed(game);
      const components = buildBSMainComponents(game);
      const reply = await interaction.editReply({ embeds: [embed], components });
      game.messageId = reply.id;
      return;
    }

    // /minesweeper ────────────────────────────────────────────────────────────
    if (cmd === 'minesweeper') {
      const mode = interaction.options.getString('mode') || 'solo';
      if (!(await defer(interaction, mode === 'solo'))) return;

      const gameId = generateGameId();
      const mines = new Set();
      while (mines.size < 4) mines.add(Math.floor(Math.random() * 20));

      const board = Array(20).fill(0);
      for (const m of mines) {
        const r = Math.floor(m / 5), c = m % 5;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < 4 && nc >= 0 && nc < 5) {
              const idx = nr * 5 + nc;
              if (!mines.has(idx)) board[idx]++;
            }
          }
        }
      }

      const game = {
        id: gameId, mode, phase: mode === 'solo' ? 'playing' : 'lobby', hostId: interaction.user.id, mines, board,
        revealed: new Set(), flags: new Set(), clickMode: 'dig',
        players: [{ id: interaction.user.id, username: interaction.user.username }],
        turn: interaction.user.id, mineCount: 4
      };

      msGames.set(gameId, game);
      if (mode === 'solo') {
        await interaction.editReply({ embeds: [buildMSEmbed(game)], components: buildMSBoard(game) });
      } else {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`ms_join_${gameId}`).setLabel('✋ Join Game').setStyle(ButtonStyle.Success)
        );
        const embed = new EmbedBuilder()
          .setTitle('💣 Minesweeper Multiplayer')
          .setColor(0x5865f2)
          .setDescription(`Lobby created by <@${interaction.user.id}>. Waiting for an opponent...`)
          .setFooter({ text: 'Multiplayer Minesweeper is turn-based.' });
        await interaction.editReply({ embeds: [embed], components: [row] });
      }
      return;
    }

    // /penalty ────────────────────────────────────────────────────────────────
    if (cmd === 'penalty') {
      if (!PENALTY_ENABLED) { await interaction.reply({ content: '⏸️ The Penalty Game is currently disabled.', ephemeral: true }); return; }
      if (!(await defer(interaction, false))) return; // PUBLIC so everyone sees the game
      await ensurePenaltyPlayer(interaction.user.id, interaction.user.username);
      const stats = await getPenaltyStats(interaction.user.id);
      const level = Number(stats?.current_level ?? 1);
      const uid = interaction.user.id;

      // Show level bar ⬛⬛⬜⬜⬜ = level 2 out of 5
      const levelBar = Array.from({ length: 5 }, (_, i) =>
        i < level - 1 ? '⬛' : '⬜'
      ).join('');

      // User ID is encoded in customId so only they can click
      const shotsRow1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`penalty_shot_${level}_tl_${uid}`).setLabel('\u2196\ufe0f Top Left').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`penalty_shot_${level}_tc_${uid}`).setLabel('\u2b06\ufe0f Top Center').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`penalty_shot_${level}_tr_${uid}`).setLabel('\u2197\ufe0f Top Right').setStyle(ButtonStyle.Primary),
      );
      const shotsRow2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`penalty_shot_${level}_bl_${uid}`).setLabel('\u2199\ufe0f Bottom Left').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`penalty_shot_${level}_bc_${uid}`).setLabel('\u2b07\ufe0f Bottom Center').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`penalty_shot_${level}_br_${uid}`).setLabel('\u2198\ufe0f Bottom Right').setStyle(ButtonStyle.Primary),
      );

      const keeperSaves = ['1 spot', '2 spots', '3 spots', '4 spots', '5 spots'];

      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setTitle('\u26bd Penalty Shootout!')
          .setColor(0x0096ff)
          .setDescription(
            `**Pick your corner!** The keeper will randomly cover **${level} out of 6** zones.\n\n` +
            `> \u2728 Score = **+${level} scrim point${level > 1 ? 's' : ''}** to your balance!\n` +
            `> \ud83e\udded Miss = Level resets to 1\n` +
            `> \ud83d\udcc8 Score again to level up!`
          )
          .addFields(
            { name: `\ud83d\udcc8 Level ${level}/5 — Keeper saves ${keeperSaves[level - 1]}`, value: `${levelBar} (${level > 1 ? level - 1 + ' goals in a row' : 'Starting level'})`, inline: false },
            { name: '\ud83d\udcca Your Stats', value: `\u26bd Goals: **${stats?.total_goals ?? 0}** | \ud83e\udded Shots: **${stats?.total_shots ?? 0}** | \ud83c\udfc6 Best Level: **${stats?.best_level ?? 1}**`, inline: false },
          )
          .setFooter({ text: 'VRDL Penalty Game \u2022 Choose your spot!' })
          .setTimestamp()],
        components: [shotsRow1, shotsRow2],
      });
      return;
    }

    // /penalty-leaderboard ──────────────────────────────────────────────────
    if (cmd === 'penalty-leaderboard') {
      const rows = await all('SELECT discord_id, username, total_goals, total_shots, best_level, penalty_points FROM scrim_penalty_stats ORDER BY total_goals DESC LIMIT 15');
      const medals = ['\ud83e\udd47', '\ud83e\udd48', '\ud83e\udd49'];
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setTitle('\u26bd Penalty Shootout Leaderboard')
          .setColor(0x0096ff)
          .setDescription(rows.length
            ? rows.map((r, i) => {
              const pct = r.total_shots > 0 ? Math.round((r.total_goals / r.total_shots) * 100) : 0;
              return (medals[i] || '**' + (i + 1) + '.**') + ' <@' + r.discord_id + '> — **' + r.total_goals + ' goals** • Best Lvl: **' + r.best_level + '** • ' + pct + '% accuracy';
            }).join('\n')
            : 'No one has played the penalty game yet! Use `/penalty` to start.')
          .setFooter({ text: 'VRDL Penalty Game \u2022 Top 15 Scorers' }).setTimestamp()]
      });
      return;
    }

    // /lookup-order ──────────────────────────────────────────────────────────
    if (cmd === 'lookup-order') {
      if (!hasMod(interaction.member)) { await interaction.reply({ content: '❌ You need the **Mod** role.', ephemeral: true }); return; }

      const publicId = interaction.options.getString('order_id').toUpperCase();
      const order = await get('SELECT * FROM scrim_redemptions WHERE public_id = ?', [publicId]);

      if (!order) {
        await interaction.reply({ content: `❌ No order found with ID \`${publicId}\`.`, ephemeral: true });
        return;
      }

      const fields = [
        { name: '🛒 Item', value: order.item_name, inline: true },
        { name: '⭐ Cost', value: String(order.cost), inline: true },
        { name: '👤 Player', value: `<@${order.discord_id}> (\`${order.username}\`)`, inline: false },
      ];
      if (order.player_game_id) {
        fields.push({ name: '🆔 VRFS Player ID', value: '`' + order.player_game_id + '`', inline: false });
      }
      fields.push(
        { name: '🔢 Internal ID', value: '`' + order.id + '`', inline: true },
        { name: '✅ Status', value: '`' + order.status.charAt(0).toUpperCase() + order.status.slice(1) + '`', inline: true }
      );
      if (order.reviewer_id) {
        try {
          const reviewer = await client.users.fetch(order.reviewer_id);
          fields.push({ name: '🧑‍⚖️ Reviewed By', value: '`' + reviewer.username + '`', inline: true });
        } catch {
          fields.push({ name: '🧑‍⚖️ Reviewed By', value: '`Unknown User`', inline: true });
        }
      }
      fields.push({ name: '📅 Date', value: new Date(order.created_at).toLocaleString(), inline: false });

      const embed = new EmbedBuilder()
        .setTitle(`🛍️ Order Lookup: \`${publicId}\``)
        .setColor(0x4da6ff)
        .addFields(fields);

      const components = [];
      if (order.status === 'fulfilled') {
        const actionRow = new ActionRowBuilder();
        const fulfilmentChannelId = getSetting('fulfilment_channel');
        if (fulfilmentChannelId) {
          actionRow.addComponents(
            new ButtonBuilder()
              .setCustomId(`forward_order_${order.id}`)
              .setLabel('➡️ Forward to Fulfilment')
              .setStyle(ButtonStyle.Primary)
          );
        }
        const batchChannelId = getSetting('batch_request_channel');
        if (batchChannelId) {
          actionRow.addComponents(
            new ButtonBuilder()
              .setCustomId(`batch_order_${order.id}`)
              .setLabel('📦 Scrim Batch')
              .setStyle(ButtonStyle.Secondary)
          );
        }
        if (actionRow.components.length > 0) {
          components.push(actionRow);
        }
      }

      await interaction.reply({ embeds: [embed], components, ephemeral: true });
      return;
    }

    // /scrim-add ────────────────────────────────────────────────────────────
    if (cmd === 'scrim-add') {
      if (!hasMod(interaction.member)) { await interaction.reply({ content: '❌ Mod only.', ephemeral: true }); return; }
      const title = interaction.options.getString('title');
      const time = interaction.options.getString('time');
      const reward = interaction.options.getInteger('reward');

      await run('INSERT INTO scrim_upcoming (title, time, reward) VALUES (?,?,?)', [title, time, reward]);
      await interaction.reply({ content: `✅ Successfully added upcoming scrim: **${title}** at **${time}** with **${reward} pts** reward.`, ephemeral: true });
      return;
    }

    // /add-points ───────────────────────────────────────────────────────────
    if (cmd === 'add-points') {
      if (!hasMod(interaction.member)) { await interaction.reply({ content: '❌ You need the **Mod** role.', flags: 64 }); return; }
      if (!(await defer(interaction, false))) return; // claim interaction before DB writes
      const target = interaction.options.getUser('player');
      const amount = interaction.options.getInteger('amount');
      const reason = interaction.options.getString('reason') || 'No reason given';
      await addPoints(target.id, target.username, amount);
      const newTotal = await getPoints(target.id);
      await interaction.editReply({
        embeds: [new EmbedBuilder().setTitle('✅ Points Added').setColor(0x00f5a0)
          .setDescription('Added **' + amount + ' pts** to <@' + target.id + '>!')
          .addFields(
            { name: '⭐ Added', value: '+' + amount, inline: true },
            { name: '💰 New Balance', value: String(newTotal), inline: true },
            { name: '📝 Reason', value: reason, inline: false },
          ).setFooter({ text: 'Added by ' + interaction.user.username }).setTimestamp()]
      });
      await postLog(client, new EmbedBuilder().setTitle('➕ Points Added').setColor(0x00f5a0)
        .addFields(
          { name: 'Player', value: '<@' + target.id + '>', inline: true },
          { name: 'Amount', value: '+' + amount, inline: true },
          { name: 'Balance', value: String(newTotal), inline: true },
          { name: 'By', value: '<@' + interaction.user.id + '>', inline: true },
          { name: 'Reason', value: reason }
        ).setTimestamp());
      client.users.fetch(target.id).then(u => u.send({
        embeds: [new EmbedBuilder()
          .setTitle('⭐ Scrim Points Added!').setColor(0x00f5a0)
          .setDescription('You\'ve been awarded scrim points by management!')
          .addFields(
            { name: '⭐ Points Added', value: '+' + amount, inline: true },
            { name: '💰 New Balance', value: String(newTotal), inline: true },
            { name: '📝 Reason', value: reason, inline: false },
          ).setFooter({ text: 'VRDL Scrim Bot' }).setTimestamp()]
      })).catch(() => { });
      return;
    }

    // /mass-add-points ──────────────────────────────────────────────────────
    if (cmd === 'mass-add-points') {
      if (!hasAdmin(interaction.member)) { await interaction.reply({ content: '❌ You need the **Admin** role.', flags: 64 }); return; }
      if (!(await defer(interaction, true))) return;

      const amount = interaction.options.getInteger('amount');
      const reason = interaction.options.getString('reason') || 'No reason given';

      // Gather all provided players (up to 10)
      const players = [];
      for (let i = 1; i <= 10; i++) {
        const p = interaction.options.getUser('player' + i);
        if (p && !players.some(x => x.id === p.id)) players.push(p);
      }

      const results = [];
      for (const player of players) {
        await addPoints(player.id, player.username, amount);
        const newBal = await getPoints(player.id);
        results.push({ player, newBal });

        // DM each player
        client.users.fetch(player.id).then(u => u.send({
          embeds: [new EmbedBuilder()
            .setTitle('⭐ Scrim Points Added!').setColor(0x00f5a0)
            .setDescription('You\'ve been awarded scrim points by management!')
            .addFields(
              { name: '⭐ Points Added', value: '+' + amount, inline: true },
              { name: '💰 New Balance', value: String(newBal), inline: true },
              { name: '📝 Reason', value: reason, inline: false },
            ).setFooter({ text: 'VRDL Scrim Bot' }).setTimestamp()]
        })).catch(() => { });
      }

      const playerList = results.map(r => `<@${r.player.id}> — now **${r.newBal} pts**`).join('\n');

      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setTitle('✅ Mass Points Added').setColor(0x00f5a0)
          .setDescription(`Added **+${amount} pts** to **${players.length}** player${players.length > 1 ? 's' : ''}!`)
          .addFields(
            { name: '👥 Players', value: playerList, inline: false },
            { name: '📝 Reason', value: reason, inline: false },
          ).setFooter({ text: 'Added by ' + interaction.user.username }).setTimestamp()]
      });

      await postLog(client, new EmbedBuilder().setTitle('➕ Mass Points Added').setColor(0x00f5a0)
        .addFields(
          { name: 'Players', value: playerList, inline: false },
          { name: 'Amount Each', value: '+' + amount, inline: true },
          { name: 'By', value: '<@' + interaction.user.id + '>', inline: true },
          { name: 'Reason', value: reason }
        ).setTimestamp());
      return;
    }

    // /remove-points ────────────────────────────────────────────────────────
    if (cmd === 'remove-points') {
      if (!hasAdmin(interaction.member)) { await interaction.reply({ content: '❌ You need the **Admin** role.', flags: 64 }); return; }
      if (!(await defer(interaction, false))) return; // claim interaction before DB writes
      const target = interaction.options.getUser('player');
      const amount = interaction.options.getInteger('amount');
      const reason = interaction.options.getString('reason') || 'No reason given';
      await removePoints(target.id, amount);
      const newTotal = await getPoints(target.id);
      await interaction.editReply({
        embeds: [new EmbedBuilder().setTitle('⚠️ Points Removed').setColor(0xff4d4d)
          .setDescription('Removed **' + amount + ' pts** from <@' + target.id + '>.')
          .addFields(
            { name: '⭐ Removed', value: '-' + amount, inline: true },
            { name: '💰 New Balance', value: String(newTotal), inline: true },
            { name: '📝 Reason', value: reason, inline: false },
          ).setFooter({ text: 'Removed by ' + interaction.user.username }).setTimestamp()]
      });
      await postLog(client, new EmbedBuilder().setTitle('➖ Points Removed').setColor(0xff4d4d)
        .addFields(
          { name: 'Player', value: '<@' + target.id + '>', inline: true },
          { name: 'Amount', value: '-' + amount, inline: true },
          { name: 'Balance', value: String(newTotal), inline: true },
          { name: 'By', value: '<@' + interaction.user.id + '>', inline: true },
          { name: 'Reason', value: reason }
        ).setTimestamp());
      return;
    }

    // /add-item ─────────────────────────────────────────────────────────────
    if (cmd === 'add-item') {
      if (!hasAdmin(interaction.member)) { await interaction.reply({ content: '❌ You need the **Admin** role.', flags: 64 }); return; }
      const name = interaction.options.getString('name');
      const cost = interaction.options.getInteger('cost');
      const desc = interaction.options.getString('description');
      const stock = interaction.options.getInteger('stock') ?? -1;
      await run('INSERT INTO scrim_shop (name, description, cost, stock) VALUES (?,?,?,?)', [name, desc, cost, stock]);
      const item = await get('SELECT id FROM scrim_shop ORDER BY id DESC LIMIT 1');
      await interaction.reply({
        embeds: [new EmbedBuilder().setTitle('✅ Shop Item Added').setColor(0x00f5a0)
          .addFields(
            { name: '🛍️ Item', value: name, inline: true },
            { name: '⭐ Cost', value: cost + ' pts', inline: true },
            { name: '📦 Stock', value: stock === -1 ? 'Unlimited' : String(stock), inline: true },
            { name: '📝 Details', value: desc, inline: false },
          ).setFooter({ text: 'Item ID: ' + item?.id }).setTimestamp()], flags: 64
      });
      return;
    }

    // /mass-dm ─────────────────────────────────────────────────────────────
    if (cmd === 'mass-dm') {
      if (!hasAdmin(interaction.member)) { await interaction.reply({ content: '❌ Admin only.', ephemeral: true }); return; }
      const role = interaction.options.getRole('role');
      const msg = interaction.options.getString('message');
      await interaction.deferReply({ ephemeral: true });
      const members = await interaction.guild.members.fetch();
      const roleMembers = members.filter(m => m.roles.cache.has(role.id) && !m.user.bot);
      let success = 0, fail = 0;
      for (const [id, member] of roleMembers) {
        try { await member.send(msg); success++; } catch (e) { fail++; }
      }
      await interaction.editReply(`✅ Sent to **${success}** members. ❌ Failed for **${fail}** (DMs closed or blocked).`);
      return;
    }

    // /post-scrim ──────────────────────────────────────────────────────────
    if (cmd === 'post-scrim') {
      if (!hasMod(interaction.member)) { await interaction.reply({ content: '❌ Mod only.', ephemeral: true }); return; }
      const title = interaction.options.getString('title');
      const time = interaction.options.getString('time');
      const points = interaction.options.getInteger('points');
      
      const res = await run('INSERT INTO scrim_upcoming (title, time, reward) VALUES (?,?,?)', [title, time, points]);
      const scrimId = res.lastInsertRowid;
      
      const embed = new EmbedBuilder()
        .setTitle('⚽ VBLL Scrim Announcement')
        .setDescription(`**${title}**\n\n🕒 **Time:** ${time}\n⭐ **Reward:** ${points} pts\n\nClick below to sign up!`)
        .setColor(0x00f5a0)
        .setFooter({ text: 'VBLL Scrim Bot' });
        
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`scrim_join_${scrimId}`).setLabel('Join Scrim').setStyle(ButtonStyle.Success)
      );
      
      await interaction.reply({ embeds: [embed], components: [row] });
      return;
    }

    // /message-scrim-members ──────────────────────────────────────────────────
    if (cmd === 'message-scrim-members') {
      if (!hasMod(interaction.member)) { await interaction.reply({ content: '❌ Mod only.', ephemeral: true }); return; }
      const msg = interaction.options.getString('message');
      
      // Get recent scrims for selection
      const recentScrims = await all('SELECT * FROM scrim_upcoming ORDER BY id DESC LIMIT 25');
      if (!recentScrims.length) { await interaction.reply({ content: '❌ No scrims found.', ephemeral: true }); return; }
      
      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('message_participants_select')
          .setPlaceholder('Select a scrim to message its members...')
          .addOptions(recentScrims.map(s => ({
            label: s.title,
            description: `${s.time} (#${s.id})`,
            value: `${s.id}|${msg.slice(0, 50)}|${encodeURIComponent(msg)}` // Store msg in value or state
          })))
      );
      
      await interaction.reply({ content: 'Please select which scrim members to message:', components: [row], ephemeral: true });
      return;
    }

    // /remove-item ──────────────────────────────────────────────────────────
    if (cmd === 'remove-item') {
      if (!hasManagement(interaction.member)) { await interaction.reply({ content: '❌ You need the **VRDL | Scrim Management** role.', flags: 64 }); return; }
      const itemId = interaction.options.getInteger('item_id');
      const item = await get('SELECT * FROM scrim_shop WHERE id=?', [itemId]);
      if (!item) { await interaction.reply({ content: '❌ Item #' + itemId + ' not found.', flags: 64 }); return; }
      await run('UPDATE scrim_shop SET active=0 WHERE id=?', [itemId]);
      await interaction.reply({
        embeds: [new EmbedBuilder().setTitle('🗑️ Item Removed').setColor(0xff4d4d)
          .setDescription('**' + item.name + '** has been removed from the shop.')
          .setFooter({ text: 'Item ID: ' + itemId }).setTimestamp()], flags: 64
      });
      return;
    }

    // /pause-requests ───────────────────────────────────────────────────────
    if (cmd === 'pause-requests') {
      if (!hasManagement(interaction.member)) { await interaction.reply({ content: '❌ You need the **VRDL | Scrim Management** role.', flags: 64 }); return; }
      await setSetting('requests_paused', 'true');
      await interaction.reply({ content: '⏸️ **Scrims Paused!** Players can no longer use `/claim-points` or `/redeem` until you run `/resume-requests`.' });
      return;
    }

    // /remove-stock ────────────────────────────────────────────────────────
    if (cmd === 'remove-stock') {
      if (!hasManagement(interaction.member)) { await interaction.reply({ content: '❌ You need the **VRDL | Scrim Management** role.', flags: 64 }); return; }
      const itemId = interaction.options.getInteger('item_id');
      const amount = interaction.options.getInteger('amount');
      const item = await get('SELECT * FROM scrim_shop WHERE id=?', [itemId]);

      if (!item) { await interaction.reply({ content: '❌ Item not found.', ephemeral: true }); return; }
      if (item.stock === -1) { await interaction.reply({ content: '❌ This item has unlimited stock. Set a stock limit first.', ephemeral: true }); return; }

      const newStock = Math.max(0, item.stock - amount);
      await run('UPDATE scrim_shop SET stock = ? WHERE id=?', [newStock, itemId]);

      await interaction.reply({ content: `✅ Removed **${amount}** stock from **${item.name}**. New stock: **${newStock}**.`, ephemeral: true });

      // Alert if stock is now low or out
      if (newStock <= 3) {
        const alertChId = getSetting('shop_alert_channel') || getSetting('log_channel');
        if (alertChId) {
          try {
            const alertCh = await client.channels.fetch(alertChId).catch(() => null);
            if (alertCh) {
              await alertCh.send({
                content: newStock === 0 ? `🚨 **OUT OF STOCK ALERT**: **${item.name}** is gone (manual removal)!` : `⚠️ **QUICK!** **${item.name}** stock was manually reduced. Only **${newStock}** left! **BUY QUICK!** 🏃💨`,
                embeds: [new EmbedBuilder()
                  .setTitle(newStock === 0 ? '🚫 Item Sold Out' : '⚠️ Limited Stock Remaining')
                  .setColor(newStock === 0 ? 0xff4d4d : 0xffa500)
                  .setDescription(`${item.name}\n\n${item.description}`)
                  .addFields({ name: '📉 Units Left', value: String(newStock), inline: true })
                  .setFooter({ text: 'Manual stock adjustment by management' })
                  .setTimestamp()]
              });
            }
          } catch (e) {
            console.error('[remove-stock-alert]', e.message);
          }
        }
      }
      return;
    }

    // /resume-requests ───────────────────────────────────────────────────────
    if (cmd === 'resume-requests') {
      if (!hasManagement(interaction.member)) { await interaction.reply({ content: '❌ You need the **VRDL | Scrim Management** role.', flags: 64 }); return; }
      await setSetting('requests_paused', 'false');
      await interaction.reply({ content: '▶️ **Scrims Resumed!** Players can now use `/claim-points` and `/redeem` again.' });
      return;
    }

    // /set-review-channel ───────────────────────────────────────────────────
    if (cmd === 'set-review-channel') {
      if (!hasManagement(interaction.member)) { await interaction.reply({ content: '❌ You need the **VRDL | Scrim Management** role.', flags: 64 }); return; }
      await setSetting('review_channel', interaction.channel.id);
      await interaction.reply({ content: '✅ Point claim requests will now be posted in this channel.', flags: 64 });
      return;
    }

    // /set-redemption-channel ───────────────────────────────────────────────
    if (cmd === 'set-redemption-channel') {
      if (!hasManagement(interaction.member)) { await interaction.reply({ content: '❌ You need the **VRDL | Scrim Management** role.', flags: 64 }); return; }
      await setSetting('redemption_channel', interaction.channel.id);
      await interaction.reply({ content: '✅ Shop redemption requests will now be posted in this channel.', flags: 64 });
      return;
    }

    // /set-log-channel ──────────────────────────────────────────────────────
    if (cmd === 'set-log-channel') {
      if (!hasManagement(interaction.member)) { await interaction.reply({ content: '❌ You need the **VRDL | Scrim Management** role.', flags: 64 }); return; }
      await setSetting('log_channel', interaction.channel.id);
      await interaction.reply({ content: '✅ Point logs will now be posted in this channel.', flags: 64 });
      return;
    }

    // /set-fulfilment-channel ─────────────────────────────────────────────
    if (cmd === 'set-fulfilment-channel') {
      if (!hasManagement(interaction.member)) { await interaction.reply({ content: '❌ You need the **VRDL | Scrim Management** role.', ephemeral: true }); return; }
      await setSetting('fulfilment_channel', interaction.channel.id);
      await interaction.reply({ content: '✅ Fulfilled orders will now be posted for processing in this channel.', ephemeral: true });
      return;
    }

    // /set-batch-channel ──────────────────────────────────────────────────
    if (cmd === 'set-batch-channel') {
      if (!hasManagement(interaction.member)) { await interaction.reply({ content: '❌ You need the **VRDL | Scrim Management** role.', ephemeral: true }); return; }
      await setSetting('batch_request_channel', interaction.channel.id);
      await interaction.reply({ content: '✅ Batch requests will now be posted for processing in this channel.', ephemeral: true });
      return;
    }

    // /set-audit-channel ──────────────────────────────────────────────────
    if (cmd === 'set-audit-channel') {
      if (!hasManagement(interaction.member)) { await interaction.reply({ content: '❌ You need the **VRDL | Scrim Management** role.', ephemeral: true }); return; }
      await setSetting('audit_log_channel', interaction.channel.id);
      const isVerbose = getSetting('audit_log_verbose') === 'true';
      await interaction.reply({ content: '✅ Audit log channel set to this channel!\n' + (isVerbose ? '📋 Verbose logging is currently **ON**.' : '📋 Verbose logging is currently **OFF**. Use `/toggle-audit-log` to enable it.'), ephemeral: true });
      return;
    }

    // /set-shop-alert-channel ──────────────────────────────────────────────
    if (cmd === 'set-shop-alert-channel') {
      if (!hasManagement(interaction.member)) { await interaction.reply({ content: '❌ You need the **VRDL | Scrim Management** role.', flags: 64 }); return; }
      const ch = interaction.options.getChannel('channel');
      await setSetting('shop_alert_channel', ch.id);
      await interaction.reply({ content: `✅ Shop alerts (low stock/restock) will now be posted in <#${ch.id}>!\nPlayers will be told to buy quick!`, ephemeral: true });
      return;
    }

    // /restock ─────────────────────────────────────────────────────────────
    if (cmd === 'restock') {
      if (!hasManagement(interaction.member)) { await interaction.reply({ content: '❌ You need the **VRDL | Scrim Management** role.', flags: 64 }); return; }
      const itemId = interaction.options.getInteger('item_id');
      const amount = interaction.options.getInteger('amount');
      const item = await get('SELECT * FROM scrim_shop WHERE id=?', [itemId]);

      if (!item) { await interaction.reply({ content: '❌ Item not found.', ephemeral: true }); return; }

      const newStock = (item.stock === -1 ? 0 : item.stock) + amount;
      await run('UPDATE scrim_shop SET stock = ? WHERE id=?', [newStock, itemId]);

      await interaction.reply({ content: `✅ Restocked **${item.name}** by **${amount}**. New stock: **${newStock}**.`, ephemeral: true });

      // Restock alert
      const alertChId = getSetting('shop_alert_channel') || getSetting('log_channel');
      if (alertChId) {
        try {
          const alertCh = await client.channels.fetch(alertChId).catch(() => null);
          if (alertCh) {
            await alertCh.send({
              content: `🚀 **RESTOCK ALERT**: **${item.name}** is back in stock! **GET IT WHILE YOU CAN!** 🏃💨`,
              embeds: [new EmbedBuilder()
                .setTitle('📦 Item Restocked!')
                .setColor(0x57f287)
                .setDescription(`${item.name}\n\n${item.description}`)
                .addFields(
                  { name: '📦 Added', value: String(amount), inline: true },
                  { name: '📈 Total Stock', value: String(newStock), inline: true }
                )
                .setFooter({ text: 'Use /shop to buy!' })
                .setTimestamp()]
            });
          } else {
            await interaction.followUp({ content: '⚠️ Could not find the shop alert channel to post the announcement.', ephemeral: true });
          }
        } catch (alertErr) {
          console.error('[restock-alert]', alertErr.message);
          await interaction.followUp({ content: '⚠️ Failed to send restock announcement. Please check the bot\'s permissions in the alert channel.', ephemeral: true });
        }
      }
      return;
    }

    // /toggle-audit-log ───────────────────────────────────────────────────
    if (cmd === 'toggle-audit-log') {
      if (!hasManagement(interaction.member)) { await interaction.reply({ content: '❌ You need the **VRDL | Scrim Management** role.', ephemeral: true }); return; }
      const current = getSetting('audit_log_verbose') === 'true';
      const next = !current;
      await setSetting('audit_log_verbose', String(next));
      await interaction.reply({
        content: next
          ? '📋 **Verbose audit logging is now ON.** Every command, button press, and dropdown will be logged in the audit channel.'
          : '📋 **Verbose audit logging is now OFF.** The existing logs (points, redemptions, reviews) are still active as normal.'
      });
      return;
    }

    // /purge-scrim-points ────────────────────────────────────────────────
    if (cmd === 'purge-scrim-points') {
      if (!hasManagement(interaction.member)) { await interaction.reply({ content: '❌ You need the **VRDL | Scrim Management** role.', flags: 64 }); return; }
      if (!(await defer(interaction, false))) return; // claim interaction before DB writes
      const target = interaction.options.getUser('player');

      if (target) {
        // Purge a single player
        await run('UPDATE scrim_points SET points = 0 WHERE discord_id=?', [target.id]);
        await interaction.editReply({
          embeds: [new EmbedBuilder().setTitle('🗑️ Points Purged').setColor(0xff4d4d)
            .setDescription(`All scrim points for <@${target.id}> have been reset to **0**.`)
            .setFooter({ text: 'Purged by ' + interaction.user.username }).setTimestamp()]
        });
        await postLog(client, new EmbedBuilder().setTitle('🗑️ Points Purged — Single Player').setColor(0xff4d4d)
          .addFields(
            { name: 'Player', value: '<@' + target.id + '>', inline: true },
            { name: 'By', value: '<@' + interaction.user.id + '>', inline: true },
          ).setTimestamp());
      } else {
        // Purge ALL players
        await run('UPDATE scrim_points SET points = 0');
        await interaction.editReply({
          embeds: [new EmbedBuilder().setTitle('🗑️ All Scrim Points Purged').setColor(0xff4d4d)
            .setDescription('**Every player\'s** scrim points have been reset to **0**.')
            .setFooter({ text: 'Purged by ' + interaction.user.username }).setTimestamp()]
        });
        await postLog(client, new EmbedBuilder().setTitle('🗑️ ALL Scrim Points Purged').setColor(0xff4d4d)
          .addFields(
            { name: 'By', value: '<@' + interaction.user.id + '>', inline: true },
          ).setTimestamp());
      }
      return;
    }

  } catch (err) {
    console.error('[' + cmd + ']', err.message);
    try {
      const msg = { content: '❌ Error: ' + err.message, flags: 64 };
      if (interaction.deferred) await interaction.editReply(msg);
      else if (!interaction.replied) await interaction.reply(msg);
    } catch (_) { }
  }
});

process.on('unhandledRejection', err => {
  if (err?.code === 10062 || err?.message?.includes('Unknown interaction')) { console.warn('[Expired interaction ignored]'); return; }
  console.error('Unhandled rejection:', err?.message);
});
process.on('uncaughtException', err => {
  if (err?.code === 10062 || err?.message?.includes('Unknown interaction')) { console.warn('[Expired interaction ignored]'); return; }
  console.error('Uncaught exception:', err?.message);
});

initDB().then(async () => {
  console.log('🔌 Connecting to Discord...');
  await client.login(process.env.SCRIM_DISCORD_TOKEN);
  client.once('ready', () => {
  console.log('✅ Scrim Bot online as ' + client.user.tag);
  setInterval(async () => {
    try { await run('INSERT OR REPLACE INTO scrim_settings (key,value) VALUES(?,?)', ['last_heartbeat', new Date().toISOString()]); } catch (_) {}
  }, 60000);
});
}).catch(err => { console.error('Startup failed:', err); process.exit(1); });