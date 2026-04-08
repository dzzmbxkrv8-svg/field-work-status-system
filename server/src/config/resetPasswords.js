const bcrypt = require('bcryptjs');
const { query } = require('./db');
require('dotenv').config();

async function resetPasswords() {
  try {
    const workerHash = await bcrypt.hash('worker123', 10);
    const adminHash = await bcrypt.hash('adminpass', 10);

    await query(
      "UPDATE users SET password_hash=$1 WHERE role='worker'",
      [workerHash]
    );
    await query(
      "UPDATE users SET password_hash=$1 WHERE role='admin'",
      [adminHash]
    );
    console.log('--- パスワードのリセットが完了しました ---');
    console.log('Worker ID: W001 / Pass: worker123');
    console.log('Admin ID: ADMIN001 / Pass: adminpass');
  } catch (err) {
    console.error('パスワードリセット失敗:', err);
  } finally {
    process.exit(0);
  }
}
resetPasswords();
