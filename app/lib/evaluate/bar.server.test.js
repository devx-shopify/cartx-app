import { describe, it, expect } from 'vitest'
import { buildBar } from './bar.server.js'

const claim = (id, threshold, type = 'price') => ({
  id, enabled: true, page_handles: ['/'],
  trigger: { type, threshold },
  bar: { show: true, label: id },
})
const milestone = (id, threshold, type) => ({
  id, enabled: true, page_handles: ['/'], label: id,
  trigger: { type, threshold },
})

function config({ claims = [], milestones = [], tierOrder = [] } = {}) {
  return {
    offers: [],
    claim_gifts: claims,
    progress_bar: { enabled: true, visual_milestones: milestones, tier_order: tierOrder },
  }
}

const ids = (bar) => bar.tiers.map((t) => t.id)

describe('buildBar milestone order', () => {
  it('orders a price bar by amount when nothing was reordered', () => {
    const bar = buildBar(config({ claims: [claim('c2000', 2000), claim('c799', 799), claim('c1200', 1200)] }), '/', 0, 0, '₹{{amount}}')
    expect(ids(bar)).toEqual(['c799', 'c1200', 'c2000'])
  })

  it('keeps price milestones before quantity ones on a mixed bar by default', () => {
    const cfg = config({ claims: [claim('c1200', 1200), claim('c799', 799)], milestones: [milestone('buy1', 1, 'quantity')] })
    expect(ids(buildBar(cfg, '/', 0, 0, '₹{{amount}}'))).toEqual(['c799', 'c1200', 'buy1'])
  })

  it('slots a milestone added after the order was saved in by amount', () => {
    const cfg = config({
      claims: [claim('c799', 799), claim('c1099', 1099), claim('c2000', 2000), claim('c1200', 1200)],
      milestones: [milestone('buy1', 1, 'quantity')],
      tierOrder: ['buy1', 'c799', 'c1099', 'c2000'],
    })
    expect(ids(buildBar(cfg, '/', 1498, 4, '₹{{amount}}'))).toEqual(['buy1', 'c799', 'c1099', 'c1200', 'c2000'])
  })

  it('keeps a saved order that puts a higher amount first', () => {
    const cfg = config({ claims: [claim('c799', 799), claim('c2000', 2000)], tierOrder: ['c2000', 'c799'] })
    expect(ids(buildBar(cfg, '/', 0, 0, '₹{{amount}}'))).toEqual(['c2000', 'c799'])
  })
})
