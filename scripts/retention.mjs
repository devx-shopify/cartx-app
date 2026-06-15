#!/usr/bin/env node
// Daily retention entry point. Deletes raw AnalyticsEvent rows older than 90
// days. DailyStats is kept indefinitely.
//   npm run retention
import { pruneRawEvents } from '../app/lib/rollup.server.js'
import { initSentry, captureException, flushSentry } from '../app/lib/sentry.server.js'

await initSentry()

const started = Date.now()
try {
  const { deleted, cutoff } = await pruneRawEvents()
  console.log(
    `[cartx][retention] deleted=${deleted} (older than ${cutoff.toISOString()}) ` +
    `in ${Date.now() - started}ms`,
  )
  await flushSentry()
  process.exit(0)
} catch (err) {
  console.error('[cartx][retention] fatal:', err)
  captureException(err, { tags: { job: 'retention' } })
  await flushSentry()
  process.exit(1)
}
