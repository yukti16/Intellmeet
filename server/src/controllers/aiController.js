const {
  generateMeetingSummary,
  extractKeyPoints,
  extractActionItems,
  generateFollowUp,
  generateMeetingTitle,
  generateFallbackAnalysis,
} = require('../services/aiService');

// @desc    Generate AI summary for custom transcript text
// @route   POST /api/ai/summarize
// @access  Private
const summarizeText = async (req, res, next) => {
  try {
    const { transcript } = req.body;
    if (!transcript) {
      return res.status(400).json({
        success: false,
        message: 'Transcript text is required',
      });
    }

    const summary = await generateMeetingSummary(transcript);
    res.status(200).json({
      success: true,
      summary,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Extract action items from text
// @route   POST /api/ai/action-items
// @access  Private
const getActionItems = async (req, res, next) => {
  try {
    const { transcript } = req.body;
    if (!transcript) {
      return res.status(400).json({
        success: false,
        message: 'Transcript text is required',
      });
    }

    const actionItems = await extractActionItems(transcript);
    res.status(200).json({
      success: true,
      actionItems,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Extract key points from text
// @route   POST /api/ai/key-points
// @access  Private
const getKeyPoints = async (req, res, next) => {
  try {
    const { transcript } = req.body;
    if (!transcript) {
      return res.status(400).json({
        success: false,
        message: 'Transcript text is required',
      });
    }

    const keyPoints = await extractKeyPoints(transcript);
    res.status(200).json({
      success: true,
      keyPoints,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate follow-up recommendations
// @route   POST /api/ai/follow-up
// @access  Private
const getFollowUp = async (req, res, next) => {
  try {
    const { transcript } = req.body;
    if (!transcript) {
      return res.status(400).json({
        success: false,
        message: 'Transcript text is required',
      });
    }

    const followUp = await generateFollowUp(transcript);
    res.status(200).json({
      success: true,
      followUp,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get AI Insights Dashboard overview data
// @route   GET /api/ai/insights
// @access  Private
const getAIInsights = async (req, res, next) => {
  try {
    const fallback = generateFallbackAnalysis('Sample full text');

    res.status(200).json({
      success: true,
      insights: {
        totalSummariesGenerated: 24,
        avgMeetingDurationMinutes: 38,
        actionItemCompletionRate: 86,
        topTopics: ['Architecture Review', 'Sprint Planning', 'Q4 Roadmap', 'CI/CD Pipeline', 'Security Audit'],
        productivityScore: 92,
        recentDecisions: fallback.summary.decisions,
        recommendedFollowUps: fallback.summary.followUp,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  summarizeText,
  getActionItems,
  getKeyPoints,
  getFollowUp,
  getAIInsights,
};
