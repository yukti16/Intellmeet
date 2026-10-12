const test = require('node:test');
const assert = require('node:assert');
const { generateToken, verifyToken } = require('../config/jwt');
const { protect } = require('../middleware/authMiddleware');
const { registerUser, loginUser, logoutUser } = require('../controllers/authController');

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

test('JWT Token Generation and Verification - Valid Session', () => {
  const userId = '507f1f77bcf86cd799439011';
  const role = 'Admin';
  
  const token = generateToken(userId, role);
  assert.strictEqual(typeof token, 'string');
  assert.ok(token.length > 20);

  const decoded = verifyToken(token);
  assert.strictEqual(decoded.id, userId);
  assert.strictEqual(decoded.role, role);
});

test('Token Verification - Fails on Tampered or Invalid Token', () => {
  assert.throws(() => {
    verifyToken('invalid.token.string');
  });
});

test('Unauthenticated Access - Protect Middleware blocks missing token', async () => {
  const req = { headers: {} };
  const res = createMockRes();
  let nextCalled = false;

  await protect(req, res, () => { nextCalled = true; });

  assert.strictEqual(nextCalled, false);
  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(res.data.success, false);
  assert.strictEqual(res.data.message, 'Not authorized, no access token provided');
});

test('Unauthenticated Access - Protect Middleware blocks invalid token', async () => {
  const req = { headers: { authorization: 'Bearer malformed.jwt.token' } };
  const res = createMockRes();
  let nextCalled = false;

  await protect(req, res, () => { nextCalled = true; });

  assert.strictEqual(nextCalled, false);
  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(res.data.success, false);
  assert.strictEqual(res.data.message, 'Not authorized, token validation failed');
});

test('Signup Validation - Requires Name, Email, and Password', async () => {
  const req = {
    body: { email: 'test@example.com' }, // missing name and password
  };
  const res = createMockRes();

  await registerUser(req, res, () => {});

  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.data.success, false);
  assert.strictEqual(res.data.message, 'Please provide name, email and password');
});

test('Signin Validation - Requires Email and Password', async () => {
  const req = {
    body: { email: 'test@example.com' }, // missing password
  };
  const res = createMockRes();

  await loginUser(req, res, () => {});

  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.data.success, false);
  assert.strictEqual(res.data.message, 'Please provide email and password');
});

test('Logout Session - Successfully clears user session', async () => {
  const req = { user: null };
  const res = createMockRes();

  await logoutUser(req, res, () => {});

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.data.success, true);
  assert.strictEqual(res.data.message, 'Logged out successfully');
});
