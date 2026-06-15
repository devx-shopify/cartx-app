#!/usr/bin/env node
// Hourly rollup entry point. Run by Fly scheduled machines.
//   npm run rollup
import { rollupAllShops } from '../app/lib/rollup.server.js'
import { initSentry, captureException, captureCheckIn, flushSentry } from '../app/lib/sentry.server.js'

await initSentry()

// Heartbeat: Sentry alerts if this check-in is missed (the hourly machine never
// ran) or reports an error status. The config upserts the monitor on first run.
const MONITOR_SLUG = 'cartx-rollup'
const checkInId = captureCheckIn(
  { monitorSlug: MONITOR_SLUG, status: 'in_progress' },
  {
    schedule: { type: 'interval', value: 1, unit: 'hour' },
    checkinMargin: 15,
    maxRuntime: 20,
    timezone: 'Etc/UTC',
  },
)

const started = Date.now()
try {
  const result = await rollupAllShops()
  console.log(
    `[cartx][rollup] done in ${Date.now() - started}ms — shops=${result.shops}, ` +
    `buckets=${result.totalBuckets}, failed=${result.totalFailed}`,
  )
  if (result.totalFailed > 0) {
    captureException(new Error(`rollup completed with ${result.totalFailed} failed shop(s)`), {
      level: 'warning',
      tags: { job: 'rollup' },
      extra: result,
    })
  }
  captureCheckIn({ checkInId, monitorSlug: MONITOR_SLUG, status: result.totalFailed > 0 ? 'error' : 'ok' })
  await flushSentry()
  process.exit(result.totalFailed > 0 ? 1 : 0)
} catch (err) {
  console.error('[cartx][rollup] fatal:', err)
  captureException(err, { tags: { job: 'rollup' } })
  captureCheckIn({ checkInId, monitorSlug: MONITOR_SLUG, status: 'error' })
  await flushSentry()
  process.exit(1)
}
