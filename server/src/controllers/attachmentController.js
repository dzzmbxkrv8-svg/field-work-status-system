const db = require('../config/db');
const path = require('path');
const fs = require('fs');

exports.uploadAttachments = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify the assignment exists
    const assignmentCheck = await db.query('SELECT id FROM assignments WHERE id = $1', [id]);
    if (assignmentCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: '案件が見つかりません' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'ファイルが選択されていません' });
    }

    const inserted = [];
    for (const file of req.files) {
      const { rows } = await db.query(
        `INSERT INTO assignment_attachments
           (assignment_id, filename, original_name, mimetype, size)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [id, file.filename, file.originalname, file.mimetype, file.size]
      );
      inserted.push(rows[0]);
    }

    res.status(201).json({ success: true, data: inserted });
  } catch (error) {
    next(error);
  }
};

exports.getAttachments = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query(
      'SELECT * FROM assignment_attachments WHERE assignment_id = $1 ORDER BY uploaded_at DESC',
      [id]
    );
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

exports.deleteAttachment = async (req, res, next) => {
  try {
    const { attachmentId } = req.params;
    const { rows } = await db.query(
      'DELETE FROM assignment_attachments WHERE id = $1 RETURNING *',
      [attachmentId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'ファイルが見つかりません' });
    }
    // Delete physical file
    const filePath = path.join(__dirname, '../../uploads', rows[0].filename);
    fs.unlink(filePath, () => {}); // ignore errors if file missing
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};
