require('dotenv').config({ path: '.env.batch' });
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_TOKEN,
});

async function check() {
  try {
    const res = await db.execute("PRAGMA table_info(batch_requests)");
    console.log('Columns in batch_requests:');
    res.rows.forEach(row => console.log(`- ${row[1]}`));
    
    // Check if vrfs_id exists
    const hasVrfs = res.rows.some(row => row[1] === 'vrfs_id');
    if (!hasVrfs) {
      console.log('⚠️ vrfs_id is MISSING! Adding it now...');
      await db.execute("ALTER TABLE batch_requests ADD COLUMN vrfs_id TEXT");
      console.log('✅ Column added successfully.');
    } else {
      console.log('✅ vrfs_id already exists.');
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}

check();
