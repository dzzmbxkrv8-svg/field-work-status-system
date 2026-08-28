const { notifyServerError } = require('../services/alertService');

// eslint-disable-next-line no-unused-vars -- Expressはエラーハンドラを引数の数(4つ)で判定するため next は必須
const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;

  if (process.env.NODE_ENV === 'production') {
    // production では内部エラーをクライアントに公開しない
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} — ${err.stack || err.message}`);
    if (status >= 500) {
      notifyServerError({ message: err.message, path: req.path, method: req.method }).catch(() => {});
    }
    res.status(status).json({
      success: false,
      message: status < 500 ? err.message : 'サーバーエラーが発生しました',
    });
  } else {
    console.error(err.stack);
    res.status(status).json({
      success: false,
      message: err.message || 'サーバーエラーが発生しました',
      stack: err.stack,
    });
  }
};

module.exports = errorHandler;
