require('dotenv').config({ path: '.env.batch' });
const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { createClient } = require('@libsql/client');

async function getChoices() {
  const url = process.env.TURSO_URL || process.env.SCRIM_TURSO_URL;
  const token = process.env.TURSO_TOKEN || process.env.SCRIM_TURSO_TOKEN;
  if (!url) return [{ name: 'Other', value: 'other' }];
  
  try {
    const db = createClient({ url, authToken: token || "" });
    const res = await db.execute("SELECT name FROM batch_options LIMIT 25");
    if (res.rows.length === 0) return [{ name: 'Other', value: 'other' }];
    return res.rows.map(r => ({ name: r.name, value: r.name }));
  } catch (e) {
    return [{ name: 'Other', value: 'other' }];
  }
}

(async () => {
  
  const commands = [
    new SlashCommandBuilder().setName('setup').setDescription('Show configuration status and guide [Admin Only]'),
    
    new SlashCommandBuilder().setName('batch_request').setDescription('Submit a request for a custom item')
      .addStringOption(o => o.setName('type').setDescription('Type of item').setRequired(true).setAutocomplete(true)),
    
    new SlashCommandBuilder().setName('post-batch-request').setDescription('Post the interactive request button [Staff Only]'),
    
    new SlashCommandBuilder().setName('set-batch-review-channel').setDescription('Set channel for staff audit [Admin Only]')
      .addChannelOption(o => o.setName('channel').setDescription('Select channel').setRequired(true)),
    
    new SlashCommandBuilder().setName('set-batch-pre-review-channel').setDescription('Set channel for initial verification [Admin Only]')
      .addChannelOption(o => o.setName('channel').setDescription('Select channel').setRequired(true)),
    
    new SlashCommandBuilder().setName('set-batch-release-channel').setDescription('Set channel where released batches are posted [Admin Only]')
      .addChannelOption(o => o.setName('channel').setDescription('Select channel').setRequired(true)),
    
    new SlashCommandBuilder().setName('batch_option').setDescription('Manage requestable item types [Admin Only]')
      .addSubcommand(s => s.setName('add').setDescription('Add an item').addStringOption(o => o.setName('name').setDescription('Item Name').setRequired(true)))
      .addSubcommand(s => s.setName('remove').setDescription('Remove an item').addStringOption(o => o.setName('name').setDescription('Item Name').setRequired(true)))
      .addSubcommand(s => s.setName('list').setDescription('List all items')),
    
    new SlashCommandBuilder().setName('batch_check').setDescription('View the current pending queue [Staff Only]'),
    
    new SlashCommandBuilder().setName('view-batches').setDescription('View contents of recent batches [Staff Only]'),
    
    new SlashCommandBuilder().setName('view-logs').setDescription('View recent staff activity logs [Staff Only]'),
    
    new SlashCommandBuilder().setName('set-ticket-channel').setDescription('Set channel for support alerts [Admin Only]')
      .addChannelOption(o => o.setName('channel').setDescription('Select channel').setRequired(true)),
    
    new SlashCommandBuilder().setName('set-admin-role')
      .setDescription('Set the role that has full management access to the Batch bot [Admin Only]')
      .addRoleOption(o => o.setName('role').setDescription('Select the Admin role').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    new SlashCommandBuilder().setName('set-web-support-channel').setDescription('Set channel for web chat alerts [Admin Only]')
      .addChannelOption(o => o.setName('channel').setDescription('Select channel').setRequired(true)),
    
    new SlashCommandBuilder().setName('set-ticket-role').setDescription('Set role that manages tickets [Admin Only]')
      .addRoleOption(o => o.setName('role').setDescription('Select role').setRequired(true)),
    
    new SlashCommandBuilder().setName('set-ticket-category').setDescription('Set category for ticket channels [Admin Only]')
      .addChannelOption(o => o.setName('category').setDescription('Select category').setRequired(true).addChannelTypes(ChannelType.GuildCategory)),
    
    new SlashCommandBuilder().setName('close-ticket').setDescription('Close and archive the current ticket channel [Staff Only]'),
    
    new SlashCommandBuilder().setName('batch_add').setDescription('Manually add a player to the queue [Staff Only]')
      .addUserOption(o => o.setName('player').setDescription('Target player').setRequired(true))
      .addStringOption(o => o.setName('vrfs_id').setDescription('Player VRFS ID').setRequired(true))
      .addStringOption(o => o.setName('type').setDescription('Item type').setRequired(true).setAutocomplete(true)),
    
    new SlashCommandBuilder().setName('batch_remove').setDescription('Remove a request by ID [Staff Only]')
      .addIntegerOption(o => o.setName('id').setDescription('Request ID').setRequired(true)),
    
    new SlashCommandBuilder().setName('batch_clear').setDescription('Wipe the pending queue [Admin Only]'),
    
    new SlashCommandBuilder().setName('release_batch').setDescription('Manually push the current batch to the release channel [Admin Only]'),
    
    new SlashCommandBuilder().setName('export_batches').setDescription('Export all batch data (DM) [Owner Only]'),
    
    new SlashCommandBuilder().setName('my_request').setDescription('Check status of your own request'),
    
    new SlashCommandBuilder().setName('batch_halt').setDescription('Pause or resume all batch submissions [Admin Only]')
      .addBooleanOption(o => o.setName('active').setDescription('True to lock, False to open').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Optional notification reason').setRequired(false)),
    
    new SlashCommandBuilder().setName('batch_sent').setDescription('Notify users that their batch has been sent in-game [Admin Only]')
      .addIntegerOption(o => o.setName('batch_id').setDescription('Target Batch ID').setRequired(true)),
    
    new SlashCommandBuilder().setName('post-admin-batch-add').setDescription('Post admin buttons for manual adds [Admin Only]'),
    
    new SlashCommandBuilder().setName('profile').setDescription('View player stats/profile')
      .addUserOption(o => o.setName('user').setDescription('Target user')),
    
    new SlashCommandBuilder().setName('batch-edit').setDescription('Modify existing request data [Staff Only]')
      .addIntegerOption(o => o.setName('request_id').setDescription('Request ID').setRequired(true))
      .addStringOption(o => o.setName('vrfs_id').setDescription('New VRFS ID'))
      .addStringOption(o => o.setName('action').setDescription('Action to take').addChoices({ name: 'Remove from Batch', value: 'remove' })),
    
    new SlashCommandBuilder().setName('lookup-batch-info').setDescription('Check batch status and progress')
      .addIntegerOption(o => o.setName('batch_id').setDescription('Target Batch ID').setRequired(true)),

    new SlashCommandBuilder().setName('giveaway-start').setDescription('Start a new giveaway [Admin Only]')
      .addStringOption(o => o.setName('prize').setDescription('What are you giving away?').setRequired(true))
      .addStringOption(o => o.setName('duration').setDescription('Time (e.g. 1h, 1d, 30m)').setRequired(true))
      .addIntegerOption(o => o.setName('winners').setDescription('Number of winners').setRequired(false)),

    new SlashCommandBuilder().setName('giveaway-reroll').setDescription('Pick a new winner for a giveaway [Admin Only]')
      .addStringOption(o => o.setName('id').setDescription('Giveaway ID (get from dashboard)').setRequired(true)),


  ].map(c => c.toJSON());

  const rest = new REST({ version: '10' }).setToken(process.env.BATCH_DISCORD_TOKEN);
  try {
    console.log('🔄 Registering ' + commands.length + ' Batch commands GLOBALLY…');
    await rest.put(
      Routes.applicationCommands(process.env.BATCH_CLIENT_ID),
      { body: commands }
    );
    
    const targetGuild = "1388628647446843429";
    console.log('⚡ Registering to Target Guild for INSTANT update: ' + targetGuild);
    await rest.put(
      Routes.applicationGuildCommands(process.env.BATCH_CLIENT_ID, targetGuild),
      { body: commands }
    );

    console.log('✅ Commands Registered Successfully.');


  } catch (e) {
    console.error('❌ Registration Failed:', e);
  }
})();
