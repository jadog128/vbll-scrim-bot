const turso = require('../_db');

module.exports = async (req, res) => {
  const { season } = req.query;
  const seasonFilter = season ? `WHERE season = '${season}'` : '';
  const matchSeasonFilter = season ? `AND season = '${season}'` : '';
  const statsSeasonFilter = season ? `WHERE season = '${season}'` : '';

  try {
    // 1. Fetch Stats for Leaderboards
    const statsRS = await turso.execute(`SELECT player_discord_id, player_name, stat_type, SUM(value) as total FROM stats ${statsSeasonFilter} GROUP BY player_discord_id, stat_type`);
    const stats = statsRS.rows.map(row => {
        const r = {};
        statsRS.columns.forEach((col, i) => r[col] = row[i]);
        return r;
    });

    // 2. Fetch Matches for Standings & Fixtures
    const matchesRS = await turso.execute(`SELECT * FROM matches WHERE 1=1 ${matchSeasonFilter} ORDER BY gw ASC, id ASC`);
    const matches = matchesRS.rows.map(row => {
        const r = {};
        matchesRS.columns.forEach((col, i) => r[col] = row[i]);
        return r;
    });

    // 3. Fetch Teams & Calculate Finance
    const teamsRS = await turso.execute("SELECT id, name, division, balance, salary_cap FROM teams");
    const teams = teamsRS.rows.map(row => {
        const r = {};
        teamsRS.columns.forEach((col, i) => r[col] = row[i]);
        return r;
    });

    // 4. Fetch All Players for Market & Finance
    const playersRS = await turso.execute("SELECT discord_id, username, team_id, market_value, is_transfer_listed, previous_teams FROM players");
    const players = playersRS.rows.map(row => {
        const r = {};
        playersRS.columns.forEach((col, i) => r[col] = row[i]);
        return r;
    });

    // Calculate Team Net Worth & Squad Size
    teams.forEach(t => {
        const squad = players.filter(p => p.team_id == t.id);
        t.squad_size = squad.length;
        t.net_worth = squad.reduce((sum, p) => sum + (p.market_value || 0), 0) + (t.balance || 0);
    });

    // Process Standings
    const standings = {};
    teams.forEach(t => {
        standings[t.name] = { id: t.id, name: t.name, division: t.division, p:0, w:0, d:0, l:0, gf:0, ga:0, gd:0, pts:0 };
    });

    matches.filter(m => m.status === 'completed').forEach(m => {
        const home = standings[m.home_team];
        const away = standings[m.away_team];
        if (!home || !away) return;

        home.p++; away.p++;
        home.gf += Number(m.home_score); home.ga += Number(m.away_score);
        away.gf += Number(m.away_score); away.ga += Number(m.home_score);

        if (Number(m.home_score) > Number(m.away_score)) {
            home.w++; home.pts += 3; away.l++;
        } else if (Number(m.home_score) < Number(m.away_score)) {
            away.w++; away.pts += 3; home.l++;
        } else {
            home.d++; home.pts += 1; away.d++; away.pts += 1;
        }
        home.gd = home.gf - home.ga;
        away.gd = away.gf - away.ga;
    });

    const standingsArray = Object.values(standings).sort((a,b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);

    // Process Leaderboards
    const goals = stats.filter(s => s.stat_type === 'goals').sort((a,b) => b.total - a.total).slice(0, 10);
    const assists = stats.filter(s => s.stat_type === 'assists').sort((a,b) => b.total - a.total).slice(0, 10);
    
    const seasonsRS = await turso.execute("SELECT DISTINCT season FROM matches");
    const seasons = seasonsRS.rows.map(r => r[0]);

    return res.status(200).json({
        standings: standingsArray,
        leaderboards: { goals, assists },
        fixtures: matches.filter(m => m.status === 'scheduled'),
        market: players.filter(p => p.is_transfer_listed === 1),
        finance: teams.sort((a,b) => b.net_worth - a.net_worth),
        seasons: seasons.filter(s => s)
    });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
