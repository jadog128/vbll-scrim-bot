require('dotenv').config({ path: '.env.batch' });
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  // ── User Commands ──────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName('batch_request')
    .setDescription('Submit a request for a custom VRDL item')
    .addStringOption(o => 
      o.setName('type')
        .setDescription('What kind of custom are you requesting?')
        .setRequired(true)
        .addChoices(
          { name: '👕 Custom Jersey', value: 'jersey' },
          { name: '👟 Custom Shoes', value: 'shoes' },
          { name: '🧢 Custom Hat', value: 'hat' },
          { name: '✨ Other Custom', value: 'other' }
        )
    )
    .addStringOption(o => o.setName('details').setDescription('Provide any specific details (color, name, etc.)').setRequired(true)),

  // ── Management Commands ────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName('post-batch-request')
    .setDescription('Post an interactive button message for users to request customs [Staff Only]'),

  new SlashCommandBuilder()
    .setName('batch_check')
    .setDescription('View the current batch request queue [Staff Only]'),

  new SlashCommandBuilder()
    .setName('batch_add')
    .setDescription('Manually add a player to the batch queue [Staff Only]')
    .addUserOption(o => o.setName('player').setDescription('Player to add').setRequired(true))
    .addStringOption(o => 
      o.setName('type')
        .setDescription('Custom type')
        .setRequired(true)
        .addChoices(
          { name: 'Jersey', value: 'jersey' },
          { name: 'Shoes', value: 'shoes' },
          { name: 'Hat', value: 'hat' },
          { name: 'Other', value: 'other' }
        )
    )
    .addStringOption(o => o.setName('details').setDescription('Order details').setRequired(true)),

  new SlashCommandBuilder()
    .setName('batch_remove')
    .setDescription('Remove a specific entry from the queue by ID [Staff Only]')
    .addIntegerOption(o => o.setName('id').setDescription('The Request ID to remove').setRequired(true)),

  new SlashCommandBuilder()
    .setName('batch_clear')
    .setDescription('Wipe the entire pending batch queue [Staff Only]'),

  new SlashCommandBuilder()
    .setName('set-batch-review-channel')
    .setDescription('Set the channel where batch requests are reviewed [Staff Only]')
    .addChannelOption(o => o.setName('channel').setDescription('Select the staff review channel').setRequired(true)),
  
  new SlashCommandBuilder()
    .setName('batch_mass_decline')
    .setDescription('Mass decline all pending requests from a specific ID downwards [Staff Only]')
    .addIntegerOption(o => o.setName('start_id').setDescription('The Request ID to start from (will decline from this to #1)').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Optional reason for declining').setRequired(false)),

].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.BATCH_DISCORD_TOKEN);

(async () => {
  try {
    if (!process.env.BATCH_DISCORD_TOKEN || !process.env.BATCH_CLIENT_ID) {
      console.error('❌ Missing BATCH_DISCORD_TOKEN or BATCH_CLIENT_ID in .env.batch');
      process.exit(1);
    }

    console.log('🔄 Registering Batch Bot commands (GUILD: ' + process.env.BATCH_GUILD_ID + ')…');
    await rest.put(
      Routes.applicationGuildCommands(process.env.BATCH_CLIENT_ID, process.env.BATCH_GUILD_ID),
      { body: commands }
    );
    console.log('✅ Registered ' + commands.length + ' batch commands globally!');
  } catch (e) {
    console.error('❌', e);
  }
})();
