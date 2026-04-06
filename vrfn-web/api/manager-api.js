const isManager = require('./_manager');
const turso = require('./_db');

module.exports = async (req, res) => {
  const { action, userId } = req.query;
  if (!userId) return res.status(403).json({ error: 'Missing userId' });

  const isAdmin = require('./_admin');
  const userIsAdmin = await isAdmin(userId);
  const { targetTeamId } = req.query;

  let managedTeam = await isManager(userId);
  
  // Admin Override: If admin and targetTeamId provided, fetch that team instead
  if (userIsAdmin && targetTeamId) {
    const teamRs = await turso.execute({ sql: "SELECT * FROM teams WHERE id = ?", args: [targetTeamId] });
    if (teamRs.rows.length > 0) {
      managedTeam = {};
      teamRs.columns.forEach((col, i) => managedTeam[col] = teamRs.rows[0][i]);
    }
  }

  if (!managedTeam) return res.status(403).json({ error: 'Unauthorized' });

  try {
    switch (action) {
      case 'check':
        return res.status(200).json(managedTeam);

      case 'data':
        const roster = await turso.execute({
          sql: "SELECT * FROM players WHERE team_id = ? ORDER BY username ASC",
          args: [managedTeam.id]
        });
        const fixtures = await turso.execute({
          sql: "SELECT * FROM matches WHERE (home_team = ? OR away_team = ?) ORDER BY gw ASC",
          args: [managedTeam.name, managedTeam.name]
        });
        const freeAgents = await turso.execute("SELECT * FROM players WHERE is_free_agent = 1 ORDER BY username ASC LIMIT 100");

        return res.status(200).json({
          team: managedTeam,
          roster: roster.rows.map(r => {
            const o = {}; roster.columns.forEach((c, i) => o[c] = r[i]); return o;
          }),
          fixtures: fixtures.rows.map(r => {
            const o = {}; fixtures.columns.forEach((c, i) => o[c] = r[i]); return o;
          }),
          freeAgents: freeAgents.rows.map(r => {
            const o = {}; freeAgents.columns.forEach((c, i) => o[c] = r[i]); return o;
          })
        });

      case 'sign':
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
        const { playerDiscordId, type } = req.body;
        if (!playerDiscordId || !type) return res.status(400).json({ error: 'Missing parameters' });

        // If it's a manual ID (not a selection), we might need to ensurePlayer
        // But for official signings, we should at least check if they exist or create a basic entry

        const playerResp = await turso.execute({
          sql: "SELECT * FROM players WHERE discord_id = ?",
          args: [playerDiscordId]
        });
        if (!playerResp.rows.length) return res.status(404).json({ error: 'Player not found' });
        const p = {}; playerResp.columns.forEach((col, i) => p[col] = playerResp.rows[0][i]);

        if (type === 'sign') {
          if (!p.is_free_agent) return res.status(400).json({ error: 'Player is not a Free Agent' });
          await turso.execute({
            sql: "UPDATE players SET team_id = ?, is_free_agent = 0 WHERE discord_id = ?",
            args: [managedTeam.id, playerDiscordId]
          });
          await turso.execute({
            sql: "INSERT INTO transfers (player_discord_id, player_name, from_team, to_team, type, status) VALUES (?, ?, 'Free Agent', ?, 'transfer', 'completed')",
            args: [playerDiscordId, p.username, managedTeam.name]
          });
          return res.status(200).json({ success: true, message: `Successfully signed ${p.username}` });
        }

        if (type === 'release') {
          if (String(p.team_id) !== String(managedTeam.id)) return res.status(400).json({ error: 'Player is not on your team' });
          await turso.execute({
            sql: "UPDATE players SET is_transfer_listed = 1 WHERE discord_id = ?",
            args: [playerDiscordId]
          });
          await turso.execute({
            sql: "INSERT INTO transfers (player_discord_id, player_name, from_team, to_team, type, status) VALUES (?, ?, ?, 'Transfer Market', 'listing', 'pending')",
            args: [playerDiscordId, p.username, managedTeam.name]
          });
          return res.status(200).json({ success: true, message: `${p.username} has been listed on the Transfer Market.` });
        }
        return res.status(400).json({ error: 'Invalid operation' });

      case 'request-room':
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
        await turso.execute({
          sql: "INSERT INTO signing_room_requests (manager_discord_id, team_name) VALUES (?, ?)",
          args: [userId, managedTeam.name]
        });
        return res.status(200).json({ success: true, message: 'Signing room requested! Check Discord in a few seconds.' });

      case 'market':
        const marketRs = await turso.execute({
          sql: "SELECT p.*, t.name as team_name FROM players p LEFT JOIN teams t ON p.team_id = t.id WHERE p.is_transfer_listed = 1 ORDER BY p.username ASC",
          args: []
        });
        return res.status(200).json(marketRs.rows.map(r => {
          const o = {}; marketRs.columns.forEach((c, i) => o[c] = r[i]); return o;
        }));

      case 'pending':
        const pendingRs = await turso.execute({
          sql: "SELECT * FROM transfers WHERE (from_team = ? OR to_team = ?) AND status = 'pending' ORDER BY created_at DESC",
          args: [managedTeam.name, managedTeam.name]
        });
        return res.status(200).json(pendingRs.rows.map(r => {
          const o = {}; pendingRs.columns.forEach((c, i) => o[c] = r[i]); return o;
        }));

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
