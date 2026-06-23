/**
 * Non-Functional Load Testing Script for NADRA Management System
 * Simulates high concurrent user load on target endpoints.
 */
import dotenv from 'dotenv';
import fs from 'fs';

if (fs.existsSync('backend/.env')) {
  dotenv.config({ path: 'backend/.env' });
}

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000/api';
const CONCURRENCY = parseInt(process.argv[2], 10) || 50; // default 50 parallel clients
const DURATION_SECONDS = parseInt(process.argv[3], 10) || 10; // default 10 seconds duration

async function getAuthToken() {
  console.log(`Logging in to backend at ${BACKEND_URL}/auth/login...`);
  const res = await fetch(`${BACKEND_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  
  if (!res.ok) {
    throw new Error(`Login failed with status ${res.status}`);
  }
  
  const data = await res.json();
  return data.token;
}

async function runWorker(token, stats, endTime) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json'
  };

  const endpoints = [
    '/records/stats',
    '/records?page=1&limit=10'
  ];

  while (Date.now() < endTime) {
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const start = performance.now();
    stats.totalRequests++;

    try {
      const res = await fetch(`${BACKEND_URL}${endpoint}`, { headers });
      const duration = performance.now() - start;
      stats.latencies.push(duration);

      if (res.ok) {
        stats.successRequests++;
      } else {
        stats.failedRequests++;
      }
    } catch (err) {
      stats.failedRequests++;
    }
  }
}

async function main() {
  console.log('=== NADRA System Load Test ===');
  let token;
  try {
    token = await getAuthToken();
    console.log('Successfully authenticated as admin.');
  } catch (err) {
    console.error('❌ Authentication failed:', err.message);
    process.exit(1);
  }

  const stats = {
    totalRequests: 0,
    successRequests: 0,
    failedRequests: 0,
    latencies: []
  };

  const startTime = Date.now();
  const endTime = startTime + (DURATION_SECONDS * 1000);

  console.log(`Starting load test with ${CONCURRENCY} concurrent workers for ${DURATION_SECONDS} seconds...`);
  
  const workers = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(runWorker(token, stats, endTime));
  }

  await Promise.all(workers);
  
  const actualDuration = (Date.now() - startTime) / 1000;
  const latencies = stats.latencies.sort((a, b) => a - b);
  
  const total = latencies.length;
  const avg = total > 0 ? (latencies.reduce((a, b) => a + b, 0) / total) : 0;
  const min = total > 0 ? latencies[0] : 0;
  const max = total > 0 ? latencies[total - 1] : 0;
  const p95 = total > 0 ? latencies[Math.floor(total * 0.95)] : 0;
  const rps = stats.totalRequests / actualDuration;

  console.log('\n=== LOAD TEST RESULTS ===');
  console.log(`Duration:            ${actualDuration.toFixed(2)} seconds`);
  console.log(`Total Requests:      ${stats.totalRequests}`);
  console.log(`Success (2xx):       ${stats.successRequests} (${((stats.successRequests / stats.totalRequests) * 100).toFixed(1)}%)`);
  console.log(`Failed/Errors:       ${stats.failedRequests} (${((stats.failedRequests / stats.totalRequests) * 100).toFixed(1)}%)`);
  console.log(`Throughput (RPS):    ${rps.toFixed(1)} req/sec`);
  console.log(`Min Latency:         ${min.toFixed(2)} ms`);
  console.log(`Avg Latency:         ${avg.toFixed(2)} ms`);
  console.log(`Max Latency:         ${max.toFixed(2)} ms`);
  console.log(`95th Percentile:     ${p95.toFixed(2)} ms`);
  console.log('==========================');
}

main();
