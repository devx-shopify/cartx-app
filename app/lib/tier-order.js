// =============================================================
// cartx — Progress bar milestone order
// Shared by the bar evaluator (bar.server.js) and Settings → Progress bar, so
// the admin list and the cart always show the same order.
//
// Default: by trigger amount, quantity milestones first, then price. A
// merchant may drag milestones into any order (tier_order); that order is kept
// as saved, even when it puts a higher amount first. Milestones missing from
// the saved order (added after it was saved) are slotted in by amount instead
// of being appended at the end.
// =============================================================

const TYPE_RANK = { quantity: 0, price: 1 }

function defaultTypeOf(t) {
  return t.type || t._trigger_type || t.trigger_type
}

function compareDefault(typeOf) {
  return (a, b) => {
    const ta = TYPE_RANK[typeOf(a)] ?? 2
    const tb = TYPE_RANK[typeOf(b)] ?? 2
    return ta - tb || Number(a.threshold) - Number(b.threshold)
  }
}

// The order with no manual arrangement: quantity by amount, then price by amount.
export function defaultTierOrder(tiers, typeOf = defaultTypeOf) {
  return tiers.slice().sort(compareDefault(typeOf))
}

// `tierOrder` is the saved list of ids. Returns a new array.
export function orderTiers(tiers, tierOrder, typeOf = defaultTypeOf) {
  if (!Array.isArray(tierOrder) || tierOrder.length === 0) return defaultTierOrder(tiers, typeOf)

  const byId = new Map(tiers.map((t) => [t.id, t]))
  const placed = []
  const seen = new Set()
  for (const id of tierOrder) {
    const t = byId.get(id)
    if (t && !seen.has(id)) {
      placed.push(t)
      seen.add(id)
    }
  }

  const unplaced = defaultTierOrder(tiers.filter((t) => !seen.has(t.id)), typeOf)
  for (const t of unplaced) {
    const type = typeOf(t)
    const amount = Number(t.threshold)
    // After the last milestone of the same kind with a lower or equal amount…
    let at = -1
    for (let i = 0; i < placed.length; i++) {
      if (typeOf(placed[i]) === type && Number(placed[i].threshold) <= amount) at = i + 1
    }
    // …else before the first of the same kind…
    if (at === -1) {
      const first = placed.findIndex((p) => typeOf(p) === type)
      if (first !== -1) at = first
    }
    // …else where its kind goes by default (quantity at the start, price at the end).
    if (at === -1) at = (TYPE_RANK[type] ?? 2) === 0 ? 0 : placed.length
    placed.splice(at, 0, t)
  }
  return placed
}

// Pairs of the same kind shown higher-amount-first, for the Settings note.
export function outOfAmountOrder(tiers, typeOf = defaultTypeOf) {
  const out = []
  for (let i = 0; i < tiers.length; i++) {
    for (let j = i + 1; j < tiers.length; j++) {
      const a = tiers[i]
      const b = tiers[j]
      if (typeOf(a) === typeOf(b) && Number(a.threshold) > Number(b.threshold)) out.push([a, b])
    }
  }
  return out
}

// True when `tiers` is already in the default order (ties in any order).
export function isDefaultTierOrder(tiers, typeOf = defaultTypeOf) {
  const cmp = compareDefault(typeOf)
  for (let i = 1; i < tiers.length; i++) {
    if (cmp(tiers[i - 1], tiers[i]) > 0) return false
  }
  return true
}
