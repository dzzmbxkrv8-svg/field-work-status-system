const { query } = require('./db');
require('dotenv').config();

async function inspect() {
  try {
    console.log('--- Table: users ---');
    const users = await query('SELECT id, employee_id, name, role, is_active FROM users');
    console.table(users.rows);

    console.log('\n--- Password Hashes ---');
    const hashes = await query('SELECT employee_id, LEFT(password_hash, 20) as hash_preview FROM users');
    console.table(hashes.rows);
  } catch (err) {
    console.error('Error inspecting DB:', err.message);
  } finally {
    process.exit(0);
  }
}

inspect();
