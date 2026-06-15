#!/usr/bin/env node
// Hourly rollup entry point. Run by Fly scheduled machines.
//   npm run rollup
import { rollupAllShops } from '../app/lib/rollup.server.js'
import { initSentry, captureException, flushSentry } from '../app/lib/sentry.server.js'

await initSentry()

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
  await flushSentry()
  process.exit(result.totalFailed > 0 ? 1 : 0)
} catch (err) {
  console.error('[cartx][rollup] fatal:', err)
  captureException(err, { tags: { job: 'rollup' } })
  await flushSentry()
  process.exit(1)
}
