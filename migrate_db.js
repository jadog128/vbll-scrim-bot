require('dotenv').config({path:'c:/Users/jamie/OneDrive/Desktop/Vrdl scrim bot/.env.batch'});
const {createClient} = require('@libsql/client');
const db = createClient({ 
  url: process.env.TURSO_URL || process.env.SCRIM_TURSO_URL, 
  authToken: process.env.TURSO_TOKEN || process.env.SCRIM_TURSO_TOKEN 
});

async function runMigrate() {
  console.log('🚀 Starting Database Migration...');
  
  try {
    // 1. Create New Tables
    console.log('Creating guild_settings...');
    await db.execute(`CREATE TABLE IF NOT EXISTS guild_settings (
      guild_id TEXT,
      key TEXT,
      value TEXT,
      PRIMARY KEY (guild_id, key)
    )`);

    console.log('Creating batch_options...');
    await db.execute(`CREATE TABLE IF NOT EXISTS batch_options (
      guild_id TEXT,
      name TEXT,
      PRIMARY KEY (guild_id, name)
    )`);

    // 2. Add guild_id to all tables
    const tables = ['batch_requests', 'batches', 'batch_tickets', 'staff_logs'];
    const defaultGuild = process.env.BATCH_GUILD_ID || "1286206719847960670";

    for (const table of tables) {
      console.log(`Checking/Adding guild_id to ${table}...`);
      try { await db.execute(`ALTER TABLE ${table} ADD COLUMN guild_id TEXT`); } catch(_) { console.log(`  - Col already exists in ${table}`); }
      
      console.log(`  - Tagging old data with default guild: ${defaultGuild}`);
      await db.execute(`UPDATE ${table} SET guild_id = ? WHERE guild_id IS NULL`, [defaultGuild]);
    }

    // 3. Ensure minor missing columns
    try { await db.execute(`ALTER TABLE batch_requests ADD COLUMN batch_id INTEGER`); } catch(_) {}
    try { await db.execute(`ALTER TABLE batch_requests ADD COLUMN verified_at TIMESTAMP`); } catch(_) {}
    try { await db.execute(`ALTER TABLE batch_requests ADD COLUMN msg_id TEXT`); } catch(_) {}
    try { await db.execute(`ALTER TABLE batch_requests ADD COLUMN ch_id TEXT`); } catch(_) {}
    try { await db.execute(`ALTER TABLE batches ADD COLUMN guild_id TEXT`); } catch(_) {}

    console.log('✅ Migration Successful!');
    process.exit(0);
  } catch (e) {
    console.error('❌ Migration Failed:', e);
    process.exit(1);
  }
}

runMigrate();
