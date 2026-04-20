const { createClient } = require('@libsql/client');

async function fix() {
  const db = createClient({ 
    url: 'libsql://vbllscrim-bot-mikefeufh.aws-eu-west-1.turso.io', 
    authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzU1MDMwODYsImlkIjoiMDE5ZDYyZGYtMmYwMS03YmNlLTg5Y2ItNDhiYTI3NmZlM2JlIiwicmlkIjoiNjAzZmZjOGYtYWI2ZS00MjU3LTkzOTAtZDA2ODlhMzE0YzIyIn0.jaNgxQ9gf8fp5pdhC_dSptGq4OvHL-Am-GO1WDaGQRJ8YHFWLIbUjY4s5facimAHts3B9-4UJN6R3yI24RwDBw' 
  });
  
  console.log("Fixing 2 NULL guild IDs...");
  const res = await db.execute("UPDATE batch_requests SET guild_id = '1286206719847960670' WHERE guild_id IS NULL");
  console.log(`✅ Updated ${res.rowsAffected} rows.`);
}

fix();
