import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cpSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pickPort } from './scripts/pick-port.mjs'

const projectRoot = dirname(fileURLToPath(import.meta.url))

function copyKnowledgeFiles(): Plugin {
  return {
    name: 'copy-knowledge-files',
    closeBundle() {
      const output = resolve('dist')
      cpSync(resolve('data'), resolve(output, 'data'), { recursive: true })
      cpSync(resolve('schemas'), resolve(output, 'schemas'), { recursive: true })
    },
  }
}

/**
 * Ports are derived from the project path rather than fixed: the same port on
 * every run for this checkout, a different one for every other, and anything
 * already listening is skipped. Override with `PORT=… npm run dev` or
 * `PREVIEW_PORT=… npm run preview`. See scripts/pick-port.mjs.
 */
export default defineConfig(async () => ({
  // Relative, not absolute: with a HashRouter the URL path never changes after
  // load, so one build serves correctly from the domain root, from a project
  // path like /guitar-tone-rig/ on GitHub Pages, and from file:// — which is
  // what README promises and what an absolute /assets/… would break.
  base: './',
  plugins: [react(), tailwindcss(), copyKnowledgeFiles()],
  server: {
    port: await pickPort({ seed: projectRoot, offset: 0, envVar: 'PORT' }),
    // The probe can lose a race with another process; let Vite move on rather
    // than refuse to start. It stays inside the same uncommon 20000-40000 band.
    strictPort: false,
  },
  preview: {
    port: await pickPort({ seed: projectRoot, offset: 1, envVar: 'PREVIEW_PORT' }),
    strictPort: false,
  },
}))
