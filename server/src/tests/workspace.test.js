const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const Workspace = require('../models/Workspace');
const WorkspaceMember = require('../models/WorkspaceMember');
const Meeting = require('../models/Meeting');

test('Workspace Model - Schema validations', () => {
  const ws = new Workspace({
    name: '  Product Engineering  ',
    description: 'Core product workspace',
    owner: new mongoose.Types.ObjectId(),
  });

  assert.strictEqual(ws.name, 'Product Engineering');
  assert.strictEqual(ws.description, 'Core product workspace');
  assert.ok(Array.isArray(ws.resources));
  assert.strictEqual(ws.resources.length, 0);
  assert.ok(Array.isArray(ws.invitations));
  assert.strictEqual(ws.invitations.length, 0);

  // Validation error if name is missing
  const invalidWs = new Workspace({
    description: 'No name',
  });
  const err = invalidWs.validateSync();
  assert.ok(err.errors.name);
  assert.ok(err.errors.owner);
});

test('Workspace Model - Embedded resource schema', () => {
  const ws = new Workspace({
    name: 'DevOps & Infra',
    owner: new mongoose.Types.ObjectId(),
    resources: [
      {
        title: 'Deployment Guide',
        content: 'Check Docker & Helm configurations before deploying.',
        category: 'document',
        linkUrl: 'https://github.com/org/repo',
        createdBy: new mongoose.Types.ObjectId(),
      },
    ],
  });

  assert.strictEqual(ws.resources.length, 1);
  assert.strictEqual(ws.resources[0].title, 'Deployment Guide');
  assert.strictEqual(ws.resources[0].category, 'document');
  assert.strictEqual(ws.resources[0].linkUrl, 'https://github.com/org/repo');
});

test('Workspace Model - Embedded invitations schema', () => {
  const ws = new Workspace({
    name: 'Growth & Marketing',
    owner: new mongoose.Types.ObjectId(),
    invitations: [
      {
        email: 'NEWTEAMMEMBER@COMPANY.COM',
        role: 'Manager',
        invitedBy: new mongoose.Types.ObjectId(),
      },
    ],
  });

  assert.strictEqual(ws.invitations.length, 1);
  assert.strictEqual(ws.invitations[0].email, 'newteammember@company.com');
  assert.strictEqual(ws.invitations[0].role, 'Manager');
  assert.strictEqual(ws.invitations[0].status, 'pending');
  assert.ok(ws.invitations[0].invitedAt instanceof Date);

  // Invalid email validation test
  const invalidInviteWs = new Workspace({
    name: 'Bad Invite Test',
    owner: new mongoose.Types.ObjectId(),
    invitations: [
      {
        email: '',
        role: 'Member',
        invitedBy: new mongoose.Types.ObjectId(),
      },
    ],
  });
  const err = invalidInviteWs.validateSync();
  assert.ok(err.errors['invitations.0.email']);
});

test('WorkspaceMember Model - Role enum and constraints', () => {
  const wm = new WorkspaceMember({
    workspace: new mongoose.Types.ObjectId(),
    user: new mongoose.Types.ObjectId(),
    role: 'Admin',
  });

  assert.strictEqual(wm.role, 'Admin');
  assert.ok(wm.joinedAt instanceof Date);

  // Invalid role test
  const invalidWm = new WorkspaceMember({
    workspace: new mongoose.Types.ObjectId(),
    user: new mongoose.Types.ObjectId(),
    role: 'SuperBoss',
  });
  const err = invalidWm.validateSync();
  assert.ok(err.errors.role);
});

test('Meeting Model - Workspace Association and Indexing', () => {
  const workspaceId = new mongoose.Types.ObjectId();
  const hostId = new mongoose.Types.ObjectId();

  const meeting = new Meeting({
    title: 'Sprint Planning & Backlog Grooming',
    description: 'Weekly team sprint sync',
    host: hostId,
    workspace: workspaceId,
    meetingCode: 'INT-TEST99',
    duration: 45,
  });

  assert.strictEqual(meeting.title, 'Sprint Planning & Backlog Grooming');
  assert.strictEqual(meeting.host.toString(), hostId.toString());
  assert.strictEqual(meeting.workspace.toString(), workspaceId.toString());
  assert.strictEqual(meeting.status, 'scheduled');
  assert.strictEqual(meeting.meetingCode, 'INT-TEST99');

  // Verify meeting without workspace (global/personal meeting) is also valid
  const globalMeeting = new Meeting({
    title: 'Ad-hoc 1-on-1 Discussion',
    host: hostId,
    meetingCode: 'INT-GLOBAL01',
  });

  const err = globalMeeting.validateSync();
  assert.strictEqual(err, undefined);
  assert.strictEqual(globalMeeting.workspace, undefined);
});
