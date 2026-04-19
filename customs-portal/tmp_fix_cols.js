require('dotenv').config({ path: '.env.tmp' });
const { createClient } = require('@libsql/client');

async function migrate() {
  const db = createClient({ 
    url: process.env.TURSO_URL, 
    authToken: process.env.TURSO_TOKEN 
  });
  
  try {
    await db.execute("ALTER TABLE batch_requests ADD COLUMN msg_id TEXT");
    console.log('✅ Added msg_id');
  } catch(e) { console.log('msg_id exists'); }

  try {
    await db.execute("ALTER TABLE batch_requests ADD COLUMN ch_id TEXT");
    console.log('✅ Added ch_id');
  } catch(e) { console.log('ch_id exists'); }

  console.log('✅ Migration Finalized.');
}
migrate();
