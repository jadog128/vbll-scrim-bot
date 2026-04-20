const { execute } = require('./src/lib/db');

async function check() {
  try {
    const res = await execute('SELECT * FROM guild_settings LIMIT 10');
    console.log('--- GUILD SETTINGS ---');
    console.log(JSON.stringify(res.rows, null, 2));
    
    const count = await execute('SELECT COUNT(*) as count FROM guild_settings');
    console.log('Total Settings Rows:', count.rows[0].count);

    const guilds = await execute('SELECT DISTINCT guild_id FROM guild_settings');
    console.log('Distinct Guild IDs:', guilds.rows.map(r => r.guild_id));

  } catch (e) {
    console.error('Error fetching settings:', e.message);
  }
}

check();
