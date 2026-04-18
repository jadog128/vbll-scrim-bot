require('dotenv').config({ path: '.env.tmp' });
const { createClient } = require('@libsql/client');

async function migrate() {
  const db = createClient({ 
    url: process.env.TURSO_URL, 
    authToken: process.env.TURSO_TOKEN 
  });
  
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS ticket_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id INTEGER NOT NULL,
        sender_id TEXT NOT NULL,
        sender_name TEXT NOT NULL,
        content TEXT NOT NULL,
        is_staff INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ticket_id) REFERENCES batch_tickets(id)
      )
    `);
    console.log('✅ Created ticket_messages table.');
  } catch(e) { console.error('Error creating messages table:', e.message); }
  
  try {
     await db.execute('ALTER TABLE batch_tickets ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
  } catch(e) {}

  console.log('✅ Migration Check Complete.');
}
migrate();
