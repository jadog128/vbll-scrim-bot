const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_TOKEN,
});

module.exports = async (req, res) => {
  const { userId } = req.query;

  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  try {
    // 1. Fetch Aggregate Stats
    const statsRes = await client.execute({
      sql: 'SELECT stat_type, SUM(value) as total FROM stats WHERE player_discord_id = ? GROUP BY stat_type',
      args: [userId]
    });

    // 2. Fetch Player Info (Market Value, etc.)
    const playerRes = await client.execute({
      sql: 'SELECT market_value, is_free_agent, bio, position, widgets FROM players WHERE discord_id = ?',
      args: [userId]
    });

    // Process stats into a clean object
    const stats = {
        goals: 0,
        assists: 0,
        clean_sheets: 0,
        matches: 0
    };

    statsRes.rows.forEach(row => {
        const type = row.stat_type.toLowerCase();
        if (type.includes('goal')) stats.goals = row.total;
        if (type.includes('assist')) stats.assists = row.total;
        if (type.includes('clean') || type.includes('cs')) stats.clean_sheets = row.total;
        if (type.includes('match') || type.includes('played')) stats.matches = row.total;
    });

    const playerData = playerRes.rows[0] || { market_value: 0, is_free_agent: 1 };
    
    // Merge into stats object so main.js can read them as stats.bio, stats.position, stats.widgets
    stats.bio = playerData.bio;
    stats.position = playerData.position;
    stats.widgets = playerData.widgets;

    res.status(200).json({
      stats,
      marketValue: playerData.market_value,
      isFreeAgent: playerData.is_free_agent
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
