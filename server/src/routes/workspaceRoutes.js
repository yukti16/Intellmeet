const express = require('express');
const router = express.Router();
const {
  getWorkspaces,
  getWorkspaceById,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getEligibleWorkspaceUsers,
  inviteWorkspaceMember,
  cancelWorkspaceInvitation,
  addWorkspaceMember,
  updateWorkspaceMemberRole,
  removeWorkspaceMember,
  addWorkspaceResource,
  deleteWorkspaceResource,
} = require('../controllers/workspaceController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getWorkspaces)
  .post(createWorkspace);

router.route('/:id')
  .get(getWorkspaceById)
  .put(updateWorkspace)
  .delete(deleteWorkspace);

router.get('/:id/eligible-users', getEligibleWorkspaceUsers);

router.route('/:id/invitations')
  .post(inviteWorkspaceMember);

router.delete('/:id/invitations/:inviteId', cancelWorkspaceInvitation);

router.route('/:id/members')
  .post(addWorkspaceMember);

router.route('/:id/members/:userId')
  .put(updateWorkspaceMemberRole)
  .delete(removeWorkspaceMember);

router.route('/:id/resources')
  .post(addWorkspaceResource);

router.route('/:id/resources/:resourceId')
  .delete(deleteWorkspaceResource);

module.exports = router;
