const { createClient } = require('@libsql/client'); 
(async () => { 
    try {
        const db = createClient({ 
            url: 'libsql://vbllscrim-bot-mikefeufh.aws-eu-west-1.turso.io', 
            authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzU1MDMwODYsImlkIjoiMDE5ZDYyZGYtMmYwMS03YmNlLTg5Y2ItNDhiYTI3NmZlM2JlIiwicmlkIjoiNjAzZmZjOGYtYWI2ZS00MjU3LTkzOTAtZDA2ODlhMzE0YzIyIn0.jaNgxQ9gf8fp5pdhC_dSptGq4OvHL-Am-GO1WDaGQRJ8YHFWLIbUjY4s5facimAHts3B9-4UJN6R3yI24RwDBw' 
        }); 
        const res = await db.execute("SELECT * FROM staff_logs WHERE action = 'WEB_TRACE' ORDER BY id DESC LIMIT 5"); 
        console.log(JSON.stringify(res.rows, null, 2)); 
    } catch (e) {
        console.error(e);
    }
})();
