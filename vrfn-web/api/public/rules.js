const turso = require('../_db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    const rules = await turso.execute("SELECT * FROM rules ORDER BY id ASC");
    const settings = await turso.execute("SELECT value FROM settings WHERE key = 'rules_gif' LIMIT 1");
    
    return res.status(200).json({
      rules: rules.rows.map(row => {
          const r = {};
          rules.columns.forEach((col, i) => r[col] = row[i]);
          return r;
      }),
      gif: settings.rows[0]?.[0] || null
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
