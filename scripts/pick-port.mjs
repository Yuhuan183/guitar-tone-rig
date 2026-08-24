import { createHash } from 'node:crypto'
import { createServer } from 'node:net'

/**
 * Picks a dev-server port that is stable for this project but never collides.
 *
 * A fixed port is only ever free by luck, and Vite's default behaviour of
 * incrementing from 5173 lands on whatever the next project would have used.
 * Instead the base port is derived from the project path, so it is the same on
 * every run (bookmarks and proxy config keep working) and different for every
 * checkout, then probed so anything already listening is skipped.
 */

// Above the crowded 3000-9000 dev range, below the OS ephemeral range
// (49152-65535 on macOS and Linux), which the kernel hands out to outbound
// sockets and must not be squatted on.
const RANGE_START = 20000
const RANGE_SIZE = 20000
const MAX_PROBES = 64

/** Same input, same port — the point is stability across runs. */
export function basePort(seed, offset = 0) {
  const digest = createHash('sha256').update(String(seed)).digest()
  return RANGE_START + ((digest.readUInt32BE(0) + offset * 1013) % RANGE_SIZE)
}

/**
 * Binds with no host so the check covers every interface Vite might listen on;
 * a port free on 127.0.0.1 can still be held on ::1.
 */
export function isPortFree(port) {
  return new Promise((resolve) => {
    const server = createServer()
    server.once('error', () => resolve(false))
    server.once('listening', () => server.close(() => resolve(true)))
    server.listen(port)
  })
}

/**
 * @param {object} options
 * @param {string} options.seed       stable identity for this project
 * @param {number} [options.offset]   separates dev from preview
 * @param {string} [options.envVar]   explicit override, e.g. PORT=3000 npm run dev
 * @returns {Promise<number>} a free port, or 0 to let the OS choose
 */
export async function pickPort({ seed, offset = 0, envVar }) {
  const override = envVar ? Number(process.env[envVar]) : NaN
  if (Number.isInteger(override) && override >= 0 && override <= 65535) return override

  const start = basePort(seed, offset)
  for (let step = 0; step < MAX_PROBES; step += 1) {
    const candidate = RANGE_START + ((start - RANGE_START + step) % RANGE_SIZE)
    if (await isPortFree(candidate)) return candidate
  }
  // Everything nearby is taken; 0 asks the OS for any free port.
  return 0
}
