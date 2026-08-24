import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { diffPreset, toRigPatch, toTuningSession } from '../export'
import { rig } from '../data'

const preset = rig.presets[0]

describe('diffPreset', () => {
  it('is empty when nothing was tuned locally', () => {
    expect(diffPreset(preset, {})).toEqual([])
  })

  it('reports the JSON recommendation as `before`, not what is on screen', () => {
    const [row] = diffPreset(preset, { [preset.id]: { cali76: { attack: '12:00' } } })
    expect(row).toMatchObject({ deviceId: 'cali76', controlId: 'attack', after: '12:00' })
    expect(row.beforeText).toBe('09:30–11:00')
    expect(row.before).toBe('10:30')
  })

  it('ignores overrides for devices and controls that no longer exist', () => {
    const rows = diffPreset(preset, {
      [preset.id]: { 'ghost-pedal': { x: 1 }, cali76: { no_such_control: 2 } },
    })
    expect(rows).toEqual([])
  })

  it('orders rows by the catalog, not by the order they were edited', () => {
    const rows = diffPreset(preset, {
      [preset.id]: { cali76: { release: '13:00', input: '11:00' } },
    })
    expect(rows.map((r) => r.controlId)).toEqual(['input', 'release'])
  })
})

describe('toRigPatch', () => {
  it('resets confidence, because a value tried in a browser has not been heard', () => {
    const diffs = diffPreset(preset, { [preset.id]: { cali76: { attack: '12:00' } } })
    const patch = toRigPatch(preset, diffs)
    expect(patch.settings.cali76).toEqual([
      { controlId: 'attack', value: '12:00', confidence: 'needs-calibration' },
    ])
  })

  it('groups by device', () => {
    const diffs = diffPreset(preset, {
      [preset.id]: { cali76: { attack: '12:00' }, 'uafx-ox-stomp': { room: '10:00' } },
    })
    expect(Object.keys(toRigPatch(preset, diffs).settings).sort()).toEqual(['cali76', 'uafx-ox-stomp'])
  })
})

describe('toTuningSession', () => {
  // A session is dated by the day the player was at the amp, so every
  // expectation below is only meaningful against a known local timezone.
  const hostTimeZone = process.env.TZ
  beforeEach(() => {
    process.env.TZ = 'Asia/Taipei'
  })
  afterEach(() => {
    process.env.TZ = hostTimeZone
  })

  it('produces a skeleton with the pairs filled and the judgement left blank', () => {
    const diffs = diffPreset(preset, { [preset.id]: { cali76: { attack: '12:00' } } })
    const session = toTuningSession(preset, diffs, new Date('2026-08-21T00:00:00Z'))
    expect(session).toMatchObject({
      id: `2026-08-21-${preset.id}`,
      date: '2026-08-21',
      presetId: preset.id,
      decision: 'inconclusive',
    })
    expect(session.changes[0]).toMatchObject({ before: '10:30', after: '12:00', reason: '' })
    expect(session.context).toEqual({ guitar: '', pickup: '', monitoring: '', volume: '' })
  })

  it('uses today when no date is given', () => {
    vi.setSystemTime(new Date('2030-01-02T00:00:00Z'))
    expect(toTuningSession(preset, []).date).toBe('2030-01-02')
    vi.useRealTimers()
  })

  it('dates a session by the local day it happened, not by UTC', () => {
    // 01:30 on the 25th in Taipei is still mid-morning on the 24th in
    // California. Reading the instant as UTC gets the Taipei case wrong.
    const at = new Date('2026-08-24T17:30:00Z')

    expect(toTuningSession(preset, [], at).date).toBe('2026-08-25')
    expect(toTuningSession(preset, [], at).id).toBe(`2026-08-25-${preset.id}`)

    process.env.TZ = 'America/Los_Angeles'
    expect(toTuningSession(preset, [], at).date).toBe('2026-08-24')
  })
})

describe('clipboard and download', () => {
  it('reports failure instead of throwing when the clipboard is denied', async () => {
    const { copyText } = await import('../export')
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
    expect(await copyText('x')).toBe(false)
    vi.unstubAllGlobals()
  })

  it('reports success when the clipboard accepts', async () => {
    const { copyText } = await import('../export')
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    expect(await copyText('payload')).toBe(true)
    expect(writeText).toHaveBeenCalledWith('payload')
    vi.unstubAllGlobals()
  })

  it('clicks an anchor that is in the document, and takes it out again', async () => {
    const { downloadText } = await import('../export')
    const createObjectURL = vi.fn().mockReturnValue('blob:x')
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL: vi.fn() })
    let connectedAtClick: boolean | undefined
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      // Firefox starts no download from a detached anchor, so this is the
      // difference between a working download and silence.
      connectedAtClick = this.isConnected
    })

    downloadText('rig-patch.json', '{}')

    expect(createObjectURL).toHaveBeenCalled()
    expect(connectedAtClick).toBe(true)
    expect(document.querySelector('a[download]')).toBeNull()
    click.mockRestore()
    vi.unstubAllGlobals()
  })

  it('keeps the blob url alive until the browser has had a chance to read it', async () => {
    const { downloadText } = await import('../export')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn().mockReturnValue('blob:x'), revokeObjectURL })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    downloadText('rig-patch.json', '{}')
    // Revoking in the same task can hand the browser a url that is already
    // gone, which downloads a 0-byte file or nothing at all.
    expect(revokeObjectURL).not.toHaveBeenCalled()

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:x')
    click.mockRestore()
    vi.unstubAllGlobals()
  })
})
