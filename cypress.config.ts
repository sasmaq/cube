import { defineConfig } from 'cypress'

export default defineConfig({
  // Wide enough for the desktop layout (Tailwind's lg breakpoint); phone tests set their own size.
  viewportWidth: 1280,
  viewportHeight: 800,
  // The results land in cypress/screenshots and cypress/videos when a test fails; both are git-ignored.
  e2e: {
    // `npm run test:e2e` builds the app and serves it here with `vite preview`.
    baseUrl: 'http://localhost:4173',
  },
  component: {
    // Mounts components through the app's own vite.config.ts, so Tailwind and the rest match the real build.
    devServer: { framework: 'react', bundler: 'vite' },
    specPattern: 'cypress/component/**/*.cy.{ts,tsx}',
  },
})
