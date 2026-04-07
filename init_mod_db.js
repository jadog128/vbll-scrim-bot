const { createClient } = require('@libsql/client');

const turso = createClient({
  url: 'libsql://vbllscrim-bot-mikefeufh.aws-eu-west-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzU1MDMwODYsImlkIjoiMDE5ZDYyZGYtMmYwMS03YmNlLTg5Y2ItNDhiYTI3NmZlM2JlIiwicmlkIjoiNjAzZmZjOGYtYWI2ZS00MjU3LTkzOTAtZDA2ODlhMzE0YzIyIn0.jaNgxQ9gf8fp5pdhC_dSptGq4OvHL-Am-GO1WDaGQRJ8YHFWLIbUjY4s5facimAHts3B9-4UJN6R3yI24RwDBw',
});

async function init() {
  try {
    console.log('🔌 Connecting to Turso...');
    await turso.execute('CREATE TABLE IF NOT EXISTS mod_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT, moderator_id TEXT, target_id TEXT, action TEXT, reason TEXT, evidence TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)');
    await turso.execute('CREATE TABLE IF NOT EXISTS mod_infractions (discord_id TEXT PRIMARY KEY, count INTEGER DEFAULT 0, last_infraction DATETIME)');
    await turso.execute('CREATE TABLE IF NOT EXISTS mod_settings (guild_id TEXT PRIMARY KEY, log_channel TEXT, role_persistence INTEGER DEFAULT 1, raid_multiplier INTEGER DEFAULT 5, filters TEXT)');
    await turso.execute('CREATE TABLE IF NOT EXISTS mod_global_blacklist (discord_id TEXT PRIMARY KEY, reason TEXT, staff_id TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)');
    console.log('✅ Sentinal Database Initialized');
  } catch (e) {
    console.error('❌ Database Initialization Failed:', e.message);
  }
}

init();
