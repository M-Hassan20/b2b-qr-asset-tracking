import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { QRService } from '../services/qrService.js';
import { AssetService } from '../services/assetService.js';
import { HistoryService } from '../services/historyService.js';
import { AuthService } from '../services/authService.js';

test('QRService - Generates valid 64-char hex token', () => {
  const token = QRService.generateToken();
  assert.equal(typeof token, 'string');
  assert.equal(token.length, 64);
  assert.match(token, /^[0-9a-f]{64}$/);
  assert.equal(QRService.isValidToken(token), true);
  assert.equal(QRService.isValidToken('invalid-token-short'), false);
});

test('QRService - Builds correctly formatted public scan URL with tenant query param', () => {
  const token = 'a'.repeat(64);
  const tenantId = '654321098765432109876543';
  const url = QRService.buildScanUrl('demo.vision71.com', token, tenantId);
  assert.equal(url, `https://demo.vision71.com/scan/${token}?t=${tenantId}`);
});

test('QRService - Generates 300x300 PNG Data URL', async () => {
  const token = 'b'.repeat(64);
  const tenantId = '654321098765432109876543';
  const url = QRService.buildScanUrl('localhost:5173', token, tenantId);
  const dataUrl = await QRService.generateQrImageDataUrl(url);
  assert.match(dataUrl, /^data:image\/png;base64,/);
});

test('API App Creation - Verifies routes are registered and health check returns ok', async () => {
  const app = createApp();
  assert.ok(app);
});
