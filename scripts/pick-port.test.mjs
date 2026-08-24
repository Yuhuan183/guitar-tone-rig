import { createServer } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { basePort, isPortFree, pickPort } from './pick-port.mjs'

const open = []
const occupy = (port) =>
  new Promise((resolve) => {
    const server = createServer()
    server.listen(port, () => {
      open.push(server)
      resolve(server)
    })
  })

afterEach(() => {
  for (const server of open.splice(0)) server.close()
  delete process.env.TEST_PORT
})

describe('basePort', () => {
  it('is stable for the same project', () => {
    expect(basePort('/a/b')).toBe(basePort('/a/b'))
  })

  it('differs between projects, so two checkouts do not collide', () => {
    expect(basePort('/a/b')).not.toBe(basePort('/a/c'))
  })

  it('separates dev from preview', () => {
    expect(basePort('/a/b', 0)).not.toBe(basePort('/a/b', 1))
  })

  it('stays clear of the crowded low range and the OS ephemeral range', () => {
    for (const seed of ['/a', '/b', '/c/d/e', 'x'.repeat(200)]) {
      for (const offset of [0, 1]) {
        const port = basePort(seed, offset)
        expect(port).toBeGreaterThanOrEqual(20000)
        expect(port).toBeLessThan(40000)
      }
    }
  })
})

describe('pickPort', () => {
  it('returns the base port when it is free', async () => {
    const seed = '/free/project'
    expect(await pickPort({ seed })).toBe(basePort(seed))
  })

  it('walks past ports that are already listening', async () => {
    const seed = '/busy/project'
    const base = basePort(seed)
    await occupy(base)
    await occupy(base + 1)
    expect(await pickPort({ seed })).toBe(base + 2)
  })

  it('honours an explicit override', async () => {
    process.env.TEST_PORT = '3123'
    expect(await pickPort({ seed: '/x', envVar: 'TEST_PORT' })).toBe(3123)
  })

  it('ignores an override that is not a usable port', async () => {
    process.env.TEST_PORT = 'not-a-port'
    expect(await pickPort({ seed: '/x', envVar: 'TEST_PORT' })).toBe(basePort('/x'))
  })
})

describe('isPortFree', () => {
  it('detects a port that is in use', async () => {
    const server = await occupy(basePort('/detect'))
    expect(await isPortFree(server.address().port)).toBe(false)
  })
})
