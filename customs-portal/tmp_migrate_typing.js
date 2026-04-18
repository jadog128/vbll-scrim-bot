require('dotenv').config({ path: '.env.tmp' });
const { createClient } = require('@libsql/client');

async function migrate() {
  const db = createClient({ 
    url: process.env.TURSO_URL, 
    authToken: process.env.TURSO_TOKEN 
  });
  
  try {
    await db.execute("ALTER TABLE batch_tickets ADD COLUMN user_typing_at TIMESTAMP");
    await db.execute("ALTER TABLE batch_tickets ADD COLUMN staff_typing_at TIMESTAMP");
    console.log('✅ Added typing columns to batch_tickets.');
  } catch(e) { console.error('Error:', e.message); }

  console.log('✅ Migration Check Complete.');
}
migrate();
