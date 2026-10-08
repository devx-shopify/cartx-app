#!/usr/bin/env node
// Daily retention entry point. Deletes raw AnalyticsEvent rows older than 90
// days. DailyStats is kept indefinitely.
//   npm run retention
import { pruneRawEvents } from '../app/lib/rollup.server.js'
import { initSentry, captureException, captureCheckIn, flushSentry } from '../app/lib/sentry.server.js'

await initSentry()

// Heartbeat: Sentry alerts if this daily check-in is missed or errors.
const MONITOR_SLUG = 'cartx-retention'
const checkInId = captureCheckIn(
  { monitorSlug: MONITOR_SLUG, status: 'in_progress' },
  {
    schedule: { type: 'interval', value: 1, unit: 'day' },
    checkinMargin: 120,
    maxRuntime: 20,
    timezone: 'Etc/UTC',
  },
)

const started = Date.now()
try {
  const { deleted, cutoff } = await pruneRawEvents()
  console.log(
    `[cartx][retention] deleted=${deleted} (older than ${cutoff.toISOString()}) ` +
    `in ${Date.now() - started}ms`,
  )
  captureCheckIn({ checkInId, monitorSlug: MONITOR_SLUG, status: 'ok' })
  await flushSentry()
  process.exit(0)
} catch (err) {
  console.error('[cartx][retention] fatal:', err)
  captureException(err, { tags: { job: 'retention' } })
  captureCheckIn({ checkInId, monitorSlug: MONITOR_SLUG, status: 'error' })
  await flushSentry()
  process.exit(1)
}
