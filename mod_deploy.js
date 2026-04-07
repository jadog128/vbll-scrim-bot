const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
require('dotenv').config({ path: '.env.mod' });

const commands = [
  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('⚠️ Issue a formal warning to a user')
    .addUserOption(opt => opt.setName('user').setDescription('The user to warn').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for warning').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('⏳ Timeout a user for a specific duration')
    .addUserOption(opt => opt.setName('user').setDescription('The user to timeout').setRequired(true))
    .addIntegerOption(opt => opt.setName('minutes').setDescription('Duration in minutes').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for timeout').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('👢 Kick a member from the server')
    .addUserOption(opt => opt.setName('user').setDescription('The user to kick').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for kicking').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('🔨 Permanently ban a user')
    .addUserOption(opt => opt.setName('user').setDescription('The user to ban').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for banning').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  new SlashCommandBuilder()
    .setName('purge')
    .setDescription('🧹 Clear a specific number of messages')
    .addIntegerOption(opt => opt.setName('count').setDescription('Number of messages (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  new SlashCommandBuilder()
    .setName('case')
    .setDescription('📋 View a user\'s infraction history')
    .addUserOption(opt => opt.setName('user').setDescription('The user to check').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  new SlashCommandBuilder()
    .setName('lockdown')
    .setDescription('🔒 Enable or disable server-wide lockdown (Raid Shield)')
    .addBooleanOption(opt => opt.setName('enabled').setDescription('True to lock, False to unlock').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('set-log-channel')
    .setDescription('⚙️ Set the channel for Sentinal audit logs')
    .addChannelOption(opt => opt.setName('channel').setDescription('The log channel').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('global-ban')
    .setDescription('⚖️ Add a user to the cross-server global blacklist')
    .addStringOption(opt => opt.setName('user_id').setDescription('The user ID to blacklist').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for global blacklist').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.MOD_DISCORD_TOKEN);

(async () => {
  try {
    console.log('🚀 Sentinal: Deploying slash commands...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.MOD_CLIENT_ID || 'MOD_CLIENT_ID', process.env.MOD_GUILD_ID),
      { body: commands }
    );
    console.log('✅ Sentinal: Commands deployed successfully.');
  } catch (error) {
    console.error('❌ Sentinal Deployment Failed:', error);
  }
})();
