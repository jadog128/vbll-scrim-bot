import { createClient } from "@libsql/client";
import { config } from "dotenv";
config({ path: ".env.local" });
const db = createClient({ 
    url: process.env.VBLL_TURSO_URL || process.env.TURSO_URL || "", 
    authToken: process.env.VBLL_TURSO_TOKEN || process.env.TURSO_TOKEN || "" 
});
db.execute(`
    CREATE TABLE IF NOT EXISTS broadcasts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'info',
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`).then(() => {
    console.log("Broadcasts table created or already exists.");
}).catch(console.error);

