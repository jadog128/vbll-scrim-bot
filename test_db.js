require('dotenv').config();
require('dotenv').config({ path: '.env.scrim' });
const { createClient } = require('@libsql/client');
const turso = createClient({
  url: process.env.SCRIM_TURSO_URL,
  authToken: process.env.SCRIM_TURSO_TOKEN,
});
async function test() {
  try {
    const r = await turso.execute('SELECT 1');
    console.log('✅ DATABASE CONNECTED');
  } catch (e) {
    console.error('❌ DATABASE FAILED:', e.message);
  }
  process.exit(0);
}
test();
