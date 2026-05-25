import { Link, useLocation } from "react-router";

function HashLink({ hash, children, style }) {
  const location = useLocation();
  const onHomepage = location.pathname === "/";
  const href = onHomepage ? `#${hash}` : `/#${hash}`;
  function handleClick(e) {
    if (!onHomepage) return; // let the browser navigate to "/" then scroll to hash
    e.preventDefault();
    const el = document.getElementById(hash);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    if (window.location.hash !== `#${hash}`) {
      history.replaceState(null, "", `#${hash}`);
    }
  }
  return (
    <a href={href} onClick={handleClick} style={style}>{children}</a>
  );
}

const FONT_STACK = 'Arial, Helvetica, -apple-system, sans-serif';
const HEADING_FONT = '"Instrument Serif", Georgia, serif';

const TOKENS = {
  teal: '#0D9488',
  tealDark: '#0F7269',
  tealLight: '#CCEBE9',
  tealWash: '#F0FDFA',
  nearBlack: '#111111',
  darkGrey: '#1F2937',
  midGrey: '#4B5563',
  mutedGrey: '#9CA3AF',
  borderGrey: '#E5E7EB',
  bgAlt: '#F7F8F9',
  white: '#FFFFFF',
};

function Logo({ size = 28 }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      fontFamily: FONT_STACK,
      fontWeight: 700,
      fontSize: Math.round(size * 0.78),
      color: TOKENS.nearBlack,
      letterSpacing: -0.2,
    }}>
      <img
        src="/cartx.png"
        alt="cartx"
        width={size}
        height={size}
        style={{
          display: 'block',
          width: size,
          height: size,
          borderRadius: 6,
          objectFit: 'cover',
        }}
      />
      cartx
    </span>
  );
}

export default function MarketingShell({ children }) {
  return (
    <div style={{
      fontFamily: FONT_STACK,
      color: TOKENS.darkGrey,
      background: TOKENS.white,
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      lineHeight: 1.55,
    }}>
      <header style={{
        borderBottom: `1px solid ${TOKENS.borderGrey}`,
        background: TOKENS.white,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div style={{
          maxWidth: 1120,
          margin: '0 auto',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <Logo />
          </Link>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <HashLink hash="features" style={navLinkStyle}>Features</HashLink>
            <HashLink hash="how" style={navLinkStyle}>How it works</HashLink>
            <Link to="/privacy" style={navLinkStyle}>Privacy</Link>
          </nav>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        {children}
      </main>

      <footer style={{
        borderTop: `1px solid ${TOKENS.borderGrey}`,
        background: TOKENS.bgAlt,
        marginTop: 80,
      }}>
        <div style={{
          maxWidth: 1120,
          margin: '0 auto',
          padding: '40px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 24,
        }}>
          <div style={{ maxWidth: 360 }}>
            <Logo />
            <p style={{
              margin: '12px 0 0',
              fontSize: 13,
              color: TOKENS.midGrey,
              lineHeight: 1.6,
            }}>
              Premium cart drawer for Shopify with progress milestones,
              free gifts, upsells, and discount codes.
            </p>
          </div>
          <div style={{
            display: 'flex',
            gap: 48,
            flexWrap: 'wrap',
          }}>
            <div>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                color: TOKENS.mutedGrey,
                textTransform: 'uppercase',
                letterSpacing: 0.6,
                marginBottom: 10,
              }}>Product</div>
              <HashLink hash="features" style={footerLinkStyle}>Features</HashLink>
              <HashLink hash="how" style={footerLinkStyle}>How it works</HashLink>
            </div>
            <div>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                color: TOKENS.mutedGrey,
                textTransform: 'uppercase',
                letterSpacing: 0.6,
                marginBottom: 10,
              }}>Legal</div>
              <Link to="/privacy" style={footerLinkStyle}>Privacy policy</Link>
            </div>
          </div>
        </div>
        <div style={{
          borderTop: `1px solid ${TOKENS.borderGrey}`,
          padding: '16px 24px',
          maxWidth: 1120,
          margin: '0 auto',
          fontSize: 12,
          color: TOKENS.mutedGrey,
        }}>
          &copy; {new Date().getFullYear()} cartx. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

const footerLinkStyle = {
  display: 'block',
  fontSize: 13,
  color: TOKENS.darkGrey,
  textDecoration: 'none',
  marginBottom: 6,
};

const navLinkStyle = {
  fontSize: 14,
  color: TOKENS.darkGrey,
  textDecoration: 'none',
  fontWeight: 500,
};

export { TOKENS, FONT_STACK, HEADING_FONT, HashLink };
