require('dotenv').config();
require('dotenv').config({ path: '.env.scrim' });
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [

  // ── Player commands ──────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName('claim-points')
    .setDescription('Submit a scrim points request with proof')
    .addIntegerOption(o => o.setName('amount').setDescription('How many points are you claiming?').setRequired(true).setMinValue(1))
    .addAttachmentOption(o => o.setName('proof').setDescription('Screenshot proof of your scrim result').setRequired(true))
    .addStringOption(o => o.setName('description').setDescription('Brief description (opponent, score, etc.)').setRequired(true)),

  new SlashCommandBuilder()
    .setName('points')
    .setDescription('Check your scrim points balance (or another player\'s)')
    .addUserOption(o => o.setName('player').setDescription('Player to check (leave blank for yourself)')),

  new SlashCommandBuilder()
    .setName('shop')
    .setDescription('View all available items in the scrim shop'),

  new SlashCommandBuilder()
    .setName('redeem')
    .setDescription('Redeem a shop item using your scrim points')
    .addIntegerOption(o => o.setName('item_id').setDescription('Item ID from /shop').setRequired(true)),

  new SlashCommandBuilder()
    .setName('my-orders')
    .setDescription('View your personal shop redemption history'),

  new SlashCommandBuilder()
    .setName('upcoming-scrims')
    .setDescription('View the list of upcoming scrims and rewards'),

  // ── Management commands ──────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName('scrim-add')
    .setDescription('Announce an upcoming scrim [Scrim Management]')
    .addStringOption(o => o.setName('title').setDescription('Name of the scrim event').setRequired(true))
    .addStringOption(o => o.setName('time').setDescription('When is it? (e.g. Today at 8PM)').setRequired(true))
    .addIntegerOption(o => o.setName('reward').setDescription('Point reward for participation').setRequired(true)),
  new SlashCommandBuilder()
    .setName('add-points')
    .setDescription('Add scrim points to a player [Scrim Management]')
    .addUserOption(o => o.setName('player').setDescription('Player to award points to').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('Amount of points to add').setRequired(true).setMinValue(1))
    .addStringOption(o => o.setName('reason').setDescription('Reason for adding points')),

  new SlashCommandBuilder()
    .setName('mass-add-points')
    .setDescription('Add points to multiple players at once [Scrim Management]')
    .addIntegerOption(o => o.setName('amount').setDescription('Points to give each player').setRequired(true).setMinValue(1))
    .addUserOption(o => o.setName('player1').setDescription('Player 1').setRequired(true))
    .addUserOption(o => o.setName('player2').setDescription('Player 2'))
    .addUserOption(o => o.setName('player3').setDescription('Player 3'))
    .addUserOption(o => o.setName('player4').setDescription('Player 4'))
    .addUserOption(o => o.setName('player5').setDescription('Player 5'))
    .addUserOption(o => o.setName('player6').setDescription('Player 6'))
    .addUserOption(o => o.setName('player7').setDescription('Player 7'))
    .addUserOption(o => o.setName('player8').setDescription('Player 8'))
    .addUserOption(o => o.setName('player9').setDescription('Player 9'))
    .addUserOption(o => o.setName('player10').setDescription('Player 10'))
    .addStringOption(o => o.setName('reason').setDescription('Reason for adding points')),

  new SlashCommandBuilder()
    .setName('remove-points')
    .setDescription('Remove scrim points from a player [Scrim Management]')
    .addUserOption(o => o.setName('player').setDescription('Player to remove points from').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('Amount of points to remove').setRequired(true).setMinValue(1))
    .addStringOption(o => o.setName('reason').setDescription('Reason for removing points')),

  new SlashCommandBuilder()
    .setName('add-item')
    .setDescription('Add an item to the scrim shop [Scrim Management]')
    .addStringOption(o => o.setName('name').setDescription('Item name').setRequired(true))
    .addIntegerOption(o => o.setName('cost').setDescription('Cost in scrim points').setRequired(true).setMinValue(1))
    .addStringOption(o => o.setName('description').setDescription('What does this item give?').setRequired(true))
    .addIntegerOption(o => o.setName('stock').setDescription('Stock limit (-1 = unlimited, default unlimited)')),

  new SlashCommandBuilder()
    .setName('remove-item')
    .setDescription('Remove an item from the scrim shop [Scrim Management]')
    .addIntegerOption(o => o.setName('item_id').setDescription('Item ID to remove').setRequired(true)),

  new SlashCommandBuilder()
    .setName('set-review-channel')
    .setDescription('Set the channel where point claim requests are sent [Scrim Management]'),

  new SlashCommandBuilder()
    .setName('set-redemption-channel')
    .setDescription('Set the channel where redemption requests are sent [Scrim Management]'),

  new SlashCommandBuilder()
    .setName('set-log-channel')
    .setDescription('Set the channel for point add/remove logs [Scrim Management]'),

  new SlashCommandBuilder()
    .setName('set-fulfilment-channel')
    .setDescription('Set the channel where fulfilled orders are sent [Scrim Management]'),

  new SlashCommandBuilder()
    .setName('set-batch-channel')
    .setDescription('Set the channel for batch requests [Scrim Management]'),

  new SlashCommandBuilder()
    .setName('lookup-order')
    .setDescription('Look up a redemption order by its 5-character ID [Scrim Management]')
    .addStringOption(o => o.setName('order_id').setDescription('The 5-character order ID').setRequired(true).setMinLength(5).setMaxLength(5)),

  new SlashCommandBuilder()
    .setName('setup-channels')
    .setDescription('Automatically create and configure all 7 core staff channels [Admin Only]'),

  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the top 15 scrim points leaderboard'),

  new SlashCommandBuilder()
    .setName('pause-requests')
    .setDescription('Temporarily stop all point claims and shop redemptions [Scrim Management]'),

  new SlashCommandBuilder()
    .setName('resume-requests')
    .setDescription('Re-enable point claims and shop redemptions [Scrim Management]'),

  new SlashCommandBuilder()
    .setName('set-audit-channel')
    .setDescription('Set the channel where all command usage is logged [Scrim Management]'),

  new SlashCommandBuilder()
    .setName('toggle-audit-log')
    .setDescription('Toggle verbose command audit logging on or off [Scrim Management]'),

  new SlashCommandBuilder()
    .setName('set-shop-alert-channel')
    .setDescription('Set the channel for low stock and restock alerts [Scrim Management]')
    .addChannelOption(o => o.setName('channel').setDescription('Select the channel for public shop alerts').setRequired(true)),

  new SlashCommandBuilder()
    .setName('restock')
    .setDescription('Restock a shop item and announce it [Scrim Management]')
    .addIntegerOption(o => o.setName('item_id').setDescription('Item ID to restock').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('Amount of stock to add').setRequired(true).setMinValue(1)),

  new SlashCommandBuilder()
    .setName('remove-stock')
    .setDescription('Remove stock from a shop item [Scrim Management]')
    .addIntegerOption(o => o.setName('item_id').setDescription('Item ID').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('Amount of stock to remove').setRequired(true).setMinValue(1)),

  new SlashCommandBuilder()
    .setName('purge-scrim-points')
    .setDescription('Reset ALL players\' points to 0, or a single player [Scrim Management]')
    .addUserOption(o => o.setName('player').setDescription('Specific player to purge (leave blank to purge ALL players)')),

  new SlashCommandBuilder()
    .setName('mass-dm')
    .setDescription('DM every member that has a specific role [Admin Only]')
    .addRoleOption(o => o.setName('role').setDescription('The role to target').setRequired(true))
    .addStringOption(o => o.setName('message').setDescription('The message to send').setRequired(true)),

  new SlashCommandBuilder()
    .setName('post-scrim')
    .setDescription('Post a scrim announcement with a Join button [Mod Only]')
    .addStringOption(o => o.setName('title').setDescription('Scrim title').setRequired(true))
    .addStringOption(o => o.setName('time').setDescription('Scrim time').setRequired(true))
    .addIntegerOption(o => o.setName('points').setDescription('Points reward').setRequired(true)),

  new SlashCommandBuilder()
    .setName('message-scrim-members')
    .setDescription('Send a message to all players who joined a specific scrim [Mod Only]')
    .addStringOption(o => o.setName('message').setDescription('The message to send').setRequired(true)),

  new SlashCommandBuilder()
    .setName('penalty')
    .setDescription('Play a penalty shootout and earn scrim points!'),

  new SlashCommandBuilder()
    .setName('penalty-leaderboard')
    .setDescription('View the penalty shootout leaderboard'),

  new SlashCommandBuilder()
    .setName('hangman')
    .setDescription('Play Hangman!')
    .addSubcommand(sub => sub.setName('solo').setDescription('Play a solo Hangman game (bot picks the word)'))
    .addSubcommand(sub => sub.setName('create').setDescription('Create a multiplayer Hangman lobby')),

  new SlashCommandBuilder()
    .setName('hangman-setword')
    .setDescription('Override who sets the word in the active Hangman game (admin only)')
    .addUserOption(opt =>
      opt.setName('player').setDescription('The player who should set the word').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('ttt')
    .setDescription('Start a game of Tic-Tac-Toe!'),

  new SlashCommandBuilder()
    .setName('fast-fingers')
    .setDescription('Reaction game! First to click the matching emoji wins.'),

  new SlashCommandBuilder()
    .setName('battleships')
    .setDescription('Play Battleships against the bot or another player!')
    .addStringOption(opt =>
      opt.setName('mode')
        .setDescription('Choose between Solo vs Bot or Multiplayer (lobby)')
        .addChoices(
          { name: 'Solo', value: 'solo' },
          { name: 'Multiplayer', value: 'multi' }
        )
    ),

  new SlashCommandBuilder()
    .setName('minesweeper')
    .setDescription('Play Minesweeper!')
    .addStringOption(opt =>
      opt.setName('mode')
        .setDescription('Choose between Solo or Multiplayer (turn-based)')
        .addChoices(
          { name: 'Solo', value: 'solo' },
          { name: 'Multiplayer', value: 'multi' }
        )
    ),

].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.SCRIM_DISCORD_TOKEN);

(async () => {
  try {
    console.log('🔄 Registering scrim bot commands (GLOBAL)…');
    await rest.put(
      Routes.applicationCommands(process.env.SCRIM_CLIENT_ID),
      { body: commands }
    );
    console.log('✅ Registered ' + commands.length + ' scrim commands globally!');
  } catch (e) {
    console.error('❌', e);
  }
})();
