const { execute } = require('./lib/db');

async function main() {
  try {
    const res = await execute("SELECT * FROM batch_requests LIMIT 1");
    console.log(Object.keys(res.rows[0]));
  } catch (e) {
    console.error(e);
  }
}
main();
