const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'your_password' // User's default might be different
});

async function check() {
  try {
    const res = await pool.query("SELECT datname FROM pg_database WHERE datname = 'field_work_db'");
    if (res.rows.length === 0) {
      console.log("Database 'field_work_db' does NOT exist.");
    } else {
      console.log("Database 'field_work_db' exists.");
    }
  } catch (err) {
    console.error('Connection failed:', err.message);
  } finally {
    await pool.end();
  }
}
check();
