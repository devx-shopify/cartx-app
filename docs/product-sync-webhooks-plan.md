# Product / Collection data sync via webhooks

**Status:** P1 in progress (products). P2 (collections) lands with the upsell-rules initiative.
**Why:** cartx snapshots product data at *save* time (offer `gift_variant_data`, claim
`claimable_variant_data`, upsell products). Nothing re-syncs on product edits — there are
**no `products/*` / `collections/*` webhooks**. So a title/image/price change (or a deletion)
doesn't reflect until the merchant re-saves. This initiative keeps the snapshots fresh and,
critically, prevents a **deleted gift product from leaving a live-but-broken promotion**.

## Principle
- An **enabled** promotion must be fully valid (has a reward, etc.).
- If a change (product/variant **deletion**) makes an enabled promotion invalid, it is
  **auto-drafted** (`enabled = false`). The eval skips disabled promotions, so its bar/
  milestone/offer-card/claim section disappear automatically. The promotion is retained so
  the merchant can fix + re-enable.
- **Drafts may be incomplete.** Validation (`min 1` gift/claim variant) is enforced only when
  `enabled === true` (Zod `superRefine`). This is what lets the webhook park a broken offer as
  a draft instead of failing to save (and thus leaving it live).
- Temporary **out-of-stock is handled live** (drawer "Sold out" for upsells, eval skip for
  gifts) and must NOT auto-draft — a stockout should never silently kill a promotion.

## Design decisions
- **Re-fetch, don't parse payloads.** On a relevant webhook, re-fetch via `admin.graphql`
  (from `authenticate.webhook`'s admin client), reusing `fetchVariantData`. Consistent with
  save-time; avoids fiddly payload/variant-image parsing. Only runs when the product is
  actually referenced.
- **Snapshots carry `product_id`.** `products/delete` payloads are just `{ id }` (no variants),
  and offers reference *variant* ids — so we can't map a deleted product to offer variants
  without it. `fetchVariantData`/`enrichVariantData` now include `product_id` in each
  `gift_variant_data`/`claimable_variant_data` entry (upsells already store `product_id`).
  Backfilled lazily on `products/update`; a one-time re-enrich covers pre-existing data.
- **Reference lookup = scan the shop's ThemeConfigs.** A shop has few themes; scanning their
  JSON is cheap and portable. Add a `product_id → configs` index later only if volume needs it.
- **Fast no-op.** `products/update` is high-frequency; if the product isn't referenced in any
  config we return immediately.
- **Idempotent + non-blocking.** Re-fetch-and-overwrite; swallow + Sentry-report errors and
  return 200 (never loop Shopify retries) — matches `orders/create`.

## Webhooks
| Topic | Handler | Effect |
|---|---|---|
| `products/update` | `webhooks.products.update.jsx` | refresh title/image/price snapshots; backfill `product_id`; drop refs to variants no longer on the product (draft if invalidated) |
| `products/delete` | `webhooks.products.delete.jsx` | remove all refs to that `product_id`; draft invalidated promotions |
| `collections/update` (P2) | — | re-snapshot targeted collection's product-id set (upsell rules) |
| `collections/delete` (P2) | — | drop membership; disable rules targeting it |

## Product state → effect
A gift/claim product's `status` is treated as availability:
- **Deleted** → drop the refs; if that empties an enabled promotion ⇒ **auto-draft**.
- **Draft / Archived** (intentional takedown) → **auto-draft** the promotion (keep refs).
  This is **reversible**: re-publishing the product (→ ACTIVE) **auto-re-enables** any
  promotion *we* auto-drafted (tracked via `_auto_disabled`). A merchant's *manual* disable
  is never touched.
- **Active** → refresh title/image/price snapshots; drop refs to variants no longer on the
  product; re-enable if applicable.
- **Out of stock** (ACTIVE, inventory 0) → NOT drafted; handled live (drawer "Sold out" /
  eval skip) — a stockout must never silently kill a promotion.

Auto-drafted promotions get `_auto_disabled` + a `_needs_attention` message; the admin shows
a banner so the merchant knows why it went to draft.

**Known simplification:** if a *multi-gift* offer has ANY one of its gift products drafted,
the whole offer drafts (rather than just dropping that one gift and keeping the offer live on
its remaining gifts). Safe (never a broken storefront); refine later to per-gift availability
if needed.

## Files
- `app/lib/schemas.js` — `enabled`-conditional `superRefine`; optional `product_id` on
  variant-data entries.
- `app/lib/graphql.server.js` — `product_id` in `fetchVariantData`/`enrichVariantData`.
- `app/lib/config.server.js` — `listConfigs(shopId)`.
- `app/lib/product-sync.server.js` — refresh/remove + auto-draft logic.
- `app/routes/webhooks.products.update.jsx`, `webhooks.products.delete.jsx`.
- `shopify.app.toml` — 2 subscriptions (P2 adds 2 more).
- Admin promotion view — needs-attention banner.

## Deploy
Handler code → Fly (push). Webhook subscriptions → `shopify app deploy` (declarative). No new
scopes (`read_products` already granted).
