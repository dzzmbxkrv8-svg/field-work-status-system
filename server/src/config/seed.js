require('dotenv').config();
const { pool } = require('./db');
const fs = require('fs');
const path = require('path');

async function seed() {
  const client = await pool.connect();
  try {
    const seedsDir = path.join(__dirname, '../../seeds');
    let files;
    try {
      files = fs.readdirSync(seedsDir).sort();
    } catch {
      console.log('Seeds directory not found, skipping seed phase.');
      return;
    }

    for (const file of files) {
      if (!file.endsWith('.sql')) continue;
      console.log(`Executing seed: ${file}`);
      const sql = fs.readFileSync(path.join(seedsDir, file), 'utf8');
      
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      console.log(`Successfully completed seed: ${file}`);
    }

    console.log('All seeds completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Seed execution failed:', error);
    process.exit(1);
  } finally {
    client.release();
  }
}

// コマンドラインから直接実行された場合のみseedを実行
if (require.main === module) {
  seed().then(() => pool.end());
} else {
  module.exports = seed;
}
