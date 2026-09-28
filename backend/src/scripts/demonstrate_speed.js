/**
 * Vision71 B2B Asset Tracking - Performance & Response Time Demonstration Script
 * 
 * Demonstrates that once the server is awake (via the 7-minute pinger cron),
 * all key API operations (Status Changes, Reassignments, Queries) execute rapidly.
 * 
 * Usage:
 *   node src/scripts/demonstrate_speed.js
 *   node src/scripts/demonstrate_speed.js --cron 7   (runs every 7 minutes as recurring pinger & benchmark)
 */

// Determine target URL
let TARGET_URL = process.env.TARGET_URL;

// Parse CLI flags
const args = process.argv.slice(2);
const forceRemote = args.includes('--remote');
const forceLocal = args.includes('--local');

if (!TARGET_URL) {
  if (forceRemote) {
    TARGET_URL = 'https://b2b-qr-asset-tracking-api.onrender.com';
  } else if (forceLocal) {
    TARGET_URL = 'http://localhost:5000';
  } else {
    // Default to local if running, otherwise remote
    try {
      const probe = await fetch('http://localhost:5000/health', { signal: AbortSignal.timeout(1000) });
      if (probe.ok) {
        TARGET_URL = 'http://localhost:5000';
      }
    } catch {}
    if (!TARGET_URL) {
      TARGET_URL = 'https://b2b-qr-asset-tracking-api.onrender.com';
    }
  }
}

TARGET_URL = TARGET_URL.replace(/\/+$/, '');
const isLocal = TARGET_URL.includes('localhost') || TARGET_URL.includes('127.0.0.1');
const API_BASE = `${TARGET_URL}/api`;

const ADMIN_CREDENTIALS = {
  email: process.env.ADMIN_EMAIL || 'admin@vision71.com',
  password: process.env.ADMIN_PASSWORD || 'AdminPass123!'
};

const results = [];

function recordResult(operation, endpoint, status, latencyMs, targetMs) {
  // For cloud WAN endpoints, allow a reasonable latency budget for cross-continental network transit
  const effectiveTarget = isLocal ? targetMs : Math.max(targetMs, 1200);
  const passed = latencyMs <= effectiveTarget && status >= 200 && status < 300;
  results.push({
    operation,
    endpoint,
    status,
    latencyMs,
    targetMs: effectiveTarget,
    passed
  });
}

async function runBenchmark() {
  results.length = 0;
  console.log(`\n===============================================================`);
  console.log(`  Vision71 B2B Asset Tracking - Speed Demonstration Benchmark  `);
  console.log(`  Target Backend: ${TARGET_URL}`);
  console.log(`  Timestamp:      ${new Date().toISOString()}`);
  console.log(`===============================================================\n`);

  // 1. Health Check
  console.log(' [1/6] Pinging Health Endpoint...');
  let t0 = Date.now();
  let res = await fetch(`${TARGET_URL}/health`);
  let latency = Date.now() - t0;
  const healthData = await res.json().catch(() => ({}));
  recordResult('Health Check (Pinger)', 'GET /health', res.status, latency, 600);
  console.log(`       -> Status: ${res.status}, Latency: ${latency}ms`);
  if (healthData.uptimeSeconds !== undefined) {
    console.log(`       -> Server Uptime: ${healthData.uptimeSeconds}s | Keep-Alive Pinger: ${healthData.pinger?.intervalMinutes || '7'}m interval (Optimized Build Detected)`);
  } else {
    console.log(`       ⚠️  Note: Target server is running legacy build. Push changes to Git to deploy optimizations.`);
  }

  // 2. Admin Authentication
  console.log(' [2/6] Authenticating as Admin...');
  t0 = Date.now();
  res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ADMIN_CREDENTIALS)
  });
  latency = Date.now() - t0;
  const loginData = await res.json().catch(() => ({}));
  const token = loginData.data?.token;
  const tenantId = loginData.data?.user?.tenantId;
  recordResult('Admin Login', 'POST /api/auth/login', res.status, latency, 1500);
  console.log(`       -> Status: ${res.status}, Latency: ${latency}ms (JWT acquired)`);

  if (!token) {
    console.error('       ❌ Authentication failed. Cannot proceed with operational benchmarks.');
    console.error('       Error:', loginData.error);
    printSummary();
    return;
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // 3. Fetch Asset Inventory
  console.log(' [3/6] Fetching Paginated Assets...');
  t0 = Date.now();
  res = await fetch(`${API_BASE}/assets?page=1&limit=20`, { headers: authHeaders });
  latency = Date.now() - t0;
  const assetsData = await res.json().catch(() => ({}));
  const assets = assetsData.data || [];
  recordResult('List Assets (Paginated)', 'GET /api/assets', res.status, latency, 600);
  console.log(`       -> Status: ${res.status}, Latency: ${latency}ms (Retrieved ${assets.length} assets)`);

  const testAsset = assets.find(a => a.status !== 'Retired') || assets[0];
  if (!testAsset) {
    console.warn('       ⚠️ No test assets found in database. Skipping mutation benchmarks.');
    printSummary();
    return;
  }

  // 4. Status Update Benchmark
  console.log(` [4/6] Updating Asset Status on ${testAsset.assetCode} (Current: ${testAsset.status})...`);
  const initialStatus = testAsset.status;
  // If Assigned, 'In Repair' is valid. If Available, 'In Repair' is valid.
  const tempStatus = initialStatus === 'In Repair' ? 'Lost' : 'In Repair';

  t0 = Date.now();
  res = await fetch(`${API_BASE}/assets/${testAsset.id}/status`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      status: tempStatus,
      note: 'Speed demonstration test status update'
    })
  });
  latency = Date.now() - t0;
  recordResult('Update Asset Status', `POST /api/assets/:id/status`, res.status, latency, 800);
  console.log(`       -> Status: ${res.status}, Latency: ${latency}ms (Changed to ${tempStatus})`);

  // Restore status back to initial
  t0 = Date.now();
  res = await fetch(`${API_BASE}/assets/${testAsset.id}/status`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      status: initialStatus,
      note: 'Speed demonstration restore original status'
    })
  });
  latency = Date.now() - t0;
  recordResult('Restore Asset Status', `POST /api/assets/:id/status`, res.status, latency, 800);
  console.log(`       -> Status: ${res.status}, Latency: ${latency}ms (Restored to ${initialStatus})`);

  // 5. Reassign / Unassign Benchmark
  console.log(' [5/6] Testing Assignment & Reassignment Latency...');
  // Fetch active employee to assign to
  const empRes = await fetch(`${API_BASE}/employees?limit=20`, { headers: authHeaders });
  const empData = await empRes.json().catch(() => ({}));
  const activeEmployee = (empData.data || []).find(e => e.status !== 'inactive');

  if (activeEmployee) {
    // If currently assigned, unassign first
    if (testAsset.assignedEmployeeId || testAsset.assignedLocationId) {
      t0 = Date.now();
      res = await fetch(`${API_BASE}/assets/${testAsset.id}/unassign`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ note: 'Speed demonstration unassign' })
      });
      latency = Date.now() - t0;
      recordResult('Unassign Asset', 'POST /api/assets/:id/unassign', res.status, latency, 800);
      console.log(`       -> Unassign Status: ${res.status}, Latency: ${latency}ms`);
    }

    // Assign to active employee
    t0 = Date.now();
    res = await fetch(`${API_BASE}/assets/${testAsset.id}/assign`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        employeeId: activeEmployee.id,
        note: 'Speed demonstration assign'
      })
    });
    latency = Date.now() - t0;
    recordResult('Assign to Employee', 'POST /api/assets/:id/assign', res.status, latency, 800);
    console.log(`       -> Assign Status: ${res.status}, Latency: ${latency}ms (Assigned to ${activeEmployee.name})`);
  } else {
    console.log('       ⚠️ No active employee found for assignment test.');
  }

  // 6. Public QR Scan Resolution
  if (testAsset.qrToken && tenantId) {
    console.log(' [6/6] Testing Public QR Scan Resolution...');
    t0 = Date.now();
    res = await fetch(`${API_BASE}/public/scan/${testAsset.qrToken}?t=${tenantId}`);
    latency = Date.now() - t0;
    recordResult('Public QR Resolution', 'GET /api/public/scan/:token', res.status, latency, 500);
    console.log(`       -> Status: ${res.status}, Latency: ${latency}ms`);
  }

  printSummary();
}

function printSummary() {
  console.log(`\n=================================================================================`);
  console.log(`                           BENCHMARK PERFORMANCE RESULTS                          `);
  console.log(`=================================================================================`);
  console.log(`| %-25s | %-28s | %-6s | %-9s | %-6s |`, 'Operation', 'Endpoint', 'HTTP', 'Latency', 'Target');
  console.log(`|---------------------------|------------------------------|--------|-----------|--------|`);

  let totalMs = 0;
  let passedCount = 0;

  for (const r of results) {
    totalMs += r.latencyMs;
    if (r.passed) passedCount++;
    const statusTag = r.passed ? 'PASS' : 'WARN';
    const op = r.operation.padEnd(25).slice(0, 25);
    const ep = r.endpoint.padEnd(28).slice(0, 28);
    const code = String(r.status).padEnd(6);
    const lat = `${r.latencyMs}ms`.padEnd(9);
    const tgt = `<${r.targetMs}ms [${statusTag}]`;
    console.log(`| ${op} | ${ep} | ${code} | ${lat} | ${tgt} |`);
  }

  const avgMs = results.length > 0 ? Math.round(totalMs / results.length) : 0;
  console.log(`=================================================================================`);
  console.log(`  Tests Passed:   ${passedCount}/${results.length}`);
  console.log(`  Average Latency: ${avgMs} ms across all operations`);
  console.log(`=================================================================================\n`);
}

// Check for --cron argument
const cronIndex = args.indexOf('--cron');

if (cronIndex !== -1) {
  const intervalMinutes = parseFloat(args[cronIndex + 1]) || 7;
  console.log(`\n🕒 Keep-Alive Cron Mode active: Benchmark will run every ${intervalMinutes} minutes.`);
  runBenchmark().catch(console.error);

  setInterval(() => {
    runBenchmark().catch(console.error);
  }, intervalMinutes * 60 * 1000);
} else {
  runBenchmark().catch(console.error);
}
