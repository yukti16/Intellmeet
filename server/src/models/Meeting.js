const mongoose = require('mongoose');

const transcriptEntrySchema = new mongoose.Schema(
  {
    speaker: { type: String, required: true },
    text: { type: String, required: true },
    timestamp: { type: String, default: () => new Date().toISOString() },
  },
  { _id: false }
);

const meetingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Meeting title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: false,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    scheduledAt: {
      type: Date,
      default: Date.now,
    },
    duration: {
      type: Number, // in minutes
      default: 30,
    },
    meetingCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'live', 'ended', 'cancelled'],
      default: 'scheduled',
    },
    recordingUrl: {
      type: String,
      default: '',
    },
    transcript: [transcriptEntrySchema],
    summary: {
      executiveSummary: { type: String, default: '' },
      mainPoints: [{ type: String }],
      decisions: [{ type: String }],
      risks: [{ type: String }],
      followUp: [{ type: String }],
    },
    actionItems: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ActionItem',
      },
    ],
    keyPoints: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

meetingSchema.index({ meetingCode: 1 });
meetingSchema.index({ host: 1 });
meetingSchema.index({ scheduledAt: -1 });

module.exports = mongoose.model('Meeting', meetingSchema);
