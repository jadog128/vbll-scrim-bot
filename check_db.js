require('dotenv').config({path:'c:/Users/jamie/OneDrive/Desktop/Vrdl scrim bot/.env.batch'});
const {createClient} = require('@libsql/client');
const db = createClient({url:process.env.TURSO_URL, authToken:process.env.TURSO_TOKEN});
db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='guild_settings'")
  .then(r => {
    console.log('TABLES:', r.rows);
    process.exit(0);
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
