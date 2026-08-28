const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const pushController = require('../controllers/pushController');

router.get('/vapid-public-key', pushController.getVapidPublicKey);
router.post('/subscribe', auth, pushController.subscribe);
router.post('/unsubscribe', auth, pushController.unsubscribe);

module.exports = router;
