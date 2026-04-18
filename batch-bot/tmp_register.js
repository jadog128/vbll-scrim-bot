const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config({ path: '.env.batch' });

const commands = [
  new SlashCommandBuilder().setName('post-ticket-panel').setDescription('Post the issue ticket panel [Staff]'),
  new SlashCommandBuilder().setName('view-logs').setDescription('View staff activity logs [Staff]'),
  new SlashCommandBuilder().setName('view-batches').setDescription('View recent batches and their contents [Staff]'),
  new SlashCommandBuilder().setName('lookup-batch-info').setDescription('Check status and progress of a batch').addIntegerOption(o => o.setName('batch_id').setDescription('Batch ID').setRequired(true))
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.BATCH_DISCORD_TOKEN);

async function force() {
  console.log("Registering for guild:", process.env.BATCH_GUILD_ID);
  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.BATCH_CLIENT_ID, process.env.BATCH_GUILD_ID),
      { body: commands }
    );
    console.log("✅ Commands Registered INSTANTLY for Guild.");
  } catch (e) {
    console.error(e);
  }
}

force();
