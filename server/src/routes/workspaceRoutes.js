const express = require('express');
const router = express.Router();
const {
  getWorkspaces,
  getWorkspaceById,
  createWorkspace,
  updateWorkspace,
  addWorkspaceMember,
  removeWorkspaceMember,
} = require('../controllers/workspaceController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getWorkspaces)
  .post(createWorkspace);

router.route('/:id')
  .get(getWorkspaceById)
  .put(updateWorkspace);

router.post('/:id/members', addWorkspaceMember);
router.delete('/:id/members/:userId', removeWorkspaceMember);

module.exports = router;
