#!/usr/bin/env node
// Hourly rollup entry point. Run by Fly scheduled machines.
//   npm run rollup
import { rollupAllShops } from '../app/lib/rollup.server.js'

const started = Date.now()
try {
  const result = await rollupAllShops()
  console.log(
    `[cartx][rollup] done in ${Date.now() - started}ms — shops=${result.shops}, ` +
    `buckets=${result.totalBuckets}, failed=${result.totalFailed}`,
  )
  process.exit(result.totalFailed > 0 ? 1 : 0)
} catch (err) {
  console.error('[cartx][rollup] fatal:', err)
  process.exit(1)
}
