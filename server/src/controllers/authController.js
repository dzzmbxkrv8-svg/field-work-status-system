const db = require('../config/db');

exports.login = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, message: 'Auth endpoint skeleton' });
  } catch (error) {
    next(error);
  }
};
