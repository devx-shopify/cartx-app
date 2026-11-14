import { describe, it, expect } from 'vitest'
import { pageMatch, getActiveEntries, exclusiveMilestones, offersPausedOnPage, pageOnlyMilestones, pausedOnPage, targetsPage } from './page-target.js'
import { evaluateOffers } from './evaluate/triggers.server.js'
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

describe('"Only this page\'s promotions"', () => {
  const b1g1 = ms('b1g1', [B2G2], { display: 'page_only', trigger: { type: 'quantity', threshold: 2 } })
  const pageCfg = () =>
    config([b1g1, ms('m499', ['/'], { trigger: { type: 'price', threshold: 499 } })], {
      offers: [offer('o599', 599), offer('b2g3', 900, [B2G2]), offer('b3g3', 1200, [B2G2])],
      claim_gifts: [claim('c799', 799), { ...claim('c-page', 1500), page_handles: [B2G2] }],
    })

  it('applies only on its own targeted page', () => {
    expect(pageOnlyMilestones([b1g1], B2G2).map((m) => m.id)).toEqual(['b1g1'])
    expect(pageOnlyMilestones([b1g1], '/')).toEqual([])
    expect(pageOnlyMilestones([ms('x', ['/'], { display: 'page_only' })], B2G2)).toEqual([])
    expect(pageOnlyMilestones([{ ...b1g1, enabled: false }], B2G2)).toEqual([])
    expect(targetsPage(b1g1, B2G2 + '?page=1')).toBe(true)
  })

  it('respects customer tags', () => {
    const tagged = { ...b1g1, customer_tags: { required_any: ['vip'] } }
    expect(pageOnlyMilestones([tagged], B2G2, { tags: [] })).toEqual([])
    expect(pageOnlyMilestones([tagged], B2G2, { tags: ['vip'] })).toHaveLength(1)
  })

  it('bar shows every milestone, offer and claim gift targeted at the page', () => {
    const tiers = ids(buildBar(pageCfg(), B2G2, 0, 0, '₹{{amount}}'))
    expect(tiers.sort()).toEqual(['b1g1', 'b2g3', 'b3g3', 'c-page'])
  })

  it('includes page-targeted milestones whatever their display', () => {
    const cfg = pageCfg()
    cfg.progress_bar.visual_milestones.push(ms('w', [B2G2], { trigger: { type: 'quantity', threshold: 6 } }))
    expect(ids(buildBar(cfg, B2G2, 0, 0, '₹{{amount}}'))).toContain('w')
  })

  it('leaves other pages unchanged', () => {
    const tiers = ids(buildBar(pageCfg(), '/', 0, 0, '₹{{amount}}'))
    expect(tiers).not.toContain('b1g1')
    expect(tiers).toContain('o599')
  })

  it('pauses only the gift offers / claims not targeted at the page', () => {
    const isPaused = pausedOnPage(pageCfg(), B2G2)
    expect(isPaused(offer('o599', 599))).toBe(true)
    expect(isPaused(offer('b2g3', 900, [B2G2]))).toBe(false)
    expect(offersPausedOnPage(pageCfg(), B2G2)).toBe(false)
    expect(pausedOnPage(pageCfg(), '/')(offer('o599', 599))).toBe(false)
  })

  it('"Only this milestone" still pauses everything and wins over page-only', () => {
    const cfg = pageCfg()
    cfg.progress_bar.visual_milestones.push(ms('solo', [B2G2], { display: 'only_this' }))
    expect(pausedOnPage(cfg, B2G2)(offer('b2g3', 900, [B2G2]))).toBe(true)
    expect(ids(buildBar(cfg, B2G2, 0, 0, '₹{{amount}}'))).toEqual(['solo'])
  })

  it('server adds gifts for page-targeted offers on that page', () => {
    const cart = { items: [], total_price: 100000, item_count: 4 }
    const offers = pageCfg().offers.map((o) => ({ ...o, reward: { ...o.reward, add_mode: 'auto' } }))
    const run = (cfg) => evaluateOffers(offers, cart, 100000, 4, B2G2, null, { paused: pausedOnPage(cfg, B2G2) })
    expect(run(pageCfg()).to_add.length).toBeGreaterThan(0)
    const solo = pageCfg()
    solo.progress_bar.visual_milestones.push(ms('solo', [B2G2], { display: 'only_this' }))
    expect(run(solo).to_add).toEqual([])
  })
})

describe('"With others" next to page-specific offers', () => {
  it('keeps a milestone targeted at the page', () => {
    const cfg = config([ms('b1g1', [B2G2]), ms('m499', ['/'], { trigger: { type: 'price', threshold: 499 } })], {
      offers: [offer('b2g3', 900, [B2G2])],
    })
    const tiers = ids(buildBar(cfg, B2G2, 0, 0, '₹{{amount}}'))
    expect(tiers).toContain('b1g1')
    expect(tiers).toContain('b2g3')
    expect(tiers).not.toContain('m499')
  })
})
