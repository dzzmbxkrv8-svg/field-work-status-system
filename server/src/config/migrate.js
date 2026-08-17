require('dotenv').config();
const { pool } = require('./db');
const fs = require('fs');
const path = require('path');

async function migrate() {
  const client = await pool.connect();
  try {
    // マイグレーション履歴テーブルの作成
    await client.query(`
      CREATE TABLE IF NOT EXISTS migration_history (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const migrationsDir = path.join(__dirname, '../../migrations');
    let files;
    try {
      files = fs.readdirSync(migrationsDir).sort();
    } catch {
      console.log('Migrations directory not found, skipping migration phase.');
      return;
    }

    for (const file of files) {
      if (!file.endsWith('.sql')) continue;

      const { rowCount } = await client.query('SELECT * FROM migration_history WHERE filename = $1', [file]);
      if (rowCount > 0) continue; // 既に実行済みの場合はスキップ

      console.log(`Executing migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO migration_history (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      
      console.log(`Successfully completed migration: ${file}`);
    }

    console.log('All migrations completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
  }
}

// コマンドラインから直接実行された場合のみmigrateを実行
if (require.main === module) {
  migrate().then(() => pool.end());
} else {
  module.exports = migrate;
}
