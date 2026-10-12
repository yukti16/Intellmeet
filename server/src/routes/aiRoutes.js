const express = require('express');
const router = express.Router();
const {
  summarizeText,
  getActionItems,
  getKeyPoints,
  getFollowUp,
  getAIInsights,
} = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/summarize', summarizeText);
router.post('/action-items', getActionItems);
router.post('/key-points', getKeyPoints);
router.post('/follow-up', getFollowUp);
router.get('/insights', getAIInsights);

module.exports = router;
