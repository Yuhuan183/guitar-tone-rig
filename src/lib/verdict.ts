import type { Evaluation } from '../types'

/**
 * The one place a verdict is worded. `short` is for a card in a list, `label`
 * for the device's own page — two lengths of the same judgement, not two
 * judgements. Its own module so both a page and a component can read it
 * without either exporting a constant alongside its components.
 *
 * TypeScript keeps the map exhaustive if the schema grows a fifth verdict.
 */
export const VERDICTS: Record<
  Evaluation['verdict'],
  { label: string; short: string; tone: 'accent' | 'muted' | 'warning' }
> = {
  adopt: { label: '接受，排進鏈上', short: '接受', tone: 'accent' },
  trial: { label: '值得借來試', short: '值得試', tone: 'accent' },
  hold: { label: '暫不加入', short: '暫不加入', tone: 'muted' },
  reject: { label: '排除', short: '排除', tone: 'warning' },
}
