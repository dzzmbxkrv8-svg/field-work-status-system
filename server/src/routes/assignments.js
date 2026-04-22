const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/role');
const assignmentController = require('../controllers/assignmentController');
const attachmentController = require('../controllers/attachmentController');

// Multer storage: save to uploads/ with unique filename
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB per file
  fileFilter: (req, file, cb) => {
    const allowed = /pdf|jpeg|jpg|png|gif|webp|heic|doc|docx|xls|xlsx/i;
    const ext = path.extname(file.originalname).slice(1);
    if (allowed.test(ext)) return cb(null, true);
    cb(new Error('対応していないファイル形式です'));
  },
});

router.get('/', auth, assignmentController.getAssignments);
router.get('/:id', auth, assignmentController.getAssignment);
router.post('/', auth, requireAdmin, assignmentController.createAssignment);
router.patch('/:id/status', auth, assignmentController.updateStatus);
router.patch('/:id/assign', auth, requireAdmin, assignmentController.assignWorker);

// Attachments
router.get('/:id/attachments', auth, attachmentController.getAttachments);
router.post('/:id/attachments', auth, requireAdmin, upload.array('files', 10), attachmentController.uploadAttachments);
router.delete('/:id/attachments/:attachmentId', auth, requireAdmin, attachmentController.deleteAttachment);

module.exports = router;
