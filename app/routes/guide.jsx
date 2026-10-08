import MarketingShell, { TOKENS, FONT_STACK, HEADING_FONT } from "../components/MarketingShell.jsx";

export const meta = () => [
  { title: "User Guide — cartx" },
  { name: "description", content: "Step-by-step guide to setting up every cartx feature: offers, coupons, claim gifts, upsells, the progress bar, and the cart drawer." },
];

const SECTIONS = [
  { id: "getting-started", label: "Getting started" },
  { id: "promotions", label: "Promotions overview" },
  { id: "offers", label: "Create an offer" },
  { id: "coupons", label: "Create a coupon" },
  { id: "claim-gifts", label: "Create a claim gift" },
  { id: "customize", label: "Customize the cart" },
  { id: "progress-bar", label: "Progress bar & milestones" },
  { id: "upsells", label: "Upsells" },
  { id: "ribbon", label: "Bottom ribbon" },
  { id: "settings", label: "Settings & behavior" },
  { id: "themes", label: "Multiple themes" },
  { id: "analytics", label: "Analytics & plans" },
  { id: "troubleshooting", label: "Troubleshooting" },
];

export default function Guide() {
  return (
    <MarketingShell>
      <article style={{
        maxWidth: 760,
        margin: '0 auto',
        padding: '64px 24px',
        fontFamily: FONT_STACK,
        color: TOKENS.darkGrey,
      }}>
        <header style={{ marginBottom: 32 }}>
          <h1 style={{
            fontFamily: HEADING_FONT,
            fontSize: 56,
            fontWeight: 400,
            color: TOKENS.nearBlack,
            margin: '0 0 12px',
            letterSpacing: -1,
            lineHeight: 1.1,
          }}>User Guide</h1>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: TOKENS.midGrey, margin: 0 }}>
            cartx replaces your store&apos;s cart with a fast, fully-branded slide-out
            drawer and layers promotions on top of it — free gifts, claimable gifts,
            volume discounts, bundles, upsells, coupons, and a rewards progress bar.
            This guide walks through creating and configuring every feature.
          </p>
        </header>

        {/* Table of contents */}
        <nav style={{
          background: TOKENS.bgAlt,
          border: `1px solid ${TOKENS.borderGrey}`,
          borderRadius: 10,
          padding: '20px 24px',
          marginBottom: 44,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: TOKENS.mutedGrey,
            textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12,
          }}>On this page</div>
          <ol style={{ margin: 0, paddingLeft: 20, columns: 2, columnGap: 32, fontSize: 14, lineHeight: 1.9 }}>
            {SECTIONS.map((s) => (
              <li key={s.id} style={{ breakInside: 'avoid' }}>
                <a href={`#${s.id}`} style={tocLinkStyle}>{s.label}</a>
              </li>
            ))}
          </ol>
        </nav>

        <Callout tone="warning">
          Everything you configure is saved <Strong>per theme</Strong>. Changes apply to
          the theme selected in the theme switcher (top-right on the app&apos;s Home page).
          To move a full setup to another theme, use “Copy from another theme” on the
          Settings page.
        </Callout>

        {/* ── 1. Getting started ─────────────────────────── */}
        <Section id="getting-started" n="1" title="Getting started">
          <Ol items={[
            <>On the app&apos;s Home page, enable the cartx app embed in your theme when prompted — this activates the drawer on your storefront.</>,
            <>Use the theme switcher (top-right on Home) to pick the theme you want to configure.</>,
            <>Style the drawer under <Strong>Customize Cart</Strong>, then create your first promotion under <Strong>Promotions</Strong>.</>,
            <>Open your storefront and add a product to the cart to preview the drawer live.</>,
          ]} />
          <Callout>
            If the drawer doesn&apos;t appear on the storefront, the app embed is likely
            off for that theme — re-check step 1 for the correct theme.
          </Callout>
        </Section>

        {/* ── 2. Promotions overview ─────────────────────── */}
        <Section id="promotions" n="2" title="Promotions — the three types">
          <P>
            All promotions are created from <Strong>Promotions → Create promotion</Strong>,
            where you choose one of three types:
          </P>
          <Ul items={[
            <><Strong>Offer</Strong> — auto-add a free gift, bundle, or volume discount when the cart hits a total or item-count threshold.</>,
            <><Strong>Coupon</Strong> — surface a Shopify discount code inside the cart so customers don&apos;t have to hunt for it at checkout.</>,
            <><Strong>Claim Gift</Strong> — let customers choose a free gift once the cart reaches a threshold.</>,
          ]} />
        </Section>

        {/* ── 3. Create an Offer ─────────────────────────── */}
        <Section id="offers" n="3" title="Create an offer">
          <P>
            Offers reward a cart automatically. Go to <Strong>Promotions → Create
            promotion → Offer</Strong>, name it, then pick a <Strong>Reward type</Strong>.
          </P>

          <Sub title="Auto-add free gift" />
          <Ol items={[
            <>Reward type → <em>Auto-add free gift</em>. Select the gift variant(s) and quantity per variant.</>,
            <>Add mode → <em>Auto add to cart</em> (drops the gift in automatically) or <em>Show offer card only</em> (customer taps to add).</>,
            <>Set the trigger (below) that unlocks the gift.</>,
          ]} />

          <Sub title="Bundle" />
          <Ol items={[
            <>Reward type → <em>Bundle</em>. Choose the variants that make up the bundle.</>,
            <>Set the minimum offer quantity required for the bundle to apply.</>,
          ]} />

          <Sub title="Volume discount" />
          <Ol items={[
            <>Reward type → <em>Volume discount</em>. Choose discount mode: fixed total or percentage.</>,
            <>Add tiers — e.g. buy 3 → 10% off, buy 5 → 20% off — each with a quantity and value.</>,
            <>Optionally set “apply discount to” (highest / lowest priced first), a max cart quantity, and a max discount amount.</>,
          ]} />

          <Sub title="Trigger & targeting (all offer types)" />
          <Ol items={[
            <><Strong>What does this offer apply to?</Strong> — Entire cart, specific products, or a collection.</>,
            <><Strong>Trigger type</Strong> — cart total (price) or item count (quantity), plus the threshold value.</>,
            <><Strong>Pages</Strong> — choose which storefront pages the offer is active on.</>,
            <><Strong>Customer tags</Strong> (optional) — limit the offer to customers with certain tags, or exclude tags.</>,
            <><Strong>Show on progress bar</Strong> (optional) — add a bar label / message so the offer appears in the rewards bar.</>,
          ]} />
          <Callout>
            Volume discounts and free-gift discounts are powered by Shopify Functions —
            cartx creates and syncs the underlying discount for you when you save.
          </Callout>
        </Section>

        {/* ── 4. Create a Coupon ─────────────────────────── */}
        <Section id="coupons" n="4" title="Create a coupon">
          <Ol items={[
            <>Promotions → Create promotion → <em>Coupon</em>.</>,
            <>Enter the Shopify discount code and a title / type label shown in the cart.</>,
            <>Optionally mark it automatic so it applies without the customer typing it.</>,
            <>Set an optional display message and a trigger (quantity or cart total) for when it appears.</>,
            <>Choose the pages and customer tags it targets, then save.</>,
          ]} />
          <Callout>
            The code must already exist as a Shopify discount. cartx links to it and
            surfaces it in the cart — it doesn&apos;t replace Shopify&apos;s discount engine.
          </Callout>
        </Section>

        {/* ── 5. Create a Claim Gift ─────────────────────── */}
        <Section id="claim-gifts" n="5" title="Create a claim gift">
          <Ol items={[
            <>Promotions → Create promotion → <em>Claim gift</em>.</>,
            <>Set the trigger — cart total (price) or item count (quantity) — and its threshold.</>,
            <>Add the claimable gift variant(s) the customer can choose from.</>,
            <>Set a section heading (e.g. “Pick your free gift”) and an optional maximum number of claims.</>,
            <>Choose pages / customer tags and, optionally, show it on the progress bar. Save.</>,
          ]} />
          <Callout>
            Difference vs. an auto-add gift: a claim gift lets the customer <Strong>choose</Strong> which
            freebie to add; an auto-add offer drops a specific gift in for them.
          </Callout>
        </Section>

        {/* ── 6. Customize the cart ──────────────────────── */}
        <Section id="customize" n="6" title="Customize the cart drawer">
          <P>
            All visual styling lives under <Strong>Customize Cart</Strong>, organized into
            collapsible sections:
          </P>
          <Ul items={[
            <><Strong>Colors</Strong> — primary, background, text, accents, overlay opacity.</>,
            <><Strong>Typography, Shape & Drawer</Strong> — font sizes, corner radius, button style, drawer width and position.</>,
            <><Strong>Cart items</Strong> — image style/size, density, quantity controls, compare-at price, variant switcher, vendor, remove button.</>,
            <><Strong>Cart copy & Empty cart</Strong> — every heading, button label, and helper text, plus the empty-cart state.</>,
            <><Strong>Section visibility</Strong> — turn coupons, upsells, progress bar, ribbon, and gifts on/off and reorder them.</>,
            <><Strong>Progress bar, Announcement bar, Upsells, Confetti</Strong> — per-element styling.</>,
            <><Strong>Open &amp; close, Animation, Checkout button</Strong> — drawer behavior and animation.</>,
            <><Strong>Custom CSS</Strong> — advanced overrides. <Strong>Backup &amp; restore</Strong> — export/import a config. <Strong>Danger zone</Strong> — reset.</>,
          ]} />
        </Section>

        {/* ── 7. Progress bar ────────────────────────────── */}
        <Section id="progress-bar" n="7" title="Progress bar & milestones">
          <P>
            The progress bar shows customers how close they are to the next reward.
            Rewards from offers and claim gifts appear automatically when you enable
            “Show on progress bar”. You can also add purely visual milestones.
          </P>
          <Ol items={[
            <>Settings → <Strong>Progress bar</Strong> — enable it and set the all-complete message.</>,
            <>Add visual milestones with a threshold (price or quantity), label, and icon.</>,
            <>Style the bar (thickness, icons, badge colors) under Customize Cart → Progress bar.</>,
          ]} />
        </Section>

        {/* ── 8. Upsells ─────────────────────────────────── */}
        <Section id="upsells" n="8" title="Upsells">
          <Ol items={[
            <>Settings → <Strong>Upsells</Strong> — enable and set the heading (e.g. “You may also like”).</>,
            <>Add products to recommend. cartx stores each product so it can show live price and availability.</>,
            <>Choose whether upsells show on an empty cart.</>,
            <>Style card layout and size under Customize Cart → Upsells.</>,
          ]} />
          <Callout>
            If an upsell product is sold out, cartx automatically shows a “Sold out” state
            instead of the add button.
          </Callout>
        </Section>

        {/* ── 9. Bottom ribbon ───────────────────────────── */}
        <Section id="ribbon" n="9" title="Bottom ribbon">
          <P>
            The bottom ribbon is a persistent message strip at the base of the drawer —
            useful for shipping notices or an out-of-stock message.
          </P>
          <Ol items={[
            <>Settings → <Strong>Bottom ribbon</Strong> — enable it.</>,
            <>Optionally set an out-of-stock message override.</>,
          ]} />
        </Section>

        {/* ── 10. Settings & behavior ────────────────────── */}
        <Section id="settings" n="10" title="Settings & behavior">
          <Ul items={[
            <><Strong>Cross-page gift removal</Strong> — decide what happens to an auto-added gift when the customer leaves the page that unlocked it: remove silently, show a notice, or show a confirmation modal. (Claimed items are never removed.)</>,
            <><Strong>Copy from another theme</Strong> — clone a full setup (offers, coupons, gifts, drawer design, progress bar, upsells, ribbon) from one theme into the current one.</>,
          ]} />
        </Section>

        {/* ── 11. Multiple themes ────────────────────────── */}
        <Section id="themes" n="11" title="Working with multiple themes">
          <P>
            Because config is stored per theme, a brand-new or duplicated theme starts
            empty. To roll out an existing setup:
          </P>
          <Ol items={[
            <>On Home, switch the theme switcher to the target (new) theme.</>,
            <>Go to Settings → <Strong>Copy from another theme</Strong>, pick the source theme, and choose “Copy everything”.</>,
            <>Review anything theme-specific, then publish the theme.</>,
          ]} />
        </Section>

        {/* ── 12. Analytics & Plans ──────────────────────── */}
        <Section id="analytics" n="12" title="Analytics & plans">
          <P>
            <Strong>Analytics</Strong> tracks how each promotion performs — impressions,
            adds, and revenue — so you can see what&apos;s working. <Strong>Plans</Strong> is
            where you review and upgrade your cartx subscription.
          </P>
        </Section>

        {/* ── Troubleshooting ────────────────────────────── */}
        <Section id="troubleshooting" n="" title="Troubleshooting">
          <Ul items={[
            <><Strong>Drawer not showing</Strong> → the app embed is off for that theme (Home → enable it).</>,
            <><Strong>A promotion isn&apos;t firing</Strong> → check its Pages targeting and that the cart meets the trigger threshold.</>,
            <><Strong>New theme is empty</Strong> → config is per-theme; copy from your live theme via Settings.</>,
            <><Strong>A gift or discount looks off</Strong> → open the cart on the storefront to preview; discounts sync when you save the promotion.</>,
          ]} />
        </Section>
      </article>
    </MarketingShell>
  );
}

/* ── Presentational helpers (mirrors privacy.jsx) ─────────────── */

function Section({ id, n, title, children }) {
  return (
    <section id={id} style={{ marginBottom: 44, scrollMarginTop: 80 }}>
      <h2 style={{
        fontFamily: HEADING_FONT,
        fontSize: 32,
        fontWeight: 400,
        color: TOKENS.nearBlack,
        margin: '0 0 16px',
        letterSpacing: -0.4,
        lineHeight: 1.2,
      }}>{n ? `${n}. ` : ''}{title}</h2>
      {children}
    </section>
  );
}

function Sub({ title }) {
  return (
    <h3 style={{
      fontSize: 14,
      fontWeight: 700,
      color: TOKENS.darkGrey,
      margin: '24px 0 8px',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    }}>{title}</h3>
  );
}

function P({ children }) {
  return (
    <p style={{ fontSize: 15, lineHeight: 1.7, color: TOKENS.darkGrey, margin: '0 0 12px' }}>
      {children}
    </p>
  );
}

function Ul({ items }) {
  return (
    <ul style={{ margin: '0 0 12px', paddingLeft: 22, fontSize: 15, lineHeight: 1.7, color: TOKENS.darkGrey }}>
      {items.map((item, i) => <li key={i} style={{ marginBottom: 8 }}>{item}</li>)}
    </ul>
  );
}

function Ol({ items }) {
  return (
    <ol style={{ margin: '0 0 12px', paddingLeft: 22, fontSize: 15, lineHeight: 1.7, color: TOKENS.darkGrey }}>
      {items.map((item, i) => <li key={i} style={{ marginBottom: 8, paddingLeft: 4 }}>{item}</li>)}
    </ol>
  );
}

function Strong({ children }) {
  return <strong style={{ color: TOKENS.nearBlack, fontWeight: 700 }}>{children}</strong>;
}

function Callout({ children, tone }) {
  const warning = tone === "warning";
  return (
    <div style={{
      background: warning ? '#FFF8E6' : TOKENS.tealWash,
      border: `1px solid ${warning ? '#F3E2B3' : TOKENS.tealLight}`,
      borderRadius: 10,
      padding: '14px 18px',
      margin: '0 0 24px',
      fontSize: 14,
      lineHeight: 1.65,
      color: TOKENS.darkGrey,
    }}>
      <span style={{ marginRight: 8 }}>{warning ? '⚠️' : '💡'}</span>
      {children}
    </div>
  );
}

const tocLinkStyle = {
  color: TOKENS.teal,
  textDecoration: 'none',
};
