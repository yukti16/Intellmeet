const test = require('node:test');
const assert = require('node:assert');
const ActionItem = require('../models/ActionItem');
const Meeting = require('../models/Meeting');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/authMiddleware');
const {
  getActionItems,
  createActionItem,
  updateActionItem,
  deleteActionItem,
} = require('../controllers/actionItemController');

const createMockRes = () => ({
  statusCode: 200,
  data: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.data = payload;
    return this;
  },
});

test('Create Action Item - Rejects missing title with HTTP 400', async () => {
  const req = {
    body: { description: 'Missing title' },
    user: { _id: '507f1f77bcf86cd799439011', name: 'Test User' },
  };
  const res = createMockRes();

  await createActionItem(req, res, () => {});

  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.data.success, false);
  assert.strictEqual(res.data.message, 'Action item title is required');
});

test('Create Action Item - Rejects whitespace-only title with HTTP 400', async () => {
  const req = {
    body: { title: '     ', description: 'Whitespace-only title' },
    user: { _id: '507f1f77bcf86cd799439011', name: 'Test User' },
  };
  const res = createMockRes();

  await createActionItem(req, res, () => {});

  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.data.success, false);
  assert.strictEqual(res.data.message, 'Action item title is required');
});

test('Create Action Item - Rejects invalid meeting ID format with HTTP 400', async () => {
  const req = {
    body: {
      title: 'Valid Title',
      meeting: 'not-a-valid-object-id',
    },
    user: { _id: '507f1f77bcf86cd799439011', name: 'Test User' },
  };
  const res = createMockRes();

  await createActionItem(req, res, () => {});

  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.data.success, false);
  assert.strictEqual(res.data.message, 'Invalid meeting ID provided');
});

test('Create Action Item - Returns HTTP 404 if meeting does not exist', async () => {
  const origFindById = Meeting.findById;
  Meeting.findById = async () => null;

  try {
    const req = {
      body: {
        title: 'Valid Title',
        meeting: '507f1f77bcf86cd799439012',
      },
      user: { _id: '507f1f77bcf86cd799439011', name: 'Test User' },
    };
    const res = createMockRes();

    await createActionItem(req, res, () => {});

    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.data.success, false);
    assert.strictEqual(res.data.message, 'Meeting not found');
  } finally {
    Meeting.findById = origFindById;
  }
});

test('Create Action Item - Successfully creates standalone action item without meeting ID (HTTP 201)', async () => {
  const origCreate = ActionItem.create;
  const origFindById = ActionItem.findById;

  const mockCreatedItem = {
    _id: '507f1f77bcf86cd799439099',
    title: 'Standalone Task',
    description: 'Testing standalone task creation',
    meeting: null,
    priority: 'Medium',
    status: 'Pending',
    assignedTo: '507f1f77bcf86cd799439011',
    createdBy: '507f1f77bcf86cd799439011',
  };

  ActionItem.create = async (doc) => ({ ...mockCreatedItem, ...doc });
  ActionItem.findById = () => ({
    populate() {
      return this;
    },
    then(resolve, reject) {
      return Promise.resolve(mockCreatedItem).then(resolve, reject);
    },
  });

  try {
    const req = {
      body: {
        title: '  Standalone Task  ',
        description: 'Testing standalone task creation',
        meeting: null,
      },
      user: { _id: '507f1f77bcf86cd799439011', name: 'Test User' },
    };
    const res = createMockRes();

    await createActionItem(req, res, () => {});

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.message, 'Action item created successfully');
    assert.strictEqual(res.data.actionItem.title, 'Standalone Task');
    assert.strictEqual(res.data.actionItem.meeting, null);
  } finally {
    ActionItem.create = origCreate;
    ActionItem.findById = origFindById;
  }
});

test('Create Action Item - Successfully creates meeting-linked action item (HTTP 201)', async () => {
  const origMeetingFindById = Meeting.findById;
  const origMeetingFindByIdAndUpdate = Meeting.findByIdAndUpdate;
  const origActionItemCreate = ActionItem.create;
  const origActionItemFindById = ActionItem.findById;

  const meetingId = '507f1f77bcf86cd799439012';
  const mockMeeting = {
    _id: meetingId,
    title: 'Weekly Standup',
    meetingCode: 'WS-1234',
  };

  const mockCreatedItem = {
    _id: '507f1f77bcf86cd799439099',
    title: 'Prepare Slide Deck',
    meeting: mockMeeting,
    priority: 'High',
    status: 'Pending',
    assignedTo: '507f1f77bcf86cd799439011',
    createdBy: '507f1f77bcf86cd799439011',
  };

  let linkedMeetingId = null;
  Meeting.findById = async (id) => (id.toString() === meetingId ? mockMeeting : null);
  Meeting.findByIdAndUpdate = async (id, update) => {
    linkedMeetingId = id;
    return mockMeeting;
  };

  ActionItem.create = async (doc) => ({ ...mockCreatedItem, ...doc });
  ActionItem.findById = () => ({
    populate() {
      return this;
    },
    then(resolve, reject) {
      return Promise.resolve(mockCreatedItem).then(resolve, reject);
    },
  });

  try {
    const req = {
      body: {
        title: 'Prepare Slide Deck',
        meeting: meetingId,
        priority: 'High',
      },
      user: { _id: '507f1f77bcf86cd799439011', name: 'Test User' },
    };
    const res = createMockRes();

    await createActionItem(req, res, () => {});

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.message, 'Action item created successfully');
    assert.strictEqual(res.data.actionItem.title, 'Prepare Slide Deck');
    assert.strictEqual(res.data.actionItem.meeting._id, meetingId);
    assert.strictEqual(linkedMeetingId.toString(), meetingId);
  } finally {
    Meeting.findById = origMeetingFindById;
    Meeting.findByIdAndUpdate = origMeetingFindByIdAndUpdate;
    ActionItem.create = origActionItemCreate;
    ActionItem.findById = origActionItemFindById;
  }
});

test('Create Action Item - Standalone task assignment routes notification to /action-items', async () => {
  const origCreate = ActionItem.create;
  const origFindById = ActionItem.findById;
  const origNotifCreate = Notification.create;

  let capturedNotif = null;
  Notification.create = async (doc) => {
    capturedNotif = doc;
    return doc;
  };

  const mockCreatedItem = {
    _id: '507f1f77bcf86cd799439099',
    title: 'Refactor Auth',
    meeting: null,
  };

  ActionItem.create = async (doc) => ({ ...mockCreatedItem, ...doc });
  ActionItem.findById = () => ({
    populate() {
      return this;
    },
    then(resolve, reject) {
      return Promise.resolve(mockCreatedItem).then(resolve, reject);
    },
  });

  try {
    const req = {
      body: {
        title: 'Refactor Auth',
        assignedTo: '507f1f77bcf86cd799439099', // Different from user
      },
      user: { _id: '507f1f77bcf86cd799439011', name: 'Manager' },
    };
    const res = createMockRes();

    await createActionItem(req, res, () => {});

    assert.strictEqual(res.statusCode, 201);
    assert.ok(capturedNotif, 'Notification should be created');
    assert.strictEqual(capturedNotif.link, '/action-items');
  } finally {
    ActionItem.create = origCreate;
    ActionItem.findById = origFindById;
    Notification.create = origNotifCreate;
  }
});

test('Get Action Items - Rejects invalid meeting ID format with HTTP 400', async () => {
  const req = {
    query: { meeting: 'invalid-id-format' },
    user: { _id: '507f1f77bcf86cd799439011' },
  };
  const res = createMockRes();

  await getActionItems(req, res, () => {});

  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.data.success, false);
  assert.strictEqual(res.data.message, 'Invalid meeting ID format');
});

test('Update Action Item - Rejects empty title update with HTTP 400', async () => {
  const origFindById = ActionItem.findById;
  const mockItem = {
    _id: '507f1f77bcf86cd799439099',
    title: 'Existing Title',
    save: async () => {},
  };
  ActionItem.findById = async () => mockItem;

  try {
    const req = {
      params: { id: '507f1f77bcf86cd799439099' },
      body: { title: '    ' },
      user: { _id: '507f1f77bcf86cd799439011' },
    };
    const res = createMockRes();

    await updateActionItem(req, res, () => {});

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.data.success, false);
    assert.strictEqual(res.data.message, 'Action item title cannot be empty');
  } finally {
    ActionItem.findById = origFindById;
  }
});

test('Update Action Item - Disassociating meeting removes task from meeting document ($pull)', async () => {
  const origActionItemFindById = ActionItem.findById;
  const origMeetingFindByIdAndUpdate = Meeting.findByIdAndUpdate;

  const meetingId = '507f1f77bcf86cd799439012';
  const actionItemId = '507f1f77bcf86cd799439099';

  const mockItem = {
    _id: actionItemId,
    title: 'Task To Disassociate',
    meeting: meetingId,
    save: async () => {},
  };

  let pulledMeetingId = null;
  let pullQuery = null;

  Meeting.findByIdAndUpdate = async (id, query) => {
    pulledMeetingId = id;
    pullQuery = query;
    return {};
  };

  ActionItem.findById = (id) => {
    if (id === actionItemId) {
      return {
        populate() {
          return this;
        },
        then(resolve, reject) {
          return Promise.resolve(mockItem).then(resolve, reject);
        },
      };
    }
    return Promise.resolve(mockItem);
  };

  try {
    const req = {
      params: { id: actionItemId },
      body: { meeting: null },
      user: { _id: '507f1f77bcf86cd799439011' },
    };
    const res = createMockRes();

    await updateActionItem(req, res, () => {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(pulledMeetingId, meetingId);
    assert.deepStrictEqual(pullQuery, { $pull: { actionItems: actionItemId } });
  } finally {
    ActionItem.findById = origActionItemFindById;
    Meeting.findByIdAndUpdate = origMeetingFindByIdAndUpdate;
  }
});

test('Delete Action Item - Cleans up reference from linked meeting document ($pull)', async () => {
  const origActionItemFindById = ActionItem.findById;
  const origActionItemFindByIdAndDelete = ActionItem.findByIdAndDelete;
  const origMeetingFindByIdAndUpdate = Meeting.findByIdAndUpdate;

  const meetingId = '507f1f77bcf86cd799439012';
  const actionItemId = '507f1f77bcf86cd799439099';

  const mockItem = {
    _id: actionItemId,
    meeting: meetingId,
  };

  let pulledMeetingId = null;
  let pullQuery = null;
  let deletedId = null;

  ActionItem.findById = async () => mockItem;
  ActionItem.findByIdAndDelete = async (id) => {
    deletedId = id;
    return mockItem;
  };
  Meeting.findByIdAndUpdate = async (id, query) => {
    pulledMeetingId = id;
    pullQuery = query;
    return {};
  };

  try {
    const req = {
      params: { id: actionItemId },
      user: { _id: '507f1f77bcf86cd799439011' },
    };
    const res = createMockRes();

    await deleteActionItem(req, res, () => {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(deletedId, actionItemId);
    assert.strictEqual(pulledMeetingId, meetingId);
    assert.deepStrictEqual(pullQuery, { $pull: { actionItems: actionItemId } });
  } finally {
    ActionItem.findById = origActionItemFindById;
    ActionItem.findByIdAndDelete = origActionItemFindByIdAndDelete;
    Meeting.findByIdAndUpdate = origMeetingFindByIdAndUpdate;
  }
});

test('Update Action Item - Successfully updates status from Pending to In Progress', async () => {
  const origFindById = ActionItem.findById;
  const actionItemId = '507f1f77bcf86cd799439099';

  const mockItem = {
    _id: actionItemId,
    title: 'Review PR',
    status: 'Pending',
    save: async function () {
      return this;
    },
  };

  ActionItem.findById = (id) => {
    if (id === actionItemId) {
      return {
        populate() {
          return this;
        },
        then(resolve, reject) {
          return Promise.resolve(mockItem).then(resolve, reject);
        },
      };
    }
    return Promise.resolve(mockItem);
  };

  try {
    const req = {
      params: { id: actionItemId },
      body: { status: 'In Progress' },
      user: { _id: '507f1f77bcf86cd799439011' },
    };
    const res = createMockRes();

    await updateActionItem(req, res, () => {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(mockItem.status, 'In Progress');
  } finally {
    ActionItem.findById = origFindById;
  }
});

test('Update Action Item - Successfully updates status from In Progress to Completed', async () => {
  const origFindById = ActionItem.findById;
  const actionItemId = '507f1f77bcf86cd799439099';

  const mockItem = {
    _id: actionItemId,
    title: 'Review PR',
    status: 'In Progress',
    save: async function () {
      return this;
    },
  };

  ActionItem.findById = (id) => {
    if (id === actionItemId) {
      return {
        populate() {
          return this;
        },
        then(resolve, reject) {
          return Promise.resolve(mockItem).then(resolve, reject);
        },
      };
    }
    return Promise.resolve(mockItem);
  };

  try {
    const req = {
      params: { id: actionItemId },
      body: { status: 'Completed' },
      user: { _id: '507f1f77bcf86cd799439011' },
    };
    const res = createMockRes();

    await updateActionItem(req, res, () => {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(mockItem.status, 'Completed');
  } finally {
    ActionItem.findById = origFindById;
  }
});

test('Update Action Item - Rejects invalid status with HTTP 400', async () => {
  const origFindById = ActionItem.findById;
  const actionItemId = '507f1f77bcf86cd799439099';

  const mockItem = {
    _id: actionItemId,
    title: 'Review PR',
    status: 'Pending',
    save: async () => {},
  };

  ActionItem.findById = async () => mockItem;

  try {
    const req = {
      params: { id: actionItemId },
      body: { status: 'Archived' },
      user: { _id: '507f1f77bcf86cd799439011' },
    };
    const res = createMockRes();

    await updateActionItem(req, res, () => {});

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.data.success, false);
    assert.match(res.data.message, /Invalid status/);
  } finally {
    ActionItem.findById = origFindById;
  }
});

test('Update Action Item - Rejects invalid priority with HTTP 400', async () => {
  const origFindById = ActionItem.findById;
  const actionItemId = '507f1f77bcf86cd799439099';

  const mockItem = {
    _id: actionItemId,
    title: 'Review PR',
    priority: 'Medium',
    save: async () => {},
  };

  ActionItem.findById = async () => mockItem;

  try {
    const req = {
      params: { id: actionItemId },
      body: { priority: 'Urgent' },
      user: { _id: '507f1f77bcf86cd799439011' },
    };
    const res = createMockRes();

    await updateActionItem(req, res, () => {});

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.data.success, false);
    assert.match(res.data.message, /Invalid priority/);
  } finally {
    ActionItem.findById = origFindById;
  }
});

test('Update Action Item - Successfully updates standalone task fields', async () => {
  const origFindById = ActionItem.findById;
  const actionItemId = '507f1f77bcf86cd799439099';

  const mockItem = {
    _id: actionItemId,
    title: 'Original Title',
    description: 'Original Desc',
    priority: 'Low',
    status: 'Pending',
    meeting: null,
    save: async function () {
      return this;
    },
  };

  ActionItem.findById = (id) => {
    if (id === actionItemId) {
      return {
        populate() {
          return this;
        },
        then(resolve, reject) {
          return Promise.resolve(mockItem).then(resolve, reject);
        },
      };
    }
    return Promise.resolve(mockItem);
  };

  try {
    const req = {
      params: { id: actionItemId },
      body: {
        title: 'Updated Title',
        description: 'Updated Desc',
        priority: 'High',
        status: 'In Progress',
      },
      user: { _id: '507f1f77bcf86cd799439011' },
    };
    const res = createMockRes();

    await updateActionItem(req, res, () => {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(mockItem.title, 'Updated Title');
    assert.strictEqual(mockItem.description, 'Updated Desc');
    assert.strictEqual(mockItem.priority, 'High');
    assert.strictEqual(mockItem.status, 'In Progress');
    assert.strictEqual(mockItem.meeting, null);
  } finally {
    ActionItem.findById = origFindById;
  }
});

test('Action Item Authorization - Rejects unauthenticated request with HTTP 401', async () => {
  const req = { headers: {} };
  const res = createMockRes();
  let nextCalled = false;

  await protect(req, res, () => {
    nextCalled = true;
  });

  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(res.data.success, false);
  assert.strictEqual(res.data.message, 'Not authorized, no access token provided');
  assert.strictEqual(nextCalled, false);
});



