/* Veri değiştirmeyen yerel kapasite kontrolü. Yalnızca GET endpointlerini çağırır. */
const app = require('../dist/index').default;

const totalRequests = Math.max(1, Number(process.env.CAPACITY_REQUESTS || 200));
const concurrency = Math.max(1, Number(process.env.CAPACITY_CONCURRENCY || 20));
const paths = [
  '/api/dashboard/stats?year=2026',
  '/api/volunteers?page=1&limit=10',
  '/api/volunteers/grouped?page=1&limit=10',
  '/api/applications?page=1&limit=10',
];

const percentile = (values, ratio) => values[Math.min(values.length - 1, Math.floor(values.length * ratio))] || 0;

async function main() {
  const originalLog = console.log;
  console.log = () => {};
  const server = await new Promise(resolve => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  let next = 0;
  const durations = [];
  const statuses = new Map();
  const startedAt = performance.now();
  try {
    await Promise.all(Array.from({ length: Math.min(concurrency, totalRequests) }, async () => {
      while (true) {
        const index = next++;
        if (index >= totalRequests) return;
        const requestStartedAt = performance.now();
        const response = await fetch(`${baseUrl}${paths[index % paths.length]}`);
        await response.arrayBuffer();
        durations.push(performance.now() - requestStartedAt);
        statuses.set(response.status, (statuses.get(response.status) || 0) + 1);
      }
    }));
  } finally {
    await new Promise(resolve => server.close(resolve));
    console.log = originalLog;
  }
  durations.sort((a, b) => a - b);
  const elapsedMs = performance.now() - startedAt;
  const failed = [...statuses.entries()].filter(([status]) => status >= 400).reduce((sum, [, count]) => sum + count, 0);
  originalLog(JSON.stringify({ totalRequests, concurrency, elapsedMs: Math.round(elapsedMs), requestsPerSecond: Number((totalRequests / (elapsedMs / 1000)).toFixed(1)), latencyMs: { p50: Math.round(percentile(durations, .50)), p95: Math.round(percentile(durations, .95)), max: Math.round(durations.at(-1) || 0) }, statuses: Object.fromEntries(statuses), failed }, null, 2));
  if (failed) process.exitCode = 1;
}

main().catch(error => { console.error(error); process.exitCode = 1; });
