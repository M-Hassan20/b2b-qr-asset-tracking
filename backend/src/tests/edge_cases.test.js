import test from 'node:test';
import assert from 'node:assert/strict';
import { rateLimit } from '../middlewares/rateLimiter.js';
import { QRService } from '../services/qrService.js';
import {
  createAssetSchema,
  patchAssetSchema,
  assignAssetSchema,
  changeStatusSchema,
  loginSchema,
  assetFilterSchema
} from '../schemas/validationSchemas.js';

test('Rate Limiter - Allows requests within limit and blocks on exceeding', () => {
  const limiter = rateLimit({ maxAttempts: 3, windowMs: 60000 });
  const req = { headers: { 'x-forwarded-for': '10.0.0.99' }, socket: {} };
  const res = { setHeader: () => {} };

  let errorOccurred = null;
  const next = (err) => { errorOccurred = err || null; };

  // Attempt 1
  limiter(req, res, next);
  assert.equal(errorOccurred, null);

  // Attempt 2
  limiter(req, res, next);
  assert.equal(errorOccurred, null);

  // Attempt 3
  limiter(req, res, next);
  assert.equal(errorOccurred, null);

  // Attempt 4 (Exceeds limit)
  limiter(req, res, next);
  assert.ok(errorOccurred);
  assert.equal(errorOccurred.statusCode, 429);
  assert.equal(errorOccurred.code, 'TOO_MANY_REQUESTS');
});

test('QR Token Security - Validates 64-char lowercase hex strictly and rejects tampered strings', () => {
  assert.equal(QRService.isValidToken('a'.repeat(64)), true);
  assert.equal(QRService.isValidToken('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'), true);

  // Uppercase hex should fail (lowercase required)
  assert.equal(QRService.isValidToken('A'.repeat(64)), false);

  // Non-hex chars
  assert.equal(QRService.isValidToken('g'.repeat(64)), false);

  // Length 63 or 65
  assert.equal(QRService.isValidToken('a'.repeat(63)), false);
  assert.equal(QRService.isValidToken('a'.repeat(65)), false);
  assert.equal(QRService.isValidToken(null), false);
  assert.equal(QRService.isValidToken(''), false);
});

test('Edge Case EC 06 - Assignment schema fails if neither or both employee and location provided', () => {
  const neither = assignAssetSchema.safeParse({});
  assert.equal(neither.success, false);

  const both = assignAssetSchema.safeParse({ employeeId: 'emp_1', locationId: 'loc_1' });
  assert.equal(both.success, false);

  const validEmp = assignAssetSchema.safeParse({ employeeId: 'emp_1', note: 'Project delivery' });
  assert.equal(validEmp.success, true);

  const validLoc = assignAssetSchema.safeParse({ locationId: 'loc_1', note: 'Storage room B' });
  assert.equal(validLoc.success, true);
});

test('Edge Case EC 01 - Asset Code format validation', () => {
  // Valid codes
  assert.equal(createAssetSchema.safeParse({ name: 'Test', category: 'Tool', assetCode: 'AST0001' }).success, true);
  assert.equal(createAssetSchema.safeParse({ name: 'Test', category: 'Tool', assetCode: 'TOOL-99-A' }).success, true);

  // Invalid codes (special chars, spaces, too short, too long)
  assert.equal(createAssetSchema.safeParse({ name: 'Test', category: 'Tool', assetCode: 'AB' }).success, false);
  assert.equal(createAssetSchema.safeParse({ name: 'Test', category: 'Tool', assetCode: 'A'.repeat(21) }).success, false);
  assert.equal(createAssetSchema.safeParse({ name: 'Test', category: 'Tool', assetCode: 'AST 001' }).success, false);
  assert.equal(createAssetSchema.safeParse({ name: 'Test', category: 'Tool', assetCode: 'ast0001' }).success, false); // lowercase disallowed
});

test('Edge Case EC 10 - Asset filter query sanitization and defaults', () => {
  const parsed = assetFilterSchema.parse({ page: '2', limit: '50', isPublicVisible: 'true' });
  assert.equal(parsed.page, 2);
  assert.equal(parsed.limit, 50);
  assert.equal(parsed.isPublicVisible, true);

  // Over limit max (100)
  const overLimit = assetFilterSchema.safeParse({ limit: '150' });
  assert.equal(overLimit.success, false);
});

test('Edge Case Status Transitions - Validates allowed status values', () => {
  const allowed = ['Available', 'Assigned', 'In Repair', 'Retired', 'Lost'];
  for (const st of allowed) {
    assert.equal(changeStatusSchema.safeParse({ status: st }).success, true);
  }

  assert.equal(changeStatusSchema.safeParse({ status: 'Disposed' }).success, false);
  assert.equal(changeStatusSchema.safeParse({ status: 'Broken' }).success, false);
});
