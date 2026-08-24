import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.mjs'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'src/components/pedal/**', 'scripts/pick-port.mjs'],
      exclude: ['src/lib/data.ts', 'src/lib/rig.ts', 'src/**/*.d.mts', 'src/test-setup.ts'],
      thresholds: { lines: 85, functions: 85, branches: 80 },
    },
  },
})
