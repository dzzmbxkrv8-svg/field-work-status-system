const db = require('../src/config/db');

module.exports = async () => {
  await db.pool.end();
};
