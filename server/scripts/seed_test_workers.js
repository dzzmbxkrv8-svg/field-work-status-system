/**
 * テスト用作業員7名を追加するスクリプト
 * 実行: node scripts/seed_test_workers.js
 */
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const newWorkers = [
  { employee_id: 'W004', name: '山田健二',   team_id: 1 },
  { employee_id: 'W005', name: '伊藤修',     team_id: 1 },
  { employee_id: 'W006', name: '渡辺和也',   team_id: 1 },
  { employee_id: 'W007', name: '中村翔太',   team_id: 1 },
  { employee_id: 'W008', name: '小林大輔',   team_id: 1 },
  { employee_id: 'W009', name: '加藤達也',   team_id: 1 },
  { employee_id: 'W010', name: '松本拓哉',   team_id: 1 },
];

async function seed() {
  const hash = await bcrypt.hash('password123', 10);
  let added = 0;
  for (const w of newWorkers) {
    try {
      await pool.query(
        `INSERT INTO users (employee_id, name, role, team_id, password_hash)
         VALUES ($1, $2, 'worker', $3, $4)
         ON CONFLICT (employee_id) DO NOTHING`,
        [w.employee_id, w.name, w.team_id, hash]
      );
      console.log(`✅ 追加: ${w.name} (${w.employee_id})`);
      added++;
    } catch (e) {
      console.error(`❌ ${w.name}: ${e.message}`);
    }
  }
  console.log(`\n完了: ${added}名追加`);
  await pool.end();
}

seed().catch(console.error);
