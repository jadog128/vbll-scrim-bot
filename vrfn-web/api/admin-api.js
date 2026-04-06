const turso = require('./_db');
const isAdmin = require('./_admin');

module.exports = async (req, res) => {
  const { action, userId } = req.query;
  const isAuthorized = await isAdmin(userId);
  if (!isAuthorized) return res.status(403).json({ error: 'Unauthorized' });

  const logAction = async (act, target, detail) => {
    try {
      const adminRs = await turso.execute({ sql: "SELECT username FROM players WHERE discord_id = ?", args: [userId] });
      const adminName = adminRs.rows.length ? adminRs.rows[0][0] : 'Admin';
      await turso.execute({
        sql: "INSERT INTO audit_log (action, performed_by_id, performed_by_name, target, detail) VALUES (?, ?, ?, ?, ?)",
        args: [act, userId, adminName, target, detail]
      });
    } catch (err) { console.error('Audit Log Error:', err); }
  };

  try {
    switch (action) {
      case 'teams':
        if (req.method === 'GET') {
          const rs = await turso.execute("SELECT t.*, (SELECT COUNT(*) FROM players p WHERE p.team_id = t.id) as player_count FROM teams t ORDER BY t.name ASC");
          return res.status(200).json(rs.rows.map(row => {
            const t = {}; rs.columns.forEach((col, i) => t[col] = row[i]); return t;
          }));
        }
        if (req.method === 'POST') {
          const { id, name, manager_discord_id, balance, salary_cap, division, role_id } = req.body;
          if (id) {
            await turso.execute({
              sql: "UPDATE teams SET name = ?, manager_discord_id = ?, balance = ?, salary_cap = ?, division = ?, role_id = ? WHERE id = ?",
              args: [name, manager_discord_id, balance, salary_cap, division || null, role_id || null, id]
            });
            await logAction('team_updated', name, `Updated team details for ${name}`);
          } else {
            await turso.execute({
              sql: "INSERT INTO teams (name, manager_discord_id, balance, salary_cap, division, role_id) VALUES (?, ?, ?, ?, ?, ?)",
              args: [name, manager_discord_id, balance, salary_cap, division || null, role_id || null]
            });
            await logAction('team_created', name, `Created new team: ${name}`);
          }
          return res.status(200).json({ success: true });
        }
        if (req.method === 'DELETE') {
          await turso.execute({ sql: "DELETE FROM teams WHERE id = ?", args: [req.body.id] });
          return res.status(200).json({ success: true });
        }
        break;

      case 'players':
        if (req.method === 'GET') {
          const rs = await turso.execute(`
            SELECT p.*, t.name as team_name 
            FROM players p 
            LEFT JOIN teams t ON p.team_id = t.id 
            ORDER BY p.last_activity DESC
          `);
          return res.status(200).json(rs.rows.map(row => {
            const p = {}; rs.columns.forEach((col, i) => p[col] = row[i]); return p;
          }));
        }
        if (req.method === 'POST') {
          const { player_action, discord_id, team_id, is_free_agent, title, message } = req.body;
          if (player_action === 'dm') {
            await turso.execute({
              sql: "INSERT INTO dm_queue (target_id, title, message) VALUES (?, ?, ?)",
              args: [discord_id, title || '🔔 Notification', message]
            });
            await logAction('dm_sent', discord_id, `Manually sent DM to player ${discord_id}`);
          } else if (player_action === 'manual-sign') {
            if (team_id === 'free_agent') {
              await turso.execute({
                sql: "UPDATE players SET team_id = NULL, is_free_agent = 1, is_transfer_listed = 0 WHERE discord_id = ?",
                args: [discord_id]
              });
              await logAction('manual_release', discord_id, `Manually released player to Free Agents`);
            } else {
              const oldPlRs = await turso.execute({ sql: "SELECT team_id FROM players WHERE discord_id = ?", args: [discord_id] });
              const oldTeamId = oldPlRs.rows.length ? oldPlRs.rows[0][0] : null;
              const oldTeamNameRs = oldTeamId ? await turso.execute({ sql: "SELECT name FROM teams WHERE id = ?", args: [oldTeamId] }) : null;
              const oldTeamName = oldTeamNameRs?.rows.length ? oldTeamNameRs.rows[0][0] : 'Free Agent';

              await turso.execute({
                sql: "UPDATE players SET team_id = ?, is_free_agent = 0, is_transfer_listed = 0, previous_teams = CASE WHEN previous_teams IS NULL THEN ? ELSE previous_teams || ', ' || ? END WHERE discord_id = ?",
                args: [team_id, oldTeamName, oldTeamName, discord_id]
              });

              // --- SIGNING NOTIFICATIONS ---
              try {
                const pRs = await turso.execute({ sql: "SELECT username FROM players WHERE discord_id = ?", args: [discord_id] });
                const pName = pRs.rows.length ? pRs.rows[0][0] : 'Unknown';
                const tRs = await turso.execute({ sql: "SELECT name, division, manager_discord_id FROM teams WHERE id = ?", args: [team_id] });
                if (tRs.rows.length) {
                  const tData = { name: tRs.rows[0][0], division: tRs.rows[0][1], manager: tRs.rows[0][2] };
                  const sRs = await turso.execute("SELECT key, value FROM settings WHERE key IN ('signings_channel_id', 'prem_overseer_id', 'champ_overseer_id', 'owner_id')");
                  const sMap = {}; sRs.rows.forEach(r => sMap[r[0]] = r[1]);
                  
                  if (sMap.signings_channel_id) {
                    await turso.execute({
                      sql: "INSERT INTO channel_queue (channel_id, message) VALUES (?, ?)",
                      args: [sMap.signings_channel_id, `✍️ **${pName}** has signed for **${tData.name}**! <@${discord_id}>`]
                    });
                  }
                  
                  const dmMsg = `✍️ Signing Alert: **${pName}** has joined **${tData.name}**.`;
                  const dmTargets = new Set();
                  if (sMap.owner_id) dmTargets.add(sMap.owner_id);
                  if (tData.manager) dmTargets.add(tData.manager);
                  if (tData.division === 'prem' && sMap.prem_overseer_id) dmTargets.add(sMap.prem_overseer_id);
                  else if (tData.division === 'champ' && sMap.champ_overseer_id) dmTargets.add(sMap.champ_overseer_id);
                  
                  for (const target of dmTargets) {
                    await turso.execute({
                      sql: "INSERT INTO dm_queue (target_id, title, message) VALUES (?, '✍️ New Signing', ?)",
                      args: [target, dmMsg]
                    });
                  }
                }
              } catch (notifyErr) { console.error('SignNotify Error:', notifyErr); }
              // ----------------------------

              await logAction('manual_sign', discord_id, `Manually signed player to team ID ${team_id}`);
            }
          } else {
            await turso.execute({
              sql: "UPDATE players SET team_id = ?, is_free_agent = ? WHERE discord_id = ?",
              args: [team_id || null, is_free_agent ? 1 : 0, discord_id]
            });
            await logAction('player_updated', discord_id, `Updated player team/FA status`);
          }
          return res.status(200).json({ success: true });
        }
        if (req.method === 'DELETE') {
          await turso.execute({ sql: "DELETE FROM players WHERE discord_id = ?", args: [req.body.discord_id] });
          return res.status(200).json({ success: true });
        }
        break;

      case 'market':
        if (req.method === 'GET') {
          const rs = await turso.execute(`
            SELECT p.*, t.name as team_name 
            FROM players p 
            LEFT JOIN teams t ON p.team_id = t.id 
            WHERE p.is_transfer_listed = 1
            ORDER BY p.username ASC
          `);
          return res.status(200).json(rs.rows.map(row => {
            const p = {}; rs.columns.forEach((col, i) => p[col] = row[i]); return p;
          }));
        }
        break;

      case 'matches':
        if (req.method === 'GET') {
          const rs = await turso.execute("SELECT * FROM matches ORDER BY gw DESC, id DESC");
          return res.status(200).json(rs.rows.map(row => {
            const m = {}; rs.columns.forEach((col, i) => m[col] = row[i]); return m;
          }));
        }
        if (req.method === 'POST') {
          const { id, home_score, away_score, status, season, gw, home_team, away_team } = req.body;
          if (id) {
            await turso.execute({
              sql: "UPDATE matches SET home_score = ?, away_score = ?, status = ? WHERE id = ?",
              args: [home_score, away_score, status, id]
            });
            await logAction('match_updated', `ID: ${id}`, `Updated match score: ${home_score}-${away_score} (${status})`);
          } else {
            await turso.execute({
              sql: "INSERT INTO matches (season, gw, home_team, away_team, status) VALUES (?, ?, ?, ?, 'scheduled')",
              args: [season, gw, home_team, away_team]
            });
            await logAction('match_created', `${home_team} vs ${away_team}`, `Scheduled match for GW${gw}`);
          }
          return res.status(200).json({ success: true });
        }
        if (req.method === 'DELETE') {
          await turso.execute({ sql: "DELETE FROM matches WHERE id = ?", args: [req.body.id] });
          return res.status(200).json({ success: true });
        }
        break;

      case 'competitions':
        if (req.method === 'GET') {
          const rs = await turso.execute("SELECT * FROM competitions ORDER BY type ASC, name ASC");
          return res.status(200).json(rs.rows.map(row => {
            const c = {}; rs.columns.forEach((col, i) => c[col] = row[i]); return c;
          }));
        }
        if (req.method === 'POST') {
          const { id, name, type, color, emoji, point_goal, point_assist, point_def_cs, point_gk_cs, isEdit } = req.body;
          if (id && isEdit) {
            await turso.execute({
              sql: "UPDATE competitions SET name = ?, type = ?, color = ?, emoji = ?, point_goal = ?, point_assist = ?, point_def_cs = ?, point_gk_cs = ? WHERE id = ?",
              args: [name, type, color, emoji, point_goal || 0, point_assist || 0, point_def_cs || 0, point_gk_cs || 0, id]
            });
          } else {
            const actualId = id || name.toLowerCase().replace(/[^a-z0-9]/g, '');
            await turso.execute({
              sql: "INSERT INTO competitions (id, name, type, color, emoji, point_goal, point_assist, point_def_cs, point_gk_cs) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
              args: [actualId, name, type, color, emoji, point_goal || 0, point_assist || 0, point_def_cs || 0, point_gk_cs || 0]
            });
          }
          return res.status(200).json({ success: true });
        }
        if (req.method === 'DELETE') {
          await turso.execute({ sql: "DELETE FROM competitions WHERE id = ?", args: [req.body.id] });
          return res.status(200).json({ success: true });
        }
        break;

      case 'settings':
        if (req.method === 'GET') {
          if (req.query.subaction === 'analytics') {
            const data = {};
            data.season = 'Season 1';
            try {
              const srs = await turso.execute("SELECT value FROM settings WHERE key = 'current_season'");
              if (srs.rows.length > 0) data.season = srs.rows[0][0];
            } catch (err) {}
            const totalStatsRs = await turso.execute("SELECT SUM(value) FROM stats");
            data.totalStats = totalStatsRs.rows[0][0] || 0;
            const activePlayersRs = await turso.execute(`
              SELECT COUNT(*) FROM players WHERE last_activity IS NOT NULL 
              AND last_activity != '' AND datetime(last_activity) >= datetime('now', '-7 days')
            `);
            data.activePlayers = activePlayersRs.rows[0][0] || 0;
            const totalValueRs = await turso.execute("SELECT SUM(market_value) FROM players");
            data.totalValue = totalValueRs.rows[0][0] || 0;
            const topTeamsRs = await turso.execute({
              sql: "SELECT t.name, SUM(s.value) as total_pts FROM stats s JOIN players p ON s.player_discord_id = p.discord_id JOIN teams t ON p.team_id = t.id WHERE s.season = ? GROUP BY t.id, t.name ORDER BY total_pts DESC LIMIT 5",
              args: [data.season]
            });
            data.topTeams = topTeamsRs.rows.map(row => ({ name: row[0], stats: row[1] }));
            return res.status(200).json(data);
          }
          const rs = await turso.execute("SELECT * FROM settings");
          const settings = {};
          rs.rows.forEach(row => settings[row[0]] = row[1]);
          return res.status(200).json(settings);
        }
        if (req.method === 'POST') {
          await turso.execute({ sql: "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", args: [req.body.key, String(req.body.value)] });
          await logAction('settings_updated', req.body.key, `Changed ${req.body.key} to ${req.body.value}`);
          return res.status(200).json({ success: true });
        }
        break;

      case 'stat-requests':
        if (req.method === 'GET') {
          const rs = await turso.execute("SELECT * FROM stat_requests WHERE status = 'pending' ORDER BY created_at DESC");
          return res.status(200).json(rs.rows.map(row => {
            const o = {}; rs.columns.forEach((col, i) => o[col] = row[i]); return o;
          }));
        }
        if (req.method === 'POST') {
          const { action: subaction, id, note, stats } = req.body;
          const reqRs = await turso.execute({ sql: "SELECT * FROM stat_requests WHERE id = ?", args: [id] });
          if (reqRs.rows.length === 0) return res.status(404).json({ error: 'Request not found' });
          const sreq = {}; reqRs.columns.forEach((col, i) => sreq[col] = reqRs.rows[0][i]);

          if (subaction === 'approve') {
            await turso.execute({ sql: "UPDATE stat_requests SET status = 'approved', processed_by = ?, processed_at = CURRENT_TIMESTAMP, note = ? WHERE id = ?", args: [userId, note || '', id] });
            
            const effectiveStats = stats && Object.keys(stats).length > 0 ? stats : { [sreq.stat_type]: sreq.value };
            for (const [key, val] of Object.entries(effectiveStats)) {
              if (val > 0) {
                await turso.execute({
                  sql: "INSERT INTO stats (player_discord_id, player_name, season, competition, gw, stat_type, value) VALUES (?, ?, ?, ?, ?, ?, ?)",
                  args: [sreq.player_discord_id, sreq.player_name, sreq.season, 'League', sreq.gw, key, val]
                });
              }
            }
            await turso.execute({
              sql: "INSERT INTO dm_queue (target_id, title, message) VALUES (?, '📊 Stat Request Approved', ?)",
              args: [sreq.player_discord_id, `Your request for ${sreq.value}x ${sreq.stat_type} has been approved!${note ? '\nNote: ' + note : ''}`]
            });
            await logAction('stat_approved', sreq.player_name, `Approved ${sreq.value}x ${sreq.stat_type} (GW${sreq.gw})`);
          } else {
            await turso.execute({ sql: "UPDATE stat_requests SET status = 'rejected', processed_by = ?, processed_at = CURRENT_TIMESTAMP, note = ? WHERE id = ?", args: [userId, note || '', id] });
            await turso.execute({
              sql: "INSERT INTO dm_queue (target_id, title, message) VALUES (?, '❌ Stat Request Rejected', ?)",
              args: [sreq.player_discord_id, `Your request for ${sreq.value}x ${sreq.stat_type} was rejected.${note ? '\nReason: ' + note : ''}`]
            });
            await logAction('stat_declined', sreq.player_name, `Rejected ${sreq.value}x ${sreq.stat_type} (GW${sreq.gw})`);
          }
          return res.status(200).json({ success: true });
        }
        break;

      case 'generate-fixtures':
        if (req.method === 'POST') {
          const { division, gw, count: rawCount } = req.body;
          const count = rawCount || 5;
          const sRs = await turso.execute("SELECT key, value FROM settings WHERE key IN ('current_season', 'current_gw')");
          const settings = {}; sRs.rows.forEach(r => settings[r[0]] = r[1]);
          const season = settings.current_season || 'Season 1';
          const targetGw = gw || parseInt(settings.current_gw) || 1;

          const teamsRs = await turso.execute({ sql: "SELECT name FROM teams WHERE division = ?", args: [division] });
          const teams = teamsRs.rows.map(r => ({ name: r[0] }));
          if (teams.length < 2) return res.status(400).json({ error: 'Need at least 2 teams in division' });

          const playedRs = await turso.execute({ sql: "SELECT team_a, team_b FROM division_fixtures WHERE season = ? AND division = ?", args: [season, division] });
          const playedSet = new Set(playedRs.rows.map(r => [r[0], r[1]].sort().join('|||')));

          const available = [];
          for (let i = 0; i < teams.length; i++) {
            for (let j = i + 1; j < teams.length; j++) {
              const key = [teams[i].name, teams[j].name].sort().join('|||');
              if (!playedSet.has(key)) available.push([teams[i], teams[j]]);
            }
          }

          if (available.length === 0) return res.status(400).json({ error: 'All pairings already played this season' });
          available.sort(() => Math.random() - 0.5);

          const usedTeams = new Set(), generated = [];
          for (const [a, b] of available) {
            if (!usedTeams.has(a.name) && !usedTeams.has(b.name)) {
              const [home, away] = Math.random() < 0.5 ? [a, b] : [b, a];
              generated.push({ home: home.name, away: away.name });
              usedTeams.add(a.name);
              usedTeams.add(b.name);
              if (count && generated.length >= count) break;
            }
          }

          for (const f of generated) {
            await turso.execute({
              sql: "INSERT INTO matches (season, gw, home_team, away_team, status) VALUES (?, ?, ?, ?, 'scheduled')",
              args: [season, targetGw, f.home, f.away]
            });
            const [ta, tb] = [f.home, f.away].sort();
            await turso.execute({
              sql: "INSERT INTO division_fixtures (season, division, team_a, team_b, gw) VALUES (?, ?, ?, ?, ?)",
              args: [season, division, ta, tb, targetGw]
            });
          }
          await logAction('fixtures_generated', division, `Generated ${generated.length} fixtures for GW${targetGw}`);
          return res.status(200).json({ success: true, count: generated.length });
        }
        break;

      case 'audit-log':
        const logs = await turso.execute("SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 100");
        return res.status(200).json(logs.rows.map(row => {
          const o = {}; logs.columns.forEach((col, i) => o[col] = row[i]); return o;
        }));

      case 'trophies':
        if (req.method === 'GET') {
          const rs = await turso.execute(`
            SELECT t.*, tm.name as team_name 
            FROM trophies t 
            LEFT JOIN teams tm ON t.team_id = tm.id 
            ORDER BY t.created_at DESC
          `);
          return res.status(200).json(rs.rows.map(row => {
            const o = {}; rs.columns.forEach((col, i) => o[col] = row[i]); return o;
          }));
        }
        if (req.method === 'POST') {
          const { id, name, team_id, discord_id, season } = req.body;
          if (id) {
            await turso.execute({ sql: "UPDATE trophies SET name=?, team_id=?, discord_id=?, season=? WHERE id=?", args: [name, team_id, discord_id, season, id] });
            await logAction('trophy_updated', name, `Updated trophy details for ${name}`);
          } else {
            await turso.execute({ sql: "INSERT INTO trophies (name, team_id, discord_id, season) VALUES (?, ?, ?, ?)", args: [name, team_id, discord_id, season] });
            await logAction('trophy_awarded', name, `Awarded ${name} to ${team_id ? 'Team '+team_id : 'Player '+discord_id}`);
          }
          return res.status(200).json({ success: true });
        }
        if (req.method === 'DELETE') {
          await turso.execute({ sql: "DELETE FROM trophies WHERE id = ?", args: [req.body.id] });
          return res.status(200).json({ success: true });
        }
        break;

      case 'bulk-approve':
        const { requests, userId: adminId } = req.body;
        let approvedCount = 0;
        for (const r of requests) {
          const { id, stats } = r;
          const reqRs = await turso.execute({ sql: "SELECT * FROM stat_requests WHERE id = ?", args: [id] });
          if (reqRs.rows.length === 0) continue;
          const sreq = {}; reqRs.columns.forEach((col, i) => sreq[col] = reqRs.rows[0][i]);
          
          await turso.execute({ sql: "UPDATE stat_requests SET status = 'approved', processed_by = ?, processed_at = CURRENT_TIMESTAMP WHERE id = ?", args: [adminId, id] });
          
          const effectiveStats = stats && Object.keys(stats).length > 0 ? stats : { [sreq.stat_type]: sreq.value };
          for (const [key, val] of Object.entries(effectiveStats)) {
            if (val > 0) {
              await turso.execute({
                sql: "INSERT INTO stats (player_discord_id, player_name, season, competition, gw, stat_type, value) VALUES (?, ?, ?, ?, ?, ?, ?)",
                args: [sreq.player_discord_id, sreq.player_name, sreq.season, 'League', sreq.gw, key, val]
              });
            }
          }
          await turso.execute({
            sql: "INSERT INTO dm_queue (target_id, title, message) VALUES (?, '📊 Stat Request Approved', ?)",
            args: [sreq.player_discord_id, `Your request for ${sreq.value}x ${sreq.stat_type} has been approved via bulk processing!`]
          });
          await logAction('stat_approved', sreq.player_name, `Bulk Approved ${sreq.value}x ${sreq.stat_type} (GW${sreq.gw})`);
          approvedCount++;
        }
        return res.status(200).json({ success: true, approved: approvedCount });

      case 'stats':
        let currentSeason = 'Season 1';
        const sRs = await turso.execute("SELECT value FROM settings WHERE key = 'current_season'");
        if (sRs.rows.length > 0) currentSeason = sRs.rows[0][0];

        if (req.method === 'GET') {
          const sql = `
            SELECT p.discord_id, p.username, t.name as team_name,
            COALESCE(SUM(CASE WHEN s.stat_type = 'goals' THEN s.value ELSE 0 END), 0) as goals,
            COALESCE(SUM(CASE WHEN s.stat_type = 'assists' THEN s.value ELSE 0 END), 0) as assists,
            COALESCE(SUM(CASE WHEN s.stat_type = 'defender_cs' THEN s.value ELSE 0 END), 0) as defender_cs,
            COALESCE(SUM(CASE WHEN s.stat_type = 'gk_cs' THEN s.value ELSE 0 END), 0) as gk_cs
            FROM players p
            LEFT JOIN teams t ON p.team_id = t.id
            LEFT JOIN stats s ON p.discord_id = s.player_discord_id AND s.season = ?
            GROUP BY p.discord_id ORDER BY p.username ASC
          `;
          const rsStats = await turso.execute({ sql, args: [currentSeason] });
          return res.status(200).json(rsStats.rows.map(row => {
            const o = {}; rsStats.columns.forEach((col, i) => o[col] = row[i]); return o;
          }));
        }
        if (req.method === 'POST') {
           const { player_id, stat_type, new_total } = req.body;
           const totalRs = await turso.execute({
             sql: "SELECT SUM(value) as total FROM stats WHERE player_discord_id = ? AND stat_type = ? AND season = ?",
             args: [player_id, stat_type, currentSeason]
           });
           const currentTotal = totalRs.rows[0][0] || 0;
           const delta = parseInt(new_total) - currentTotal;
           if (delta !== 0) {
              let gw = 1;
              const gwSettingsRs = await turso.execute("SELECT value FROM settings WHERE key = 'current_gw'");
              if (gwSettingsRs.rows.length > 0) gw = parseInt(gwSettingsRs.rows[0][0]) || 1;
              await turso.execute({
                sql: "INSERT INTO stats (player_discord_id, player_name, season, competition, gw, stat_type, value) VALUES (?, 'Admin-Edit', ?, 'Manual Adjustment', ?, ?, ?)",
                args: [player_id, currentSeason, gw, stat_type, delta]
              });
              await logAction('stat_manual_edit', player_id, `Manually adjusted ${stat_type} by ${delta > 0 ? '+' : ''}${delta} (${new_total} total)`);
           }
           return res.status(200).json({ success: true, delta });
        }
        break;

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
