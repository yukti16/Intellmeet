const test = require('node:test');
const assert = require('node:assert');
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

test('Create Action Item - Validation requires title and meeting ID', async () => {
  const req = {
    body: { description: 'Missing title and meeting' },
    user: { _id: '507f1f77bcf86cd799439011', name: 'Test User' },
  };
  const res = createMockRes();

  await createActionItem(req, res, () => {});

  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.data.success, false);
  assert.strictEqual(res.data.message, 'Title and meeting ID are required');
});

test('Create Action Item - Validation requires meeting ID even if title provided', async () => {
  const req = {
    body: { title: 'Implement Socket.io feature' },
    user: { _id: '507f1f77bcf86cd799439011', name: 'Test User' },
  };
  const res = createMockRes();

  await createActionItem(req, res, () => {});

  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.data.success, false);
  assert.strictEqual(res.data.message, 'Title and meeting ID are required');
});
