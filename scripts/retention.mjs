#!/usr/bin/env node
// Daily retention entry point. Deletes raw AnalyticsEvent rows older than 90
// days. DailyStats is kept indefinitely.
//   npm run retention
import { pruneRawEvents } from '../app/lib/rollup.server.js'

const started = Date.now()
try {
  const { deleted, cutoff } = await pruneRawEvents()
  console.log(
    `[cartx][retention] deleted=${deleted} (older than ${cutoff.toISOString()}) ` +
    `in ${Date.now() - started}ms`,
  )
  process.exit(0)
} catch (err) {
  console.error('[cartx][retention] fatal:', err)
  process.exit(1)
}
