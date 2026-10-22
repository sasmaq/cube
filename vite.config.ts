import { readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

/**
 * Makes `vite preview` answer like the live site: a path with no file behind it gets 404.html with a
 * 404 status, where Vite on its own would serve the app.
 */
function notFoundPage(): Plugin {
  return {
    name: 'not-found-page',
    configurePreviewServer({ config, middlewares }) {
      const outDir = resolve(config.root, config.build.outDir)
      middlewares.use((req, res, next) => {
        const { pathname } = new URL(req.url ?? '/', 'http://localhost')
        const file = join(outDir, decodeURIComponent(pathname), pathname.endsWith('/') ? 'index.html' : '')
        if (statSync(file, { throwIfNoEntry: false })?.isFile()) return next()
        res.statusCode = 404
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(readFileSync(join(outDir, '404.html')))
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), notFoundPage()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  build: {
    chunkSizeWarningLimit: 900,
    rolldownOptions: {
      input: [fileURLToPath(new URL('./index.html', import.meta.url)), fileURLToPath(new URL('./404.html', import.meta.url))],
      output: {
        codeSplitting: {
          groups: [{ name: 'three', test: /node_modules[\\/]three/ }],
        },
      },
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    // Tests that need a DOM opt in with a `// @vitest-environment jsdom` comment.
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx', 'src/notFound.tsx', 'src/vite-env.d.ts'],
      // json-summary feeds the coverage table in CI's job summary.
      reporter: ['text', 'html', 'json-summary'],
    },
  },
})
