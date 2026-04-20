const { createClient } = require('@libsql/client');
require('dotenv').config();

async function migrate() {
  const url = process.env.TURSO_URL;
  const token = process.env.TURSO_TOKEN;

  if (!url) {
    console.error("TURSO_URL missing");
    return;
  }

  const db = createClient({ url, authToken: token || "" });
  
  console.log("Adding hidden_from_admin column...");
  try {
    await db.execute("ALTER TABLE batch_requests ADD COLUMN hidden_from_admin INTEGER DEFAULT 0");
    console.log("✅ Success!");
  } catch (e) {
    if (e.message.includes("duplicate column name")) {
      console.log("⏩ Column already exists.");
    } else {
      console.error("❌ Error:", e.message);
    }
  }
}

migrate();
