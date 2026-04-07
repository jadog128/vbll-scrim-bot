const { createClient } = require('@libsql/client');

const turso = createClient({
  url: 'libsql://vbllscrim-bot-mikefeufh.aws-eu-west-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzU1MDMwODYsImlkIjoiMDE5ZDYyZGYtMmYwMS03YmNlLTg5Y2ItNDhiYTI3NmZlM2JlIiwicmlkIjoiNjAzZmZjOGYtYWI2ZS00MjU3LTkzOTAtZDA2ODlhMzE0YzIyIn0.jaNgxQ9gf8fp5pdhC_dSptGq4OvHL-Am-GO1WDaGQRJ8YHFWLIbUjY4s5facimAHts3B9-4UJN6R3yI24RwDBw',
});

async function test() {
  try {
    console.log('--- TABLE LIST ---');
    const tables = await turso.execute("SELECT name FROM sqlite_master WHERE type='table';");
    console.log(tables.rows.map(r => r[0]).join(', '));

    console.log('\n--- SHOP ITEMS ---');
    const shop = await turso.execute("SELECT * FROM scrim_shop LIMIT 10;");
    if (shop.rows.length === 0) {
      console.log('NO SHOP ITEMS FOUND.');
    } else {
      shop.rows.forEach(r => console.log(Object.fromEntries(shop.columns.map((c, i) => [c, r[i]]))));
    }

    console.log('\n--- BATCH SETTINGS ---');
    const settings = await turso.execute("SELECT * FROM batch_settings;");
    settings.rows.forEach(r => console.log(Object.fromEntries(settings.columns.map((c, i) => [c, r[i]]))));

  } catch (e) {
    console.error('ERROR:', e.message);
  }
}

test();
