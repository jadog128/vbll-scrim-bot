const turso = require('./_db');

module.exports = async (req, res) => {
  const { action } = req.query;
  
  // Ensure schema is up to date (Silent ignore if already there)
  try {
      await turso.execute("ALTER TABLE players ADD COLUMN widgets TEXT DEFAULT '{}'");
  } catch(e) {}

  try {
    if (action === 'toggle-lft' && req.method === 'POST') {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: 'Missing userId' });
      
      const { rows } = await turso.execute({ 
        sql: 'SELECT is_free_agent FROM players WHERE discord_id = ?', 
        args: [userId] 
      });
      
      if (rows.length === 0) return res.status(404).json({ error: 'Player not found' });
      
      const newState = rows[0].is_free_agent === 1 ? 0 : 1;
      await turso.execute({ 
        sql: 'UPDATE players SET is_free_agent = ? WHERE discord_id = ?', 
        args: [newState, userId] 
      });
      
      return res.status(200).json({ success: true, is_free_agent: newState === 1 });
    }
    
    if (action === 'search' && req.method === 'GET') {
      const q = req.query.q || '';
      if (q.length < 2) return res.status(200).json({ players: [], teams: [] });
      
      const term = `%${q}%`;
      const players = await turso.execute({ 
        sql: 'SELECT discord_id, username, is_free_agent, market_value FROM players WHERE username LIKE ? LIMIT 5', 
        args: [term] 
      });
      const teams = await turso.execute({ 
        sql: 'SELECT id, name FROM teams WHERE name LIKE ? LIMIT 5', 
        args: [term] 
      });
      
      return res.status(200).json({ players: players.rows, teams: teams.rows });
    }
    
    if (action === 'match-details' && req.method === 'GET') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      
      const { rows } = await turso.execute({ 
        sql: 'SELECT * FROM matches WHERE id = ?', 
        args: [id] 
      });
      
      if (rows.length === 0) return res.status(404).json({ error: 'Match not found' });
      return res.status(200).json({ match: rows[0], timeline: [] });
    }

    if (action === 'trophies' && req.method === 'GET') {
      const { userId } = req.query;
      if (!userId) return res.status(400).json({ error: 'Missing userId' });
      
      const { rows } = await turso.execute({ 
        sql: 'SELECT badge_name, description, season, earned_at FROM achievements WHERE player_discord_id = ? ORDER BY earned_at DESC', 
        args: [userId] 
      });
      
      return res.status(200).json({ trophies: rows });
    }

    if (action === 'team-details' && req.method === 'GET') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Missing team id' });

      // Get team info
      const teamRs = await turso.execute({
        sql: 'SELECT * FROM teams WHERE id = ?',
        args: [id]
      });

      if (teamRs.rows.length === 0) return res.status(404).json({ error: 'Team not found' });

      // Get players on this team
      const playersRs = await turso.execute({
        sql: 'SELECT * FROM players WHERE team_id = ?',
        args: [id]
      });

      const teamData = {};
      teamRs.columns.forEach((col, i) => teamData[col] = teamRs.rows[0][i]);

      // Get recent matches for this team
      const matchesRs = await turso.execute({
        sql: "SELECT * FROM matches WHERE (home_team = ? OR away_team = ?) AND status = 'completed' ORDER BY gw DESC, id DESC",
        args: [teamData.name, teamData.name]
      });

      const playersData = playersRs.rows.map(row => {
          const p = {};
          playersRs.columns.forEach((col, i) => p[col] = row[i]);
          return p;
      });

      const allMatches = matchesRs.rows.map(row => {
          const m = {};
          matchesRs.columns.forEach((col, i) => m[col] = row[i]);
          return m;
      });

      // Calculate true league points
      let totalPts = 0;
      allMatches.forEach(m => {
          const isHome = m.home_team === teamData.name;
          const s1 = isHome ? m.home_score : m.away_score;
          const s2 = isHome ? m.away_score : m.home_score;
          if (s1 > s2) totalPts += 3;
          else if (s1 === s2) totalPts += 1;
      });

      return res.status(200).json({ 
          team: teamData, 
          players: playersData, 
          matches: allMatches.slice(0, 5),
          totalPts: totalPts 
      });
    }

    if (action === 'check-admin' && req.method === 'GET') {
      const { userId } = req.query;
      const GUILD_ID = process.env.GUILD_ID;
      const BOT_TOKEN = process.env.DISCORD_TOKEN;

      if (!userId || !GUILD_ID || !BOT_TOKEN) {
        return res.status(400).json({ error: 'Missing required configuration' });
      }

      const response = await fetch(`https://discord.com/api/guilds/${GUILD_ID}/members/${userId}`, {
        headers: { Authorization: `Bot ${BOT_TOKEN}` }
      });

      if (!response.ok) return res.status(200).json({ isAdmin: false });

      const member = await response.json();
      return res.status(200).json({ 
          isAdmin: member.roles && member.roles.length > 0,
          roles: member.roles 
      });
    }

    if (action === 'notifications' && req.method === 'GET') {
      const { userId } = req.query;
      if (!userId) return res.status(400).json({ error: 'Missing userId' });
      
      const rs = await turso.execute({ 
        sql: 'SELECT * FROM stat_requests WHERE player_discord_id = ? ORDER BY created_at DESC LIMIT 5', 
        args: [userId] 
      });
      
      const notifications = rs.rows.map(row => {
          const item = {};
          rs.columns.forEach((col, i) => item[col] = row[i]);
          return item;
      });
      
      return res.status(200).json({ notifications });
    }

    if (action === 'update-profile' && req.method === 'POST') {
      const { userId, position, bio, widgets } = req.body;
      if (!userId) return res.status(400).json({ error: 'Missing userId' });
      
      try {
          // Attempt to update common fields + widgets
          await turso.execute({
            sql: 'UPDATE players SET position = ?, bio = ?, widgets = ? WHERE discord_id = ?',
            args: [position, bio, JSON.stringify(widgets || {}), userId]
          });
      } catch(e) {
          // Fallback if widgets column doesn't exist yet
          try {
              await turso.execute({
                sql: 'UPDATE players SET position = ?, bio = ? WHERE discord_id = ?',
                args: [position, bio, userId]
              });
          } catch(err) { console.error("Update fail:", err); }
          console.error("Turso column error (widgets likely missing):", e.message);
      }
      return res.status(200).json({ success: true });
    }

    if (action === 'ticker-data' && req.method === 'GET') {
      // Fetch dynamic news for the ticker
      const recentMatches = await turso.execute("SELECT home_team, away_team, home_score, away_score FROM matches WHERE status = 'completed' ORDER BY gw DESC, id DESC LIMIT 5");
      const topScorer = await turso.execute("SELECT player_name, SUM(value) as total FROM stats WHERE stat_type = 'goals' GROUP BY player_discord_id ORDER BY total DESC LIMIT 1");
      const totalPlayers = await turso.execute("SELECT COUNT(*) as count FROM players");

      const tickerItems = [];
      
      // 1. Add top scorer news
      if (topScorer.rows.length > 0) {
          tickerItems.push(`⚽ <b>${topScorer.rows[0][0]}</b> leads the golden boot race with <b>${topScorer.rows[0][1]}</b> goals!`);
      }

      // 2. Add match results
      recentMatches.rows.forEach(m => {
          tickerItems.push(`⚡ <b>${m[0]} ${m[2]} - ${m[3]} ${m[1]}</b>`);
      });

      // 3. Add network stats
      tickerItems.push(`🚀 <b>${totalPlayers.rows[0][0]}</b> active players currently in the VRFN ecosystem!`);
      tickerItems.push(`💎 Join the discord to become a professional virtual footballer!`);

      return res.status(200).json({ items: tickerItems });
    }

    return res.status(404).json({ error: 'Action endpoint not found' });
  } catch (e) {
    console.error('API Error:', e);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
