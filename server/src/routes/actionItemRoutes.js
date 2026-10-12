const express = require('express');
const router = express.Router();
const {
  getActionItems,
  createActionItem,
  updateActionItem,
  deleteActionItem,
} = require('../controllers/actionItemController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getActionItems)
  .post(createActionItem);

router.route('/:id')
  .put(updateActionItem)
  .delete(deleteActionItem);

module.exports = router;
