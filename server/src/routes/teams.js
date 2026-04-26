const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/role');
const teamsController = require('../controllers/teamsController');

router.get('/', auth, teamsController.getTeams);
router.post('/', auth, requireAdmin, teamsController.createTeam);
router.patch('/:id', auth, requireAdmin, teamsController.updateTeam);
router.delete('/:id', auth, requireAdmin, teamsController.deleteTeam);
router.get('/:id/workers', auth, requireAdmin, teamsController.getTeamWorkers);

module.exports = router;
