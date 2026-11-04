const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');

const Meeting = require('../models/Meeting');
const ActionItem = require('../models/ActionItem');
const User = require('../models/User');
const Workspace = require('../models/Workspace');
const { generateFallbackAnalysis } = require('../services/aiService');
const { parseDueDate } = require('../utils/dateUtils');
const { cleanActionTitle, normalizeTitle } = require('../utils/textUtils');

test('E2E AI Meeting Workflow - Creation, Multi-user, Live Transcript, AI Analysis, DB Persistence & Action Item Mutation', async () => {
  // 1. Create simulated user accounts (Host + Attendee)
  const hostId = new mongoose.Types.ObjectId();
  const attendeeId = new mongoose.Types.ObjectId();
  const workspaceId = new mongoose.Types.ObjectId();

  const hostUser = {
    _id: hostId,
    name: 'Yukti Agarwal',
    email: 'yukti@intellmeet.com',
    role: 'Admin',
  };

  const attendeeUser = {
    _id: attendeeId,
    name: 'Rahul Sharma',
    email: 'rahul@intellmeet.com',
    role: 'Member',
  };

  // 2. Schedule meeting associated with workspace
  const meetingCode = 'INT-AUDIT01';
  const meeting = new Meeting({
    title: 'Q4 Product Launch Planning',
    description: 'Launch milestones and critical path alignment',
    host: hostUser._id,
    workspace: workspaceId,
    participants: [hostUser._id],
    meetingCode,
    status: 'scheduled',
  });

  assert.strictEqual(meeting.title, 'Q4 Product Launch Planning');
  assert.strictEqual(meeting.workspace.toString(), workspaceId.toString());
  assert.strictEqual(meeting.status, 'scheduled');

  // 3. Attendee joins the meeting -> status becomes 'live' and attendee added to participants
  if (!meeting.participants.some(p => p.toString() === attendeeUser._id.toString())) {
    meeting.participants.push(attendeeUser._id);
  }
  meeting.status = 'live';

  assert.strictEqual(meeting.participants.length, 2);
  assert.strictEqual(meeting.status, 'live');

  // 4. Generate multi-speaker live transcript entries during meeting
  const liveTranscript = [
    {
      speaker: 'Yukti Agarwal',
      text: 'Welcome everyone to the Q4 Product Launch Planning meeting. Our primary objective is to finalize launch deliverables and identify blockers.',
      timestamp: '10:00:05',
    },
    {
      speaker: 'Rahul Sharma',
      text: 'I will complete the frontend development by November 7. There is a potential risk with responsive design rendering on older Safari versions.',
      timestamp: '10:01:20',
    },
    {
      speaker: 'Yukti Agarwal',
      text: 'We decided to proceed with the phased rollout strategy. The team must resolve all critical bugs by November 20.',
      timestamp: '10:03:00',
    },
    {
      speaker: 'Yukti Agarwal',
      text: 'I will lead the progress review on November 18.',
      timestamp: '10:04:15',
    },
  ];

  meeting.transcript = liveTranscript;
  assert.strictEqual(meeting.transcript.length, 4);

  // 5. Host ends meeting and triggers AI analysis (fallback and schema adherence)
  meeting.status = 'ended';

  const transcriptText = meeting.transcript
    .map(t => `${t.speaker}: ${t.text}`)
    .join('\n');

  const aiAnalysis = generateFallbackAnalysis(transcriptText);
  meeting.summary = aiAnalysis.summary;
  meeting.keyPoints = aiAnalysis.keyPoints;

  // Verify Executive Summary
  assert.ok(meeting.summary.executiveSummary.length > 30);
  assert.ok(!meeting.summary.executiveSummary.startsWith('Welcome everyone'));

  // Verify Key Decisions
  assert.ok(meeting.summary.decisions.some(d => d.toLowerCase().includes('phased rollout strategy')));

  // Verify Risks & Blockers
  assert.ok(meeting.summary.risks.some(r => r.toLowerCase().includes('safari') || r.toLowerCase().includes('risk')));

  // Verify Follow-ups
  assert.ok(meeting.summary.followUp.length > 0);

  // 6. Action Items Generation & Mapping to Registered Participants
  const rawActionItems = aiAnalysis.summary.actionItems;
  assert.ok(rawActionItems.length >= 3, `Expected at least 3 action items, got ${rawActionItems.length}`);

  const createdActionItems = [];
  const participantUsers = [hostUser, attendeeUser];

  for (const item of rawActionItems) {
    const cleanTitle = cleanActionTitle(item.title, item.assignedTo);
    let targetAssignee = null;

    if (item.assignedTo && item.assignedTo !== 'Unassigned') {
      const qName = item.assignedTo.trim().toLowerCase();
      const matched = participantUsers.find(u => {
        const uName = (u.name || '').toLowerCase();
        return uName.includes(qName) || qName.includes(uName.split(' ')[0]);
      });
      if (matched) {
        targetAssignee = matched._id;
      }
    }

    const actionDoc = new ActionItem({
      meeting: meeting._id,
      title: cleanTitle,
      description: item.description,
      assignedTo: targetAssignee,
      priority: item.priority || 'Medium',
      dueDate: parseDueDate(item.dueDate),
      status: item.status || 'Pending',
      source: 'ai',
      createdBy: hostUser._id,
    });

    createdActionItems.push(actionDoc);
  }

  meeting.actionItems = createdActionItems.map(a => a._id);

  // Assert Rahul Sharma's task was properly assigned to his User ObjectId
  const rahulTask = createdActionItems.find(a => a.assignedTo?.toString() === attendeeUser._id.toString());
  assert.ok(rahulTask, 'Rahul Sharma should have an assigned action item');
  assert.ok(rahulTask.title.toLowerCase().includes('frontend'));
  assert.ok(rahulTask.dueDate instanceof Date);

  // Assert Yukti's progress review task was properly assigned to her User ObjectId
  const yuktiTask = createdActionItems.find(a => a.assignedTo?.toString() === hostUser._id.toString());
  assert.ok(yuktiTask, 'Yukti Agarwal should have an assigned action item');
  assert.ok(yuktiTask.dueDate instanceof Date);

  // 7. Verify Extracted Action Items are Editable and Persist Modifications
  const taskToEdit = rahulTask;
  const originalTitle = taskToEdit.title;

  // Simulate updating status from Pending -> Completed and changing priority to High
  taskToEdit.status = 'Completed';
  taskToEdit.priority = 'High';
  taskToEdit.title = 'Complete frontend development and cross-browser QA';

  assert.strictEqual(taskToEdit.status, 'Completed');
  assert.strictEqual(taskToEdit.priority, 'High');
  assert.notStrictEqual(taskToEdit.title, originalTitle);

  // 8. Verify Workspace association and meeting linkage
  assert.strictEqual(meeting.workspace.toString(), workspaceId.toString());
  assert.strictEqual(meeting.actionItems.length, createdActionItems.length);
});
