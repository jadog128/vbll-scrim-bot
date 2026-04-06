const turso = require('./_db');
const GUILD_ID = process.env.GUILD_ID;
const BOT_TOKEN = process.env.DISCORD_TOKEN;
const MANAGER_ROLE_ID = "1456800041095401602";

module.exports = async (userId) => {
  if (!userId || !GUILD_ID || !BOT_TOKEN) return null;

  try {
    const resp = await fetch(`https://discord.com/api/guilds/${GUILD_ID}/members/${userId}`, {
      headers: { Authorization: `Bot ${BOT_TOKEN}` }
    });
    if (!resp.ok) return null;
    const member = await resp.json();
    
    // Check if they have the global "Manager" role
    if (!member.roles || !member.roles.includes(MANAGER_ROLE_ID)) return null;

    // Fetch all teams to find one with a matching role_id
    const teamRows = await turso.execute("SELECT * FROM teams WHERE role_id IS NOT NULL");
    const teams = teamRows.rows.map(row => {
      const t = {};
      teamRows.columns.forEach((col, i) => t[col] = row[i]);
      return t;
    });

    const managedTeam = teams.find(t => member.roles.includes(t.role_id));
    return managedTeam || null; // Returns the team object if they are a manager for it
  } catch (e) {
    console.error('Manager check error:', e);
    return null;
  }
};
