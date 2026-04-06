const turso = require('../_db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { team } = req.query;
  try {
    let sql = "SELECT * FROM trophies ORDER BY id DESC";
    let args = [];
    if (team) { sql = "SELECT * FROM trophies WHERE team_name=? ORDER BY id DESC"; args = [team]; }
    const rs = await turso.execute({ sql, args });
    return res.status(200).json(rs.rows.map(row => {
      const r = {}; rs.columns.forEach((col, i) => r[col] = row[i]); return r;
    }));
  } catch (e) { return res.status(500).json({ error: e.message }); }
};
