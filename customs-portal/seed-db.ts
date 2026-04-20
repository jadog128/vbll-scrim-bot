import { execute } from './src/lib/db';

async function seed() {
  const guildId = '1286206719847960670';
  const guildName = 'VBLL Official';
  
  const settings = [
    { key: 'league_name', value: guildName },
    { key: 'enabled', value: 'true' },
    { key: 'category_id', value: '1286206719847960671' } // Placeholder
  ];

  try {
    for (const s of settings) {
      await execute("INSERT OR REPLACE INTO guild_settings (guild_id, key, value) VALUES (?, ?, ?)", [guildId, s.key, s.value]);
    }
    console.log('Seeded settings for', guildName);
  } catch (e: any) {
    console.error('Seed failed:', e.message);
  }
}

seed();
