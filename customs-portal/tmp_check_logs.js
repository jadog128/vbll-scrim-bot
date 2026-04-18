const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.batch' });

async function check() {
  const db = createClient({ 
    url: process.env.TURSO_URL || process.env.SCRIM_TURSO_URL, 
    authToken: process.env.TURSO_TOKEN || process.env.SCRIM_TURSO_TOKEN 
  });
  
  try {
    const res = await db.execute("SELECT * FROM staff_logs LIMIT 5");
    console.log("LOGS:", res.rows);
  } catch (e) {
    console.error("ERROR:", e.message);
  }
}

check();
