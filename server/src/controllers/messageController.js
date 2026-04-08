const db = require('../config/db');

exports.getAll = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, message: 'Messages endpoint skeleton' });
  } catch (error) {
    next(error);
  }
};
