import crypto from 'crypto';
import QRCode from 'qrcode';

export class QRService {
  /**
   * Generates a 64-character lowercase hex token with 256-bit entropy
   */
  static generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validates if a token is a 64-character lowercase hex string
   */
  static isValidToken(token) {
    if (!token || typeof token !== 'string') return false;
    return /^[0-9a-f]{64}$/.test(token);
  }

  /**
   * Builds the public scan URL
   */
  static buildScanUrl(host, qrToken, tenantId) {
    const base = host.startsWith('http') ? host : `https://${host}`;
    return `${base}/scan/${qrToken}?t=${tenantId}`;
  }

  /**
   * Generates a 300x300 PNG Data URL
   */
  static async generateQrImageDataUrl(scanUrl) {
    return await QRCode.toDataURL(scanUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
  }
}
