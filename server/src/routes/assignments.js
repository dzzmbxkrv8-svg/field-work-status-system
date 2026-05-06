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
const ALLOWED_MIMETYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB per file
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMETYPES.includes(file.mimetype)) return cb(null, true);
    cb(new Error('対応していないファイル形式です'));
  },
});

router.get('/', auth, assignmentController.getAssignments);
router.get('/:id', auth, assignmentController.getAssignment);
router.post('/', auth, requireAdmin, assignmentController.createAssignment);
router.patch('/:id/status', auth, assignmentController.updateStatus);
router.patch('/:id/assign', auth, requireAdmin, assignmentController.assignWorker);

// Members
router.get('/:id/members', auth, assignmentController.getMembers);
router.post('/:id/members', auth, requireAdmin, assignmentController.setMembers);

// Attachments
router.get('/:id/attachments', auth, attachmentController.getAttachments);
router.post('/:id/attachments', auth, requireAdmin, upload.array('files', 10), attachmentController.uploadAttachments);
router.delete('/:id/attachments/:attachmentId', auth, requireAdmin, attachmentController.deleteAttachment);

module.exports = router;
