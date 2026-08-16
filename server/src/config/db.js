const { Pool, types } = require('pg');
require('dotenv').config();

// DATE型(OID 1082)はデフォルトだとJSのDateオブジェクトに変換され、
// JSON化の際にタイムゾーンの影響で日付が1日ずれることがあるため、
// 'YYYY-MM-DD' 文字列のまま返す
types.setTypeParser(1082, (val) => val);

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      }
    : {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD
      }
);

module.exports = { 
  query: (text, params) => pool.query(text, params),
  pool 
};
