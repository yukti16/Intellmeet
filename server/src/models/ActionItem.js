const mongoose = require('mongoose');

const actionItemSchema = new mongoose.Schema(
  {
    meeting: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meeting',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Action item title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    dueDate: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed'],
      default: 'Pending',
    },
  },
  {
    timestamps: true,
  }
);

actionItemSchema.index({ meeting: 1 });
actionItemSchema.index({ assignedTo: 1, status: 1 });

module.exports = mongoose.model('ActionItem', actionItemSchema);
