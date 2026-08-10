import { defineConfig } from 'vitest/config'

// Unit tests for the app's plain-JS logic (drawer eval + server evaluators).
// Scoped to *.test.js under app/ so it never picks up the Shopify Function
// workspaces (those have their own vitest config + wasm build in `npm test`).
// A standalone config here also stops vitest from loading the react-router
// vite plugin. Run with `npm run test:unit`.
export default defineConfig({
  test: {
    include: ['app/**/*.test.js'],
    environment: 'node',
  },
})
