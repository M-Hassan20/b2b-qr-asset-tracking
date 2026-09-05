import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAssetSchema,
  patchAssetSchema,
  assignAssetSchema,
  changeStatusSchema,
  loginSchema,
  publicScanSchema
} from '../schemas/validationSchemas.js';

test('Schema Validation - Login schema passes on valid email and password', () => {
  const valid = loginSchema.safeParse({ email: 'admin@test.com', password: 'password123' });
  assert.equal(valid.success, true);

  const invalidEmail = loginSchema.safeParse({ email: 'not-an-email', password: '123' });
  assert.equal(invalidEmail.success, false);

  const emptyPass = loginSchema.safeParse({ email: 'a@b.com', password: '' });
  assert.equal(emptyPass.success, false);
});

test('Schema Validation - Create Asset rejects invalid category and malformed assetCode', () => {
  const valid = createAssetSchema.safeParse({
    name: 'Dell Laptop',
    category: 'Laptop',
    assetCode: 'AST0142'
  });
  assert.equal(valid.success, true);

  const invalidCat = createAssetSchema.safeParse({
    name: 'Dell Laptop',
    category: 'InvalidCategory'
  });
  assert.equal(invalidCat.success, false);

  const invalidCode = createAssetSchema.safeParse({
    name: 'Dell Laptop',
    category: 'Laptop',
    assetCode: 'invalid-code-!'
  });
  assert.equal(invalidCode.success, false);
});

test('Schema Validation - Assignment Schema requires either employeeId or locationId, never both (EC 06)', () => {
  const validEmp = assignAssetSchema.safeParse({ employeeId: 'emp123' });
  assert.equal(validEmp.success, true);

  const validLoc = assignAssetSchema.safeParse({ locationId: 'loc123' });
  assert.equal(validLoc.success, true);

  const bothProvided = assignAssetSchema.safeParse({ employeeId: 'emp123', locationId: 'loc123' });
  assert.equal(bothProvided.success, false);

  const neitherProvided = assignAssetSchema.safeParse({});
  assert.equal(neitherProvided.success, false);
});

test('Schema Validation - Status change schema validates allowed states', () => {
  const valid = changeStatusSchema.safeParse({ status: 'In Repair', note: 'Broken keyboard' });
  assert.equal(valid.success, true);

  const invalid = changeStatusSchema.safeParse({ status: 'UnknownState' });
  assert.equal(invalid.success, false);
});

test('Schema Validation - Patch Asset rejects empty payload', () => {
  const empty = patchAssetSchema.safeParse({});
  assert.equal(empty.success, false);

  const valid = patchAssetSchema.safeParse({ name: 'Updated Name' });
  assert.equal(valid.success, true);
});
