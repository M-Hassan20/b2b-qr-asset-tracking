/**
 * Vision71 Keep-Alive Pinger Service
 * 
 * Periodically sends lightweight HTTP health pings to keep the Render free-tier
 * web service warm and prevent cold-start sleep (Render sleeps after 15 min of inactivity).
 * Default interval: 7 minutes (420,000 ms).
 */

let pingerInterval = null;
let lastPingResult = {
  timestamp: null,
  status: null,
  latencyMs: null,
  error: null
};

export class PingerService {
  /**
   * Resolves the target health URL
   */
  static getTargetUrl() {
    if (process.env.PING_URL) {
      return process.env.PING_URL;
    }
    if (process.env.RENDER_EXTERNAL_URL) {
      const base = process.env.RENDER_EXTERNAL_URL.replace(/\/+$/, '');
      return `${base}/health`;
    }
    return 'https://b2b-qr-asset-tracking-api.onrender.com/health';
  }

  /**
   * Resolves interval in milliseconds (default: 7 minutes)
   */
  static getIntervalMs() {
    if (process.env.PING_INTERVAL_MS) {
      return parseInt(process.env.PING_INTERVAL_MS, 10);
    }
    if (process.env.PINGER_INTERVAL_MINUTES) {
      return parseFloat(process.env.PINGER_INTERVAL_MINUTES) * 60 * 1000;
    }
    return 7 * 60 * 1000; // 7 minutes
  }

  /**
   * Executes a single ping request
   */
  static async pingNow() {
    const targetUrl = this.getTargetUrl();
    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Vision71-KeepAlive-Pinger/1.0',
          'X-Pinger-Source': 'internal-cron'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const latencyMs = Date.now() - startTime;
      lastPingResult = {
        timestamp: new Date().toISOString(),
        status: response.status,
        latencyMs,
        error: null
      };

      console.log(`[Keep-Alive Pinger] Ping to ${targetUrl} succeeded: HTTP ${response.status} (${latencyMs}ms)`);
      return lastPingResult;
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      lastPingResult = {
        timestamp: new Date().toISOString(),
        status: 0,
        latencyMs,
        error: err.message
      };

      console.warn(`[Keep-Alive Pinger] Ping to ${targetUrl} warning: ${err.message} (${latencyMs}ms)`);
      return lastPingResult;
    }
  }

  /**
   * Starts the recurring background pinger
   */
  static startPinger() {
    if (process.env.DISABLE_PINGER === 'true') {
      console.log('[Keep-Alive Pinger] Service disabled by DISABLE_PINGER environment variable.');
      return;
    }

    const intervalMs = this.getIntervalMs();
    const intervalMinutes = (intervalMs / (60 * 1000)).toFixed(1);
    const targetUrl = this.getTargetUrl();

    console.log(`[Keep-Alive Pinger] Scheduled for ${targetUrl} every ${intervalMinutes} minutes.`);

    // Warm-up initial ping after 5 seconds to warm the event loop & verify reachability
    const initialTimer = setTimeout(() => {
      this.pingNow().catch(() => {});
    }, 5000);
    if (initialTimer.unref) initialTimer.unref();

    // Recurring interval
    if (pingerInterval) clearInterval(pingerInterval);
    pingerInterval = setInterval(() => {
      this.pingNow().catch(() => {});
    }, intervalMs);

    // Unref interval timer so it does not prevent clean process exit
    if (pingerInterval.unref) pingerInterval.unref();
  }

  /**
   * Stops the pinger
   */
  static stopPinger() {
    if (pingerInterval) {
      clearInterval(pingerInterval);
      pingerInterval = null;
      console.log('[Keep-Alive Pinger] Stopped.');
    }
  }

  /**
   * Gets stats about the last ping
   */
  static getStats() {
    return {
      targetUrl: this.getTargetUrl(),
      intervalMinutes: (this.getIntervalMs() / (60 * 1000)).toFixed(1),
      lastPing: lastPingResult
    };
  }
}
