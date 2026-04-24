const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
require('dotenv').config({ path: '.env.mod' });

const commands = [
  new SlashCommandBuilder().setName('warn').setDescription('Warn a user').addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(true)),
  new SlashCommandBuilder().setName('timeout').setDescription('Timeout a user').addUserOption(o => o.setName('user').setDescription('Target member').setRequired(true)).addIntegerOption(o => o.setName('minutes').setDescription('Duration').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(true)),

  new SlashCommandBuilder().setName('purge').setDescription('Purge messages').addIntegerOption(o => o.setName('count').setDescription('Number of messages').setRequired(true).setMinValue(1).setMaxValue(100)),
  new SlashCommandBuilder().setName('set-log-channel').setDescription('Set mod log channel').addChannelOption(o => o.setName('channel').setDescription('Select channel').setRequired(true)),
  new SlashCommandBuilder().setName('global-ban').setDescription('Apply global blacklist').addStringOption(o => o.setName('user_id').setDescription('Target user ID').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(true)),
  new SlashCommandBuilder().setName('panic').setDescription('LOCKDOWN/UNLOCK currently active channel').addBooleanOption(o => o.setName('status').setDescription('Enable Lockdown').setRequired(true)),
  new SlashCommandBuilder().setName('trust').setDescription('Check user trust score').addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true)),
].map(command => command.toJSON());

const token = (process.env.VCC_MOD_DISCORD_TOKEN || process.env.MOD_DISCORD_TOKEN || '').trim();
const clientId = (process.env.VCC_MOD_CLIENT_ID || process.env.MOD_CLIENT_ID || '').trim();
const guildId = process.env.VCC_GUILD_ID;

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('🚀 Sentinal Apex: Deploying slash commands...');
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
      console.log('✅ Commands deployed to GUILD.');
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
      console.log('✅ Commands deployed GLOBALLY.');
    }
  } catch (error) {
    console.error('❌ Sentinal Deployment Failed:', error);
  }
})();
