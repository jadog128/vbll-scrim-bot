const { createClient } = require('@libsql/client');

async function check() {
  const db = createClient({ 
    url: 'libsql://vcc-batcheron-mikefeufh.aws-eu-west-1.turso.io', 
    authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzU2NjYzMTMsImlkIjoiMDE5ZDZjZmQtN2QwMS03NjMyLWIzNDgtYWM0YWZkNDI0MzE4IiwicmlkIjoiMzY5M2I4MjQtMzc2NC00Nzc4LWEwZWYtNjA0MDcwMGZlYTYxIn0.53D70gNAq_D1ZkI6GKYRA-ANdcnCmWXazQM4KV6Su6E7ghAd10sXEABEoY3IrAdFOw2GyhiRsPaD7z_MQLBlCQ' 
  });
  
  try {
      const res = await db.execute("SELECT count(*) as cnt FROM batch_requests");
      console.log("Total in other DB:", res.rows[0].cnt);
      
      const recent = await db.execute("SELECT * FROM batch_requests ORDER BY id DESC LIMIT 5");
      console.log("Recent from other DB:", JSON.stringify(recent.rows, null, 2));
  } catch (e) {
      console.error(e.message);
  }
}

check();
