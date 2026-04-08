const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'サーバーエラーが発生しました'
  });
};

module.exports = errorHandler;
