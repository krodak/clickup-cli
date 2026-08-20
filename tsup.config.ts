import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node22',
  clean: true,
  external: ['@resvg/resvg-js'],
  banner: {
    js: '#!/usr/bin/env node',
  },
})
