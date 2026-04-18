const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.batch' });

async function init() {
  const db = createClient({ 
    url: process.env.TURSO_URL || process.env.SCRIM_TURSO_URL, 
    authToken: process.env.TURSO_TOKEN || process.env.SCRIM_TURSO_TOKEN 
  });
  
  console.log("Creating tables...");
  try {
    await db.execute(`CREATE TABLE IF NOT EXISTS batch_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discord_id TEXT,
      username TEXT,
      issue TEXT,
      status TEXT DEFAULT 'open',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log("✅ batch_tickets created.");
  } catch (e) {
    console.error("❌ Error:", e.message);
  }
}

init();
