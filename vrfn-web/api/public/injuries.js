const turso = require('../_db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const rs = await turso.execute("SELECT * FROM injuries WHERE active=1 ORDER BY since DESC");
    return res.status(200).json(rs.rows.map(row => {
      const r = {}; rs.columns.forEach((col, i) => r[col] = row[i]); return r;
    }));
  } catch (e) { return res.status(500).json({ error: e.message }); }
};
