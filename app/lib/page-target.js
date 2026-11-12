// Page and customer targeting shared by the server (helpers.server.js
// re-exports these) and the storefront drawer bundle (esbuild follows the
// relative import). Keep it dependency-free: the drawer's instant progress bar
// must pick exactly the same milestones as the server's, or they pop in late.

/** Path without its query string. */
function cleanPath(path) {
  return String(path || '').split('?')[0]
}

/** True when an entry targeted at `handles` runs on `currentPath`. */
export function pageMatch(handles, currentPath) {
  if (!handles || handles.length === 0) return false
  if (handles.includes('/')) return true
  return handles.includes(cleanPath(currentPath))
}

/**
 * Entries that run on `currentPath`. When at least one entry targets this page
 * specifically, only those run; otherwise the "All pages" ('/') entries do.
 */
export function getActiveEntries(currentPath, allEntries) {
  const path = cleanPath(currentPath)
  const specific = allEntries.filter((e) =>
    (e.page_handles || []).some((h) => h !== '/' && h === path),
  )
  if (specific.length > 0) return specific
  return allEntries.filter((e) => (e.page_handles || []).includes('/'))
}

function normalizeTag(t) {
  return String(t).trim().toLowerCase()
}

/**
 * True when `customer` satisfies `rule.customer_tags` targeting.
 * - No targeting set → matches everyone (including guests).
 * - required_any → customer must carry at least one of these tags; a guest
 *   (no customer) therefore fails.
 * - excluded → customer must carry none of these tags; a guest passes.
 */
export function customerMatchesTags(rule, customer) {
  const target = rule?.customer_tags
  if (!target) return true
  const required = (target.required_any || []).map(normalizeTag).filter(Boolean)
  const excluded = (target.excluded || []).map(normalizeTag).filter(Boolean)
  const tags = (customer?.tags || []).map(normalizeTag)
  if (excluded.length && excluded.some((t) => tags.includes(t))) return false
  if (required.length && !required.some((t) => tags.includes(t))) return false
  return true
}

/**
 * Custom milestones set to "Only this milestone" that apply on this page.
 * Only page-targeted milestones qualify: an "All pages" milestone can't take
 * over every page. When this returns any, the bar shows only these and gift
 * offers + claim gifts pause on the page (gifts already in the cart stay).
 */
export function exclusiveMilestones(milestones, currentPath, customer) {
  const path = cleanPath(currentPath)
  return (milestones || []).filter(
    (m) =>
      m.enabled &&
      m.display === 'only_this' &&
      (m.page_handles || []).some((h) => h !== '/' && h === path) &&
      customerMatchesTags(m, customer),
  )
}

/** True when an "Only this milestone" milestone pauses offers on this page. */
export function offersPausedOnPage(config, currentPath, customer) {
  return exclusiveMilestones(config?.progress_bar?.visual_milestones, currentPath, customer).length > 0
}
