import { describe, it, expect } from 'vitest'
import { pageMatch, getActiveEntries, exclusiveMilestones, offersPausedOnPage } from './page-target.js'
import { buildBar } from './progress-bar.js'

const ms = (id, pages, extra = {}) => ({
  id, enabled: true, label: id, page_handles: pages,
  trigger: { type: 'quantity', threshold: 4 }, ...extra,
})
const claim = (id, threshold) => ({
  id, enabled: true, page_handles: ['/'],
  trigger: { type: 'price', threshold }, bar: { show: true, label: id },
})
const offer = (id, threshold, pages = ['/']) => ({
  id, enabled: true, page_handles: pages,
  trigger: { price_threshold: threshold },
  reward: { type: 'auto_add_gift', gift_variants: ['1'] },
  bar: { show: true, label: id },
})
const config = (milestones, extra = {}) => ({
  offers: [offer('o599', 599)],
  claim_gifts: [claim('c799', 799)],
  progress_bar: { enabled: true, visual_milestones: milestones, tier_order: [] },
  ...extra,
})
const ids = (bar) => bar.tiers.map((t) => t.id)
const B2G2 = '/collections/b2g2'

describe('page targeting', () => {
  it('matches exact paths and ignores query strings', () => {
    expect(pageMatch([B2G2], B2G2 + '?filter=x')).toBe(true)
    expect(pageMatch([B2G2], B2G2 + '/products/lip')).toBe(false)
    expect(pageMatch(['/'], '/anything')).toBe(true)
  })

  it('page-specific entries replace All-pages ones on that page', () => {
    const entries = [{ id: 'all', page_handles: ['/'] }, { id: 'b', page_handles: [B2G2] }]
    expect(getActiveEntries(B2G2, entries).map((e) => e.id)).toEqual(['b'])
    expect(getActiveEntries('/', entries).map((e) => e.id)).toEqual(['all'])
  })
})

describe('"Only this milestone"', () => {
  const only = ms('b2g2', [B2G2], { display: 'only_this' })

  it('is exclusive only on its own targeted page', () => {
    expect(exclusiveMilestones([only], B2G2).map((m) => m.id)).toEqual(['b2g2'])
    expect(exclusiveMilestones([only], '/')).toEqual([])
  })

  it('never applies to an All-pages milestone', () => {
    expect(exclusiveMilestones([ms('x', ['/'], { display: 'only_this' })], B2G2)).toEqual([])
  })

  it('ignores disabled and "with others" milestones', () => {
    expect(exclusiveMilestones([{ ...only, enabled: false }], B2G2)).toEqual([])
    expect(exclusiveMilestones([ms('w', [B2G2], { display: 'with_others' })], B2G2)).toEqual([])
  })

  it('respects customer tags', () => {
    const tagged = { ...only, customer_tags: { required_any: ['vip'] } }
    expect(exclusiveMilestones([tagged], B2G2, { tags: [] })).toEqual([])
    expect(exclusiveMilestones([tagged], B2G2, { tags: ['VIP'] })).toHaveLength(1)
  })

  it('pauses offers on its page only', () => {
    expect(offersPausedOnPage(config([only]), B2G2)).toBe(true)
    expect(offersPausedOnPage(config([only]), '/')).toBe(false)
    expect(offersPausedOnPage(config([]), B2G2)).toBe(false)
    expect(offersPausedOnPage({}, B2G2)).toBe(false)
  })

  it('bar shows only that milestone on its page', () => {
    const cfg = config([only, ms('m499', ['/'], { trigger: { type: 'price', threshold: 499 } })])
    expect(ids(buildBar(cfg, B2G2, 0, 0, '₹{{amount}}'))).toEqual(['b2g2'])
  })

  it('bar is unchanged elsewhere', () => {
    const cfg = config([only, ms('m499', ['/'], { trigger: { type: 'price', threshold: 499 } })])
    const other = ids(buildBar(cfg, '/', 0, 0, '₹{{amount}}'))
    expect(other).not.toContain('b2g2')
    expect(other).toEqual(expect.arrayContaining(['o599', 'c799', 'm499']))
  })

  it('"with others" keeps every milestone on the page', () => {
    const cfg = config([ms('b2g2', [B2G2]), ms('m499', ['/'], { trigger: { type: 'price', threshold: 499 } })])
    expect(ids(buildBar(cfg, B2G2, 0, 0, '₹{{amount}}'))).toEqual(expect.arrayContaining(['b2g2', 'o599', 'c799', 'm499']))
  })
})
