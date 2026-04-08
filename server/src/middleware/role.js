const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ success: false, message: '管理者権限が必要です' });
  }
};

module.exports = requireAdmin;
