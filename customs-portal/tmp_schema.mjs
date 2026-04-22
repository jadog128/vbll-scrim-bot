import { createClient } from "@libsql/client";
import { config } from "dotenv";
config({ path: ".env.local" });
const db = createClient({ 
    url: process.env.VBLL_TURSO_URL || process.env.TURSO_URL || "", 
    authToken: process.env.VBLL_TURSO_TOKEN || process.env.TURSO_TOKEN || "" 
});
db.execute("SELECT sql FROM sqlite_master WHERE name IN ('batch_tickets', 'ticket_messages');").then(res => {
    console.log(res.rows);
}).catch(console.error);







