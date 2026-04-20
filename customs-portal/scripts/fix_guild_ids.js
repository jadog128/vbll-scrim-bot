const { createClient } = require('@libsql/client');
require('dotenv').config();

async function fix() {
  const db = createClient({ 
    url: process.env.TURSO_URL, 
    authToken: process.env.TURSO_TOKEN 
  });
  
  console.log("Fixing NULL guild IDs...");
  // We'll set them to the main guild provided by user
  const res = await db.execute("UPDATE batch_requests SET guild_id = '1286206719847960670' WHERE guild_id IS NULL");
  console.log(`✅ Updated ${res.rowsAffected} rows.`);
}

fix();
