import { redirect, Form, useLoaderData } from "react-router";
import { login } from "../../shopify.server";
import MarketingShell, { TOKENS, FONT_STACK, HEADING_FONT, HashLink } from "../../components/MarketingShell.jsx";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }
  return { showForm: Boolean(login) };
};

const FEATURES = [
  {
    title: "Progress bar & milestones",
    body: "Reward customers as they spend more — free shipping at $50, free gift at $75, 10% off at $100. Multiple tiers, mixed price/quantity triggers.",
  },
  {
    title: "Free gift offers",
    body: "Auto-add gifts when thresholds are met, or let customers pick from a gift selector. Removed automatically if the cart drops below.",
  },
  {
    title: "Upsell recommendations",
    body: "Curate products that appear in the drawer. Hide what's already in the cart. Convert higher AOV with one-click adds.",
  },
  {
    title: "Discount codes in cart",
    body: "Customers apply coupons without leaving the drawer. Show every available code in a slide-in side panel.",
  },
  {
    title: "Drawer customizer",
    body: "Colors, typography, copy, layout, animations — all configurable. Live preview as you edit, no theme code needed.",
  },
  {
    title: "Volume discounts",
    body: "Buy more, save more — tiered pricing applied automatically in the drawer with discount badges on line items.",
  },
];

const STEPS = [
  { n: 1, title: "Install in one click", body: "Add cartx from the Shopify App Store. Enable the app embed in your theme — no code edits." },
  { n: 2, title: "Set milestones & offers", body: "Define progress tiers, free gifts, and upsells in the admin. Target by page or audience." },
  { n: 3, title: "Customize the drawer", body: "Match your brand using the live customizer — colors, typography, copy, layout." },
  { n: 4, title: "Launch & track", body: "Publish to your live theme. Customers see the new drawer instantly, even on the cart-add path." },
];

const STATS = [
  { value: "+18%", label: "Avg. cart value lift" },
  { value: "<50ms", label: "Drawer open latency" },
  { value: "0 lines", label: "Theme code to write" },
];

export default function Index() {
  const { showForm } = useLoaderData();

  return (
    <MarketingShell>
      {/* Hero */}
      <section style={{
        padding: '88px 24px 72px',
        textAlign: 'center',
        background: `linear-gradient(180deg, ${TOKENS.tealWash} 0%, ${TOKENS.white} 100%)`,
      }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            background: TOKENS.tealLight,
            color: TOKENS.tealDark,
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
            marginBottom: 24,
            letterSpacing: 0.2,
          }}>
            Premium cart drawer for Shopify
          </div>
          <h1 style={{
            fontFamily: HEADING_FONT,
            fontSize: 72,
            lineHeight: 1.05,
            fontWeight: 400,
            color: TOKENS.nearBlack,
            margin: '0 0 20px',
            letterSpacing: -1.5,
          }}>
            Turn the cart drawer into your highest-converting surface
          </h1>
          <p style={{
            fontFamily: HEADING_FONT,
            fontSize: 22,
            lineHeight: 1.45,
            color: TOKENS.midGrey,
            margin: '0 auto 36px',
            maxWidth: 640,
            fontStyle: 'italic',
          }}>
            cartx replaces your store's cart drawer with a premium experience —
            progress milestones, free gift offers, upsells, and discount codes —
            all configurable without touching theme code.
          </p>

          {showForm && (
            <Form method="post" action="/auth/login" style={{
              display: 'flex',
              gap: 8,
              maxWidth: 460,
              margin: '0 auto 16px',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}>
              <input
                name="shop"
                type="text"
                placeholder="your-store.myshopify.com"
                required
                style={{
                  flex: '1 1 240px',
                  padding: '12px 16px',
                  fontSize: 14,
                  fontFamily: FONT_STACK,
                  border: `1px solid ${TOKENS.borderGrey}`,
                  borderRadius: 8,
                  outline: 'none',
                  background: TOKENS.white,
                  color: TOKENS.darkGrey,
                }}
              />
              <button type="submit" style={primaryBtnStyle}>
                Install on Shopify
              </button>
            </Form>
          )}
          <HashLink hash="features" style={{
            display: 'inline-block',
            marginTop: 8,
            fontSize: 14,
            color: TOKENS.midGrey,
            textDecoration: 'none',
            fontWeight: 500,
          }}>
            See how it works ↓
          </HashLink>

          {/* Stats */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 56,
            marginTop: 64,
            flexWrap: 'wrap',
          }}>
            {STATS.map((s) => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: TOKENS.teal,
                  lineHeight: 1,
                  marginBottom: 6,
                }}>{s.value}</div>
                <div style={{
                  fontSize: 13,
                  color: TOKENS.midGrey,
                  fontWeight: 500,
                }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: '80px 24px', background: TOKENS.white }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={sectionHeadingStyle}>Everything your cart drawer should do</h2>
            <p style={sectionSubStyle}>
              Six features that pay for the app in the first month.
            </p>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20,
          }}>
            {FEATURES.map((f) => (
              <div key={f.title} style={{
                padding: 24,
                background: TOKENS.bgAlt,
                border: `1px solid ${TOKENS.borderGrey}`,
                borderRadius: 12,
              }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: TOKENS.tealWash,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}>
                  <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: TOKENS.teal,
                  }} />
                </div>
                <h3 style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: TOKENS.nearBlack,
                  margin: '0 0 8px',
                }}>{f.title}</h3>
                <p style={{
                  fontSize: 14,
                  color: TOKENS.midGrey,
                  margin: 0,
                  lineHeight: 1.55,
                }}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" style={{ padding: '80px 24px', background: TOKENS.bgAlt }}>
        <div style={{ maxWidth: 880, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={sectionHeadingStyle}>From install to live in under 10 minutes</h2>
            <p style={sectionSubStyle}>No theme code, no engineering required.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {STEPS.map((s) => (
              <div key={s.n} style={{
                display: 'flex',
                gap: 20,
                alignItems: 'flex-start',
                padding: 24,
                background: TOKENS.white,
                border: `1px solid ${TOKENS.borderGrey}`,
                borderRadius: 12,
              }}>
                <div style={{
                  flexShrink: 0,
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  background: TOKENS.teal,
                  color: TOKENS.white,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 14,
                }}>{s.n}</div>
                <div>
                  <h3 style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: TOKENS.nearBlack,
                    margin: '0 0 6px',
                  }}>{s.title}</h3>
                  <p style={{
                    fontSize: 14,
                    color: TOKENS.midGrey,
                    margin: 0,
                    lineHeight: 1.55,
                  }}>{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      {showForm && (
        <section style={{ padding: '80px 24px', background: TOKENS.white }}>
          <div style={{
            maxWidth: 720,
            margin: '0 auto',
            textAlign: 'center',
            padding: '56px 32px',
            background: TOKENS.tealWash,
            border: `1px solid ${TOKENS.tealLight}`,
            borderRadius: 16,
          }}>
            <h2 style={{
              ...sectionHeadingStyle,
              fontSize: 32,
              marginBottom: 12,
            }}>Ready to ship a better cart?</h2>
            <p style={{ ...sectionSubStyle, marginBottom: 28 }}>
              Install cartx and have your new cart drawer live in minutes.
            </p>
            <Form method="post" action="/auth/login" style={{
              display: 'flex',
              gap: 8,
              maxWidth: 460,
              margin: '0 auto',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}>
              <input
                name="shop"
                type="text"
                placeholder="your-store.myshopify.com"
                required
                style={{
                  flex: '1 1 240px',
                  padding: '12px 16px',
                  fontSize: 14,
                  fontFamily: FONT_STACK,
                  border: `1px solid ${TOKENS.borderGrey}`,
                  borderRadius: 8,
                  outline: 'none',
                  background: TOKENS.white,
                  color: TOKENS.darkGrey,
                }}
              />
              <button type="submit" style={primaryBtnStyle}>
                Install on Shopify
              </button>
            </Form>
          </div>
        </section>
      )}
    </MarketingShell>
  );
}

const primaryBtnStyle = {
  padding: '12px 22px',
  fontSize: 14,
  fontWeight: 600,
  fontFamily: FONT_STACK,
  background: TOKENS.teal,
  color: TOKENS.white,
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  letterSpacing: 0.2,
};

const sectionHeadingStyle = {
  fontFamily: HEADING_FONT,
  fontSize: 44,
  fontWeight: 400,
  color: TOKENS.nearBlack,
  margin: '0 0 12px',
  letterSpacing: -0.8,
  lineHeight: 1.15,
};

const sectionSubStyle = {
  fontFamily: HEADING_FONT,
  fontSize: 19,
  color: TOKENS.midGrey,
  margin: 0,
  fontStyle: 'italic',
  lineHeight: 1.45,
};
