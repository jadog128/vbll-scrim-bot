const { createClient } = require('@libsql/client');  
const db = createClient({ url: process.env.TURSO_URL, authToken: process.env.TURSO_TOKEN });  
db.execute(\"SELECT name FROM sqlite_master WHERE type='table';\").then(res => console.log(res.rows)).catch(console.error);  
