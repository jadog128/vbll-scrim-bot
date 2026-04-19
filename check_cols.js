require('dotenv').config({path:'c:/Users/jamie/OneDrive/Desktop/Vrdl scrim bot/.env.batch'});
const {createClient} = require('@libsql/client');
const db = createClient({url:process.env.TURSO_URL, authToken:process.env.TURSO_TOKEN});
db.execute("PRAGMA table_info(batch_requests)")
  .then(r => {
    console.log('COLUMNS:', r.rows.map(c => c.name));
    process.exit(0);
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
