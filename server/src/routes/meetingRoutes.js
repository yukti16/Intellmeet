const express = require('express');
const router = express.Router();
const {
  getMeetings,
  getMeetingById,
  createMeeting,
  joinMeeting,
  endMeeting,
  updateMeeting,
  deleteMeeting,
} = require('../controllers/meetingController');
const {
  getMeetingMessages,
  createMessage,
  updateMessage,
  deleteMessage,
} = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getMeetings)
  .post(createMeeting);

router.route('/:id')
  .get(getMeetingById)
  .put(updateMeeting)
  .delete(deleteMeeting);

router.post('/:id/join', joinMeeting);
router.post('/:id/end', endMeeting);

// Message nested endpoints
router.route('/:id/messages')
  .get(getMeetingMessages)
  .post(createMessage);

router.route('/:id/messages/:messageId')
  .put(updateMessage)
  .delete(deleteMessage);

module.exports = router;
