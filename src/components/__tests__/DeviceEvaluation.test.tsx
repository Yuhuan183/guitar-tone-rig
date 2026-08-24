import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ChainEvaluation, ComparisonTable } from '../DeviceEvaluation'
import { catalog, guides, referenceDevices } from '../../lib/rig'
import type { Comparison, Evaluation } from '../../types'

const draw = (node: React.ReactNode) => render(<MemoryRouter>{node}</MemoryRouter>)

const comparisons: Comparison[] = [
  { deviceId: 'petla-ive', shared: '同一級', differs: '中頻導向', chooseWhen: '要緊實時' },
  { deviceId: 'ghost-pedal', shared: 's', differs: 'd', chooseWhen: 'c' },
]

const evaluation: Evaluation = {
  placements: [{ role: 'Boost', chain: 'Cali76 → X → IR-D', verdict: '可行但重疊。' }],
  overlaps: ['notadumble-v2'],
  verdict: 'hold',
  rationale: '工作已經有人做了。',
  tradeoffs: ['多一段 Hiss'],
}

describe('ComparisonTable', () => {
  it('links the device it compares against instead of retyping the model name', () => {
    draw(<ComparisonTable model="Jan Ray" comparisons={[comparisons[0]]} />)
    expect(screen.getByRole('link', { name: 'Ive' }).getAttribute('href')).toBe('/devices/petla-ive')
  })

  it('falls back to the raw id rather than crashing on a device the catalog dropped', () => {
    draw(<ComparisonTable model="Jan Ray" comparisons={comparisons} />)
    expect(screen.getByText('ghost-pedal').tagName).toBe('SPAN')
    expect(screen.queryByRole('link', { name: 'ghost-pedal' })).toBeNull()
  })
})

describe('ChainEvaluation', () => {
  it('states the verdict, the position, the overlap and the cost', () => {
    draw(<ChainEvaluation model="X" evaluation={evaluation} />)
    expect(screen.getByText('暫不加入')).toBeTruthy()
    expect(screen.getByText('Cali76 → X → IR-D')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'NOTADÜMBLË V2' }).getAttribute('href')).toBe(
      '/devices/notadumble-v2',
    )
    expect(screen.getByText('多一段 Hiss')).toBeTruthy()
  })

  it('says so plainly when nothing on the chain overlaps, rather than hiding the card', () => {
    const bare: Evaluation = {
      placements: [{ chain: 'A → B', verdict: 'ok' }],
      verdict: 'adopt',
      rationale: 'y',
    }
    draw(<ChainEvaluation model="X" evaluation={bare} />)
    expect(screen.getByText(/沒有和鏈上任何一級重疊/)).toBeTruthy()
    expect(screen.getByText('唯一考慮的位置')).toBeTruthy()
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })
})

describe('the real catalog', () => {
  it('gives every reference device an evaluation to render', () => {
    expect(referenceDevices.length).toBeGreaterThan(0)
    for (const device of referenceDevices) {
      expect(guides.guides[device.id]?.evaluation).toBeDefined()
    }
  })

  it('never puts an evaluation on a device that is already on the chain', () => {
    for (const device of catalog.devices) {
      if (device.placement === 'chain') expect(guides.guides[device.id]?.evaluation).toBeUndefined()
    }
  })
})
