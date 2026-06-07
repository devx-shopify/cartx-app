const RADIUS_MAP = {
  none: "0",
  small: "6px",
  medium: "10px",
  large: "12px",
  pill: "999px",
};
const HEADING_SIZE_MAP = { small: "16px", medium: "18px", large: "20px" };
const BODY_SIZE_MAP = { small: "12px", medium: "13px", large: "14px" };
const IMG_SIZE_MAP = { small: 70, medium: 90, large: 110 };
const DENSITY_MAP = { compact: 8, comfortable: 16, spacious: 20 };

const DUMMY_ITEMS = [
  { title: "Classic Cotton T-Shirt", variant: "Black / M", price: "$29.00", qty: 2 },
  { title: "Silk Scarf", variant: "One Size", price: "$35.00", qty: 1 },
];

const CLAIM_GIFTS = [
  { title: "Mini Perfume Sample", inCart: false },
  { title: "Branded Tote Bag", inCart: true },
];

const DUMMY_UPSELLS = [
  { title: "Summer Hat", price: "$24.00", compare: "$32.00" },
  { title: "Silk Scarf", price: "$35.00", compare: "$48.00" },
];

function UpsellsPreviewBlock({ bg, border, text, upsellLayout, upsellHDim, upsellVDim, upsellHeading, upsellHeadingAlign, upsellBtnText, upsellShowCompare, upsellTitleSize }) {
  const isVertical = upsellLayout === 'vertical';
  return (
    <div style={{ padding: "24px 20px", borderTop: `1px solid ${border}`, background: bg }}>
      <div style={{ fontSize: 14, fontWeight: 400, color: "#5c6770", marginBottom: 16, textAlign: upsellHeadingAlign === 'center' ? 'center' : 'left' }}>
        {upsellHeading}
      </div>
      <div style={{ display: "flex", gap: 20, overflowX: "auto", overflowY: "hidden", scrollbarWidth: "none", msOverflowStyle: "none" }} className="cartmax-preview-upsells-scroll">
        {DUMMY_UPSELLS.map((p, i) => (
          isVertical ? (
            <div key={i} style={{
              flexShrink: 0, width: upsellVDim.card,
              display: "flex", flexDirection: "column",
              border: `1px solid rgba(92,103,112,0.10)`, borderRadius: 8, overflow: "hidden", background: bg,
            }}>
              <div style={{ width: "100%", height: upsellVDim.imgH, background: "#f3f4f6" }} />
              <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: upsellTitleSize, fontWeight: 400, color: text, lineHeight: 1.35 }}>{p.title}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                  <span style={{ fontWeight: 500, color: text }}>{p.price}</span>
                  {upsellShowCompare && <span style={{ textDecoration: "line-through", color: "#80828d", fontWeight: 400 }}>{p.compare}</span>}
                </div>
                <span style={{ display: "inline-block", height: 28, lineHeight: "28px", padding: "0 14px", background: "transparent", color: text, border: "1px solid rgba(92,103,112,0.20)", borderRadius: 999, fontSize: 10, fontWeight: 500, cursor: "default", textTransform: "uppercase", width: "fit-content" }}>{upsellBtnText}</span>
              </div>
            </div>
          ) : (
            <div key={i} style={{
              flexShrink: 0, width: upsellHDim.card,
              display: "flex", flexDirection: "row", alignItems: "center", gap: 10,
              padding: "9px 8px", border: `1px solid rgba(92,103,112,0.10)`, borderRadius: 8, background: bg,
            }}>
              <div style={{ width: upsellHDim.img, height: upsellHDim.img, minWidth: upsellHDim.img, background: "#f3f4f6", borderRadius: 6 }} />
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: upsellTitleSize, fontWeight: 400, color: text, lineHeight: 1.35 }}>{p.title}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                  <span style={{ fontWeight: 500, color: text }}>{p.price}</span>
                  {upsellShowCompare && <span style={{ textDecoration: "line-through", color: "#80828d", fontWeight: 400 }}>{p.compare}</span>}
                </div>
                <span style={{ display: "inline-block", height: 30, lineHeight: "30px", padding: "0 14px", background: "transparent", color: text, border: "1px solid rgba(92,103,112,0.20)", borderRadius: 999, fontSize: 10, fontWeight: 500, cursor: "default", textTransform: "uppercase", width: "fit-content" }}>{upsellBtnText}</span>
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
}

export default function CartPreview({ settings, showEmpty, minHeight }) {
  const c = settings.colors || {};
  const sh = settings.shape || {};
  const t = settings.typography || {};
  const tx = settings.text || {};
  const l = settings.layout || {};
  const sec = settings.sections || {};

  const radius = RADIUS_MAP[sh.border_radius] || "10px";
  const headingSize = HEADING_SIZE_MAP[t.heading_size] || "16px";
  const bodySize = BODY_SIZE_MAP[t.body_size] || "13px";
  const imgSize = IMG_SIZE_MAP[l.image_size] || 90;
  const density = DENSITY_MAP[l.density] || 16;
  const isOutline = sh.button_style === "outline";

  const bg = c.background || "#ffffff";
  const text = c.text || "#1a1a1a";
  const textSec = c.secondary_text || "#9ca3af";
  const border = c.border || "#f0f0f0";
  const primary = c.primary || "#1a1a1a";
  const primaryText = c.primary_text || "#ffffff";
  const accent = c.accent || "#16a34a";
  const secondaryAccent = c.secondary_accent || "#ff4b7e";
  const savingsBg = c.savings_bg || "#1a1a1a";
  const savingsText = c.savings_text || "#ffffff";
  const savingsAmount = c.savings_amount || "#22c55e";

  const li = settings.layout || {};
  const emptyIconUrl = li.empty_icon_url || '';
  const emptyIconSize = li.empty_icon_size || 'medium';
  const emptyIconColor = li.empty_icon_color || accent;
  const emptyIconPx = emptyIconSize === 'small' ? 64 : emptyIconSize === 'large' ? 96 : 80;

  const upsellLayout = li.upsells_card_layout || 'horizontal';
  const upsellSize = li.upsells_card_size || 'medium';
  const upsellHeading = li.upsells_heading || 'YOU MAY ALSO LIKE';
  const upsellHeadingAlign = li.upsells_heading_position || 'left';
  const upsellShowOnEmpty = li.upsells_show_on_empty || 'filled';
  const upsellBtnText = li.upsells_btn_text || 'ADD TO CART';
  const upsellShowCompare = li.upsells_show_compare_price !== false;

  const UPSELL_H_DIMS = { small: { card: 220, img: 64 }, medium: { card: 300, img: 90 }, large: { card: 360, img: 112 } };
  const UPSELL_V_DIMS = { small: { card: 130, imgH: 100 }, medium: { card: 160, imgH: 120 }, large: { card: 190, imgH: 140 } };
  const upsellHDim = UPSELL_H_DIMS[upsellSize] || UPSELL_H_DIMS.medium;
  const upsellVDim = UPSELL_V_DIMS[upsellSize] || UPSELL_V_DIMS.medium;

  const upsellTitleSize = upsellSize === 'small' ? 11 : upsellSize === 'large' ? 13 : 12;

  const btnBase = {
    borderRadius: radius,
    padding: "10px 16px",
    fontWeight: 600,
    fontSize: "13px",
    cursor: "default",
    textAlign: "center",
    letterSpacing: 0.3,
  };
  const btnStyle = isOutline
    ? {
        ...btnBase,
        background: "transparent",
        color: primary,
        border: `2px solid ${primary}`,
      }
    : { ...btnBase, background: primary, color: primaryText, border: "none" };

  const smallBtnStyle = isOutline
    ? {
        background: "transparent",
        color: primary,
        border: `1.5px solid ${primary}`,
        borderRadius: radius,
      }
    : {
        background: primary,
        color: primaryText,
        border: "none",
        borderRadius: radius,
      };

  const imgRadius =
    l.image_style === "circle"
      ? "50%"
      : l.image_style === "square"
        ? "0"
        : radius;
  const claimImgSize = Math.round(imgSize * 0.9);

  const ab = settings.announcement_bar || {};
  const pb = settings.progress_bar || {};

  const TRACK_H_MAP = { thin: 4, normal: 6, thick: 8 };
  const trackH = TRACK_H_MAP[pb.track_thickness] || 6;
  const badgeBg = pb.badge_bg_color || `${accent}1a`;
  const badgeText = pb.badge_text_color || accent;

  return (
    <div
      style={{
        background: bg,
        color: text,
        width: "100%",
        minHeight: minHeight ? `${minHeight}px` : undefined,
        display: "flex",
        flexDirection: "column",
        borderRadius: 12,
        boxShadow: "0 4px 24px rgba(0,0,0,0.10), 0 1px 3px rgba(0,0,0,0.06)",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontSize: bodySize,
        overflow: "hidden",
        border: "1px solid #e0e0e0",
      }}
    >
      {/* ── Announcement bar ── */}
      {ab.text ? (
        ab.type === 'marquee' ? (
          <>
            <style>{`@keyframes cp-marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
            <div style={{
              background: secondaryAccent,
              color: text,
              padding: "7px 16px",
              fontSize: 12,
              fontWeight: 500,
              flexShrink: 0,
              overflow: "hidden",
              display: "flex",
            }}>
              <div style={{ display: "flex", whiteSpace: "nowrap", animation: "cp-marquee 18s linear infinite" }}>
                <span style={{ flexShrink: 0, paddingRight: 24 }}>{ab.text}</span>
                <span style={{ flexShrink: 0, paddingRight: 24 }}>{ab.text}</span>
              </div>
            </div>
          </>
        ) : (
          <div style={{
            background: secondaryAccent,
            color: text,
            padding: "7px 16px",
            fontSize: 12,
            fontWeight: 500,
            flexShrink: 0,
            textAlign: "center",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}>
            {ab.text}
          </div>
        )
      ) : null}

      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 16px",
          borderBottom: `1px solid ${border}`,
          background: bg,
        }}
      >
        <span
          style={{
            fontWeight: 600,
            fontSize: headingSize,
            color: text,
            display: "flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          {tx.cart_title || "Your Cart"}
          {!showEmpty && (
            <span
              style={{
                background: primary,
                color: primaryText,
                fontSize: 10,
                fontWeight: 600,
                padding: "2px 7px",
                borderRadius: 10,
                lineHeight: "1.4",
              }}
            >
              4
            </span>
          )}
        </span>
        <span
          style={{
            color: textSec,
            fontSize: 18,
            lineHeight: 1,
            cursor: "default",
          }}
        >
          ✕
        </span>
      </div>

      {/* ── Empty state ── */}
      {showEmpty && (<>
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "40px 28px", gap: 24, background: bg,
        }}>
          <div style={{ color: emptyIconColor, width: emptyIconPx, height: emptyIconPx, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {emptyIconUrl
              ? <img src={emptyIconUrl} alt="" aria-hidden style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
              : <svg width={emptyIconPx} height={emptyIconPx} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
            }
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: headingSize, fontWeight: 500, color: text, textAlign: "center" }}>
              {tx.empty_title || "Your cart is empty"}
            </div>
            <div style={{ fontSize: bodySize, color: textSec, textAlign: "center", lineHeight: 1.5 }}>
              {tx.empty_subtitle || "Looks like you haven't added anything yet"}
            </div>
          </div>
          {(tx.empty_button !== "" && tx.empty_button !== undefined && tx.empty_button !== null) && (
            <div style={{ ...btnStyle, flex: "0 0 auto", padding: "12px 28px", minWidth: 180 }}>
              {tx.empty_button}
            </div>
          )}
        </div>

        {/* Upsells in empty state */}
        {sec.show_upsells && upsellShowOnEmpty === 'always' && (
          <UpsellsPreviewBlock
            bg={bg} border={border} text={text}
            upsellLayout={upsellLayout} upsellHDim={upsellHDim} upsellVDim={upsellVDim}
            upsellHeading={upsellHeading} upsellHeadingAlign={upsellHeadingAlign} upsellBtnText={upsellBtnText}
            upsellShowCompare={upsellShowCompare} upsellTitleSize={upsellTitleSize}
          />
        )}
      </>)}

      {!showEmpty && (<>
      {/* ── Progress bar ── */}
      {sec.show_progress_bar !== false && (
      <div
        style={{
          padding: "16px 32px 0 0",
          borderBottom: `1px solid ${border}`,
          background: bg,
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: "0.5px",
              color: badgeText,
              background: badgeBg,
              border: `1px solid color-mix(in srgb, ${badgeBg} 22%, transparent)`,
              padding: "4px 14px",
              borderRadius: 999,
              lineHeight: 1.3,
              maxWidth: "100%",
            }}
          >
            <span>Add $5 more for free shipping!</span>
          </div>
        </div>
        <div style={{ position: "relative", height: trackH, background: "#f1f3f5", margin: "8px 30px 58px 0" }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "65%",
              height: "100%",
              background: accent,
              borderRadius: "0 999px 999px 0",
            }}
          />
          {[
            { pos: 33, state: "active", label: "Free Gift", sub: "Above $20" },
            { pos: 67, state: "active", label: "Free Shipping", sub: "At $25" },
            { pos: 100, state: "next", label: "10% Off", sub: "At $30" },
          ].map((m, i) => {
            const isActive = m.state === "active";
            const hasCustomSvg = isActive ? !!(pb.completed_icon_svg || pb.milestone_icon_svg) : !!pb.milestone_icon_svg;
            const dotBg = hasCustomSvg ? "transparent" : isActive ? primary : "#fff";
            const dotBorder = hasCustomSvg ? "transparent" : primary;
            const dotShadow = hasCustomSvg ? "none" : `0 0 0 3px ${primary}1f`;
            const labelColor = isActive ? text : m.state === "next" ? primary : "#9ca3af";
            const customSvg = isActive ? (pb.completed_icon_svg || pb.milestone_icon_svg) : pb.milestone_icon_svg;

            return (
              <div key={i} style={{
                position: "absolute",
                top: "50%",
                left: `${m.pos}%`,
                transform: "translateX(-50%) translateY(-50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                zIndex: 1,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: dotBg,
                  border: `2px solid ${dotBorder}`,
                  boxShadow: dotShadow,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  overflow: "hidden",
                }}>
                  {customSvg
                    ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }} dangerouslySetInnerHTML={{ __html: customSvg }} />
                    : isActive
                      ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                      : null
                  }
                </div>
                <div style={{
                  position: "absolute",
                  top: 36,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "max-content",
                  maxWidth: 110,
                  fontSize: 10,
                  fontWeight: isActive || m.state === "next" ? 600 : 500,
                  letterSpacing: "0.5px",
                  color: labelColor,
                  textAlign: "center",
                  lineHeight: 1.25,
                }}>
                  <div>{m.label}</div>
                  <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: "0.5px", color: isActive || m.state === "next" ? "#6b7280" : "#9ca3af", marginTop: 2 }}>
                    {m.sub}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* ── Claim Gifts ── */}
      {sec.show_claim_gifts !== false && (
      <div
        style={{
          padding: "16px 20px",
          background: `color-mix(in srgb, ${secondaryAccent} 6%, #ffffff)`,
          border: `1px solid color-mix(in srgb, ${secondaryAccent} 30%, #ffffff)`,
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: text,
            textTransform: "uppercase",
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          🎁 Claim your free gift 🎁
        </div>
        <div style={{ display: "flex", gap: 16, overflowX: "auto", overflowY: "hidden", scrollbarWidth: "none" }}>
          {CLAIM_GIFTS.map((gift, i) => {
            const isInCart = gift.inCart;
            return (
              <div
                key={i}
                style={{
                  flexShrink: 0,
                  width: 300,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 8px",
                  border: isInCart
                    ? `0.5px solid ${accent}`
                    : `0.5px solid ${secondaryAccent}`,
                  borderRadius: 12,
                  overflow: "hidden",
                  background: isInCart ? `color-mix(in srgb, ${accent} 6%, #ffffff)` : bg,
                }}
              >
                <div
                  style={{
                    width: 70,
                    height: 70,
                    minWidth: 70,
                    background: "#f3f4f6",
                    borderRadius: 4,
                  }}
                />
                <div
                  style={{
                    flex: 1,
                    padding: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 9,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 400,
                      lineHeight: "16px",
                      color: text,
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {gift.title}
                  </div>
                  {isInCart ? (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: accent,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                      }}
                    >
                      ✓ Added
                    </span>
                  ) : (
                    <span
                      style={{
                        background: secondaryAccent,
                        color: text,
                        border: `1px solid ${textSec}`,
                        borderRadius: 50,
                        padding: "4px 12px",
                        fontSize: 10,
                        fontWeight: 500,
                        cursor: "default",
                        width: "fit-content",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Claim gift
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      )}

      {/* ── Regular line items ── */}
      {DUMMY_ITEMS.map((item, i) => {
        const showVariantSwitcher = l.show_variant_switcher !== false;
        const showRemoveBtn = l.show_remove_btn !== false && item.qty > 1;
        return (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 10,
              padding: `${density}px 16px`,
              borderBottom: `1px solid ${border}`,
              background: bg,
            }}
          >
            <div
              style={{
                width: imgSize,
                height: imgSize,
                minWidth: imgSize,
                borderRadius: imgRadius,
                background: "#f3f4f6",
                border: `1px solid ${border}`,
              }}
            />
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
            >
              {l.show_vendor && (
                <div style={{ fontSize: 10, color: textSec, textTransform: "uppercase", letterSpacing: 0.3, fontWeight: 600 }}>
                  Brand Name
                </div>
              )}
              {/* Title row — with optional remove button */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
                <div
                  style={{
                    fontWeight: 500,
                    fontSize: bodySize,
                    color: text,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {item.title}
                </div>
                {showRemoveBtn && (
                  <span style={{ flexShrink: 0, lineHeight: 1, paddingTop: 1 }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4.87183 13.6667C4.53939 13.6667 4.25539 13.549 4.01983 13.3135C3.78439 13.0779 3.66667 12.794 3.66667 12.4615V4.00001H3V3.00001H6V2.41034H10V3.00001H13V4.00001H12.3333V12.4615C12.3333 12.7983 12.2167 13.0833 11.9833 13.3167C11.75 13.55 11.4649 13.6667 11.1282 13.6667H4.87183ZM11.3333 4.00001H4.66667V12.4615C4.66667 12.5214 4.68589 12.5706 4.72433 12.609C4.76278 12.6474 4.81194 12.6667 4.87183 12.6667H11.1282C11.1795 12.6667 11.2265 12.6453 11.2692 12.6025C11.3119 12.5598 11.3333 12.5128 11.3333 12.4615V4.00001ZM6.26933 11.3333H7.26917V5.33334H6.26933V11.3333ZM8.73083 11.3333H9.73067V5.33334H8.73083V11.3333Z" fill="#5C6770"/>
                    </svg>
                  </span>
                )}
              </div>
              <div
                style={{
                  fontWeight: 500,
                  fontSize: bodySize,
                  color: text,
                  marginTop: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {item.price}
                {i === 0 && (
                  <span style={{ textDecoration: "line-through", color: "#80828D", fontWeight: 400 }}>
                    $39.00
                  </span>
                )}
                {i === 0 && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 400, color: "#2FC01A" }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M7.99996 14.3334C7.75896 14.3334 7.52935 14.2883 7.31113 14.1982C7.09279 14.1081 6.89935 13.9779 6.73079 13.8077C6.39568 13.4769 6.10829 13.2605 5.86863 13.1584C5.62885 13.0562 5.26924 13.0052 4.78979 13.0052C4.29113 13.0052 3.86729 12.8307 3.51829 12.4817C3.16929 12.1327 2.99479 11.7089 2.99479 11.2102C2.99479 10.7351 2.94357 10.3764 2.84113 10.1342C2.73868 9.89196 2.5224 9.60363 2.19229 9.26919C2.02051 9.09741 1.88996 8.90258 1.80063 8.68469C1.71129 8.4668 1.66663 8.23902 1.66663 8.00135C1.66663 7.76369 1.71129 7.53547 1.80063 7.31669C1.88996 7.09791 2.02051 6.90263 2.19229 6.73085C2.5224 6.39874 2.73868 6.11246 2.84113 5.87202C2.94357 5.63147 2.99479 5.27074 2.99479 4.78985C2.99479 4.29119 3.16929 3.86735 3.51829 3.51835C3.86729 3.16935 4.29113 2.99485 4.78979 2.99485C5.2649 2.99485 5.62357 2.94363 5.86579 2.84119C6.10802 2.73874 6.39635 2.52246 6.73079 2.19235C6.89968 2.02213 7.0934 1.89196 7.31196 1.80185C7.53052 1.71174 7.75902 1.66669 7.99746 1.66669C8.2359 1.66669 8.46452 1.71135 8.68329 1.80069C8.90207 1.89002 9.09735 2.02058 9.26913 2.19235C9.60124 2.52246 9.88752 2.73874 10.128 2.84119C10.3685 2.94363 10.7292 2.99485 11.2101 2.99485C11.7088 2.99485 12.1326 3.16935 12.4816 3.51835C12.8306 3.86735 13.0051 4.29119 13.0051 4.78985C13.0051 5.26497 13.0563 5.62363 13.1588 5.86585C13.2612 6.10808 13.4775 6.39641 13.8076 6.73085C13.9794 6.90263 14.11 7.09746 14.1993 7.31535C14.2886 7.53324 14.3333 7.76102 14.3333 7.99869C14.3333 8.23635 14.2886 8.46458 14.1993 8.68335C14.11 8.90213 13.9794 9.09741 13.8076 9.26919C13.4768 9.6043 13.2604 9.89169 13.1583 10.1314C13.0562 10.3711 13.0051 10.7307 13.0051 11.2102C13.0051 11.7089 12.8306 12.1327 12.4816 12.4817C12.1326 12.8307 11.7088 13.0052 11.2101 13.0052C10.735 13.0052 10.3763 13.0564 10.1341 13.1589C9.8919 13.2613 9.60357 13.4776 9.26913 13.8077C9.10057 13.9779 8.90713 14.1081 8.68879 14.1982C8.47057 14.2883 8.24096 14.3334 7.99996 14.3334ZM8.00079 13.3334C8.10624 13.3334 8.20918 13.3118 8.30963 13.2687C8.41007 13.2255 8.49446 13.1697 8.56279 13.1014C8.98413 12.6757 9.38229 12.3866 9.75729 12.234C10.1322 12.0815 10.6165 12.0052 11.2101 12.0052C11.4353 12.0052 11.6242 11.929 11.7766 11.7767C11.929 11.6242 12.0051 11.4354 12.0051 11.2102C12.0051 10.6129 12.0814 10.1287 12.234 9.75769C12.3865 9.3868 12.6735 8.98852 13.0948 8.56285C13.2538 8.40385 13.3333 8.21624 13.3333 8.00002C13.3333 7.7838 13.256 7.5983 13.1013 7.44352C12.6756 7.01796 12.3865 6.61769 12.234 6.24269C12.0814 5.8678 12.0051 5.38352 12.0051 4.78985C12.0051 4.56463 11.929 4.3758 11.7766 4.22335C11.6242 4.07102 11.4353 3.99485 11.2101 3.99485C10.6066 3.99485 10.1201 3.91963 9.75063 3.76919C9.38118 3.61863 8.98313 3.33063 8.55646 2.90519C8.48802 2.83674 8.40357 2.77991 8.30313 2.73469C8.20268 2.68935 8.10163 2.66669 7.99996 2.66669C7.89829 2.66669 7.79618 2.68985 7.69363 2.73619C7.59096 2.78263 7.50546 2.83896 7.43713 2.90519C7.01579 3.32652 6.61763 3.61347 6.24263 3.76602C5.86774 3.91858 5.38346 3.99485 4.78979 3.99485C4.56457 3.99485 4.37574 4.07102 4.22329 4.22335C4.07096 4.3758 3.99479 4.56463 3.99479 4.78985C3.99479 5.39152 3.91852 5.8778 3.76596 6.24869C3.6134 6.61969 3.32429 7.01796 2.89863 7.44352C2.74396 7.5983 2.66663 7.7838 2.66663 8.00002C2.66663 8.21624 2.74396 8.40385 2.89863 8.56285C3.32429 8.98852 3.6134 9.38747 3.76596 9.75969C3.91852 10.1319 3.99479 10.6154 3.99479 11.2102C3.99479 11.4354 4.07096 11.6242 4.22329 11.7767C4.37574 11.929 4.56457 12.0052 4.78979 12.0052C5.3919 12.0052 5.87724 12.0815 6.24579 12.234C6.61435 12.3866 7.01357 12.6757 7.44346 13.1014C7.5119 13.1697 7.59552 13.2255 7.69429 13.2687C7.79318 13.3118 7.89535 13.3334 8.00079 13.3334ZM9.62296 10.4424C9.85296 10.4424 10.047 10.3633 10.2051 10.2052C10.3632 10.0471 10.4423 9.85302 10.4423 9.62302C10.4423 9.39291 10.3632 9.19735 10.2051 9.03635C10.047 8.87535 9.85296 8.79485 9.62296 8.79485C9.39285 8.79485 9.19729 8.87535 9.03629 9.03635C8.87529 9.19735 8.79479 9.39291 8.79479 9.62302C8.79479 9.85302 8.87529 10.0471 9.03629 10.2052C9.19729 10.3633 9.39285 10.4424 9.62296 10.4424ZM6.34479 10.3514L10.3513 6.35135L9.64863 5.64869L5.64863 9.65519L6.34479 10.3514ZM6.37696 7.20519C6.60707 7.20519 6.80263 7.12469 6.96363 6.96369C7.12463 6.80269 7.20513 6.60713 7.20513 6.37702C7.20513 6.14702 7.12463 5.95297 6.96363 5.79485C6.80263 5.63674 6.60707 5.55769 6.37696 5.55769C6.14696 5.55769 5.9529 5.63674 5.79479 5.79485C5.63668 5.95297 5.55763 6.14702 5.55763 6.37702C5.55763 6.60713 5.63668 6.80269 5.79479 6.96369C5.9529 7.12469 6.14696 7.20519 6.37696 7.20519Z" fill="#2FC01A"/>
                    </svg>
                    26% off
                  </span>
                )}
              </div>
              {i === 0 && (
                <div style={{ marginTop: 4 }}>
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 10,
                    padding: "2px 9px 2px 7px",
                    background: `${accent}14`,
                    color: accent,
                    border: `1px solid ${accent}40`,
                    borderRadius: 999,
                    fontWeight: 600,
                    letterSpacing: 0.2,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: accent }} />
                    Volume Discount
                  </span>
                </div>
              )}
              {/* Actions row: variant left, qty right */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                {showVariantSwitcher ? (
                  <div style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: `calc(${bodySize} - 1px)`,
                    color: text,
                    border: `1px solid ${border}`,
                    borderRadius: 999,
                    padding: "3px 8px 3px 10px",
                    maxWidth: "55%",
                    overflow: "hidden",
                  }}>
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.variant}</span>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
                      <path d="m6 9 6 6 6-6"/>
                    </svg>
                  </div>
                ) : <div />}
                <QtyMock
                  border={border}
                  text={text}
                  textSec={textSec}
                  bg={bg}
                  radius={radius}
                  qty={item.qty}
                  minimal={l.qty_style === "minimal"}
                />
              </div>
            </div>
          </div>
        );
      })}

      {/* ── Free gift line item ── */}
      <div
        style={{
          display: "flex",
          gap: 10,
          padding: `${density}px 16px`,
          borderBottom: `1px solid ${border}`,
          background: bg,
        }}
      >
        <div
          style={{
            width: imgSize,
            height: imgSize,
            minWidth: imgSize,
            borderRadius: imgRadius,
            background: "#f3f4f6",
            border: `1px solid ${border}`,
          }}
        />
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <div style={{ fontWeight: 500, fontSize: bodySize, color: text }}>
            Free Gift Lip Balm
          </div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              width: "fit-content",
              fontSize: 10,
              fontWeight: 500,
              color: text,
              background: "rgba(253, 170, 200, 1)",
              padding: "3px 10px",
              borderRadius: 999,
              textTransform: "uppercase",
              letterSpacing: 0.4,
            }}
          >
            FREE
          </span>
        </div>
      </div>

      {/* ── Discount block (coupon) ── */}
      {sec.show_coupons !== false && (
        <div style={{
          background: `color-mix(in srgb, ${accent} 6%, transparent)`,
          border: `1px solid color-mix(in srgb, ${accent} 30%, transparent)`,
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}>
          {/* Header card */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: bg,
            border: `1px solid ${border}`,
            borderRadius: 6,
            padding: 12,
            cursor: "default",
          }}>
            <span style={{ display: "flex", alignItems: "center", color: textSec, flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 21C11.677 21 11.3714 20.9398 11.0833 20.8195C10.7952 20.6992 10.5399 20.5253 10.3173 20.298C9.79542 19.789 9.34992 19.4563 8.98075 19.3C8.61158 19.1437 8.05775 19.0655 7.31925 19.0655C6.65692 19.0655 6.09383 18.8337 5.63 18.37C5.16633 17.9062 4.9345 17.3431 4.9345 16.6807C4.9345 15.9551 4.85583 15.404 4.6985 15.0275C4.54117 14.651 4.209 14.2028 3.702 13.6827C3.46983 13.4506 3.29483 13.1911 3.177 12.9043C3.059 12.6173 3 12.3173 3 12.0043C3 11.6911 3.059 11.3897 3.177 11.1C3.29483 10.8103 3.46983 10.5494 3.702 10.3173C4.209 9.80442 4.54117 9.36225 4.6985 8.99075C4.85583 8.61925 4.9345 8.06208 4.9345 7.31925C4.9345 6.65692 5.16633 6.09383 5.63 5.63C6.09383 5.16633 6.65692 4.9345 7.31925 4.9345C8.04492 4.9345 8.596 4.85583 8.9725 4.6985C9.349 4.54117 9.79725 4.209 10.3173 3.702C10.5406 3.47467 10.7968 3.30083 11.086 3.1805C11.375 3.06017 11.6772 3 11.9925 3C12.3078 3 12.6103 3.059 12.9 3.177C13.1897 3.29483 13.4506 3.46983 13.6827 3.702C14.1956 4.209 14.6377 4.54117 15.0092 4.6985C15.3807 4.85583 15.9379 4.9345 16.6807 4.9345C17.3431 4.9345 17.9062 5.16633 18.37 5.63C18.8337 6.09383 19.0655 6.65692 19.0655 7.31925C19.0655 8.04492 19.1442 8.596 19.3015 8.9725C19.4588 9.349 19.791 9.79725 20.298 10.3173C20.5302 10.5494 20.7052 10.8089 20.823 11.0958C20.941 11.3828 21 11.6827 21 11.9957C21 12.3089 20.941 12.6103 20.823 12.9C20.7052 13.1897 20.5302 13.4506 20.298 13.6827C19.789 14.2046 19.4563 14.6501 19.3 15.0192C19.1437 15.3884 19.0655 15.9422 19.0655 16.6807C19.0655 17.3431 18.8337 17.9062 18.37 18.37C17.9062 18.8337 17.3431 19.0655 16.6807 19.0655C15.9551 19.0655 15.404 19.1442 15.0275 19.3015C14.651 19.4588 14.2028 19.791 13.6827 20.298C13.4601 20.5253 13.2048 20.6992 12.9167 20.8195C12.6286 20.9398 12.323 21 12 21ZM14.3688 15.327C14.6421 15.327 14.8702 15.2357 15.053 15.053C15.2357 14.8702 15.327 14.6421 15.327 14.3688C15.327 14.0954 15.2357 13.8631 15.053 13.6718C14.8702 13.4803 14.6421 13.3845 14.3688 13.3845C14.0954 13.3845 13.8631 13.4803 13.6718 13.6718C13.4803 13.8631 13.3845 14.0954 13.3845 14.3688C13.3845 14.6421 13.4803 14.8702 13.6718 15.053C13.8631 15.2357 14.0954 15.327 14.3688 15.327ZM9.5845 15.1038L15.1038 9.60375L14.3962 8.89625L8.89625 14.4155L9.5845 15.1038ZM9.63125 10.6155C9.90458 10.6155 10.1369 10.5198 10.3283 10.3283C10.5198 10.1369 10.6155 9.90458 10.6155 9.63125C10.6155 9.35792 10.5198 9.12983 10.3283 8.947C10.1369 8.76433 9.90458 8.673 9.63125 8.673C9.35792 8.673 9.12983 8.76433 8.947 8.947C8.76433 9.12983 8.673 9.35792 8.673 9.63125C8.673 9.90458 8.76433 10.1369 8.947 10.3283C9.12983 10.5198 9.35792 10.6155 9.63125 10.6155Z" fill="currentColor"/>
              </svg>
            </span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 500, lineHeight: "20px", letterSpacing: "0.7px", color: text }}>
              Apply Coupon
            </span>
            <span style={{ fontSize: 12, fontWeight: 400, lineHeight: "20px", letterSpacing: "0.6px", color: text, flexShrink: 0 }}>
              View All
            </span>
          </div>

          {/* Horizontal scrollable coupon cards */}
          <div style={{ display: "flex", flexDirection: "row", gap: 8, overflowX: "auto", overflowY: "hidden", scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {[
              { code: 'SAVE100',     accentLabel: '₹100 OFF', savings: 'Save ₹100 on this order' },
              { code: 'ENDYEARSALE', accentLabel: '20% OFF',  savings: 'Save 20% on this order'  },
              { code: 'FLAT200',     accentLabel: '₹200 OFF', savings: 'Save ₹200 on this order' },
            ].map((c, i) => (
              <div key={i} style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                flexShrink: 0,
                width: 280,
                height: 67,
                background: bg,
                border: `1px dashed ${text}`,
                borderRadius: 6,
                overflow: "hidden",
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  width: 34,
                  height: "100%",
                  background: accent,
                  padding: "0 4px",
                }}>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    lineHeight: "14px",
                    letterSpacing: "0.5px",
                    color: bg,
                    writingMode: "vertical-lr",
                    transform: "rotate(180deg)",
                    whiteSpace: "nowrap",
                  }}>
                    {c.accentLabel}
                  </span>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, padding: "0 16px", minWidth: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, lineHeight: "20px", color: text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {c.code}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 400, lineHeight: "16px", color: textSec, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {c.savings}
                  </span>
                </div>
                <div style={{
                  flexShrink: 0,
                  marginRight: 12,
                  width: 56,
                  height: 27,
                  background: accent,
                  color: bg,
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "default",
                }}>
                  Apply
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Upsells ── */}
      {sec.show_upsells !== false && (
        <UpsellsPreviewBlock
          bg={bg} border={border} text={text}
          upsellLayout={upsellLayout} upsellHDim={upsellHDim} upsellVDim={upsellVDim}
          upsellHeading={upsellHeading} upsellHeadingAlign={upsellHeadingAlign} upsellBtnText={upsellBtnText}
          upsellShowCompare={upsellShowCompare} upsellTitleSize={upsellTitleSize}
        />
      )}

      {/* ── Footer ── */}
      <div
        style={{
          boxShadow: "0 0 14px rgba(0,0,0,0.13)",
          background: bg,
          padding: 0,
        }}
      >
        {tx.savings_label ? (() => {
          const parts = tx.savings_label.split("{amount}");
          return (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 6,
                padding: "10px 16px",
                background: savingsBg,
                color: savingsText,
                fontSize: 13,
                fontWeight: 600,
                textAlign: "center",
                lineHeight: 1.3,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill={savingsAmount} aria-hidden="true">
                <path d="M12 2 13.5 8.5 20 10 13.5 11.5 12 18 10.5 11.5 4 10 10.5 8.5z" />
                <path d="M18 14 18.75 16.75 21.5 17.5 18.75 18.25 18 21 17.25 18.25 14.5 17.5 17.25 16.75z" opacity="0.6" />
              </svg>
              <span>{parts[0]}</span>
              <span style={{ color: savingsAmount, fontWeight: 700 }}>$15.00</span>
              <span>{parts[1] || ""}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill={savingsAmount} aria-hidden="true">
                <path d="M12 2 13.5 8.5 20 10 13.5 11.5 12 18 10.5 11.5 4 10 10.5 8.5z" />
                <path d="M18 14 18.75 16.75 21.5 17.5 18.75 18.25 18 21 17.25 18.25 14.5 17.5 17.25 16.75z" opacity="0.6" />
              </svg>
            </div>
          );
        })() : null}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: text, lineHeight: 1.2 }}>$103.00</span>
            <span style={{ fontSize: 11, color: "#2fc01a", textDecoration: "underline", textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 600, cursor: "default" }}>
              VIEW PRICE BREAKUP
            </span>
          </div>
          <div style={{
            ...btnStyle,
            flex: "0 0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            height: 48,
            borderRadius: 999,
            letterSpacing: 0.7,
            textTransform: "uppercase",
            fontSize: 13,
            padding: "0 20px",
          }}>
            <span>{tx.checkout_button || "Checkout"}</span>
            {l.show_payment_icons !== false && (
              <span style={{ display: "inline-flex", alignItems: "center" }}>
                <svg width="62" height="24" viewBox="0 0 62 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="0.5" y="0.5" width="23" height="23" rx="11.5" fill="white"/>
                  <rect x="0.5" y="0.5" width="23" height="23" rx="11.5" stroke="#D8D9E0"/>
                  <path d="M18.286 7.99168C16.7707 7.11701 14.833 7.63668 13.9577 9.15201L11.75 12.9757C11.1113 14.0797 11.9337 14.4657 12.8503 15.0153L14.9743 16.2413C15.6937 16.6563 16.6123 16.41 17.027 15.6917L19.296 11.762C20.0587 10.4417 19.6063 8.75401 18.286 7.99168Z" fill="#E64A19"/>
                  <path d="M15.7884 9.57436L13.6644 8.34836C12.492 7.69736 11.828 7.65436 11.3464 8.41969L8.21369 13.8447C7.33902 15.359 7.85969 17.2957 9.37402 18.1684C10.6944 18.9307 12.382 18.4784 13.1444 17.158L16.337 11.628C16.7537 10.909 16.5077 9.98936 15.7884 9.57436Z" fill="#FBC02D"/>
                  <path d="M16.197 6.78532L14.705 5.92366C13.055 4.97133 10.945 5.53599 9.99265 7.18599L7.15232 12.1057C6.73265 12.8313 6.98199 13.7603 7.70765 14.179L9.37832 15.1437C10.2033 15.6203 11.258 15.3377 11.7347 14.5123L14.9797 8.89232C15.652 7.72832 17.14 7.32932 18.3043 8.00166L16.197 6.78532Z" fill="#43A047"/>
                  <path d="M10.3963 8.59369L8.78367 7.66469C8.06434 7.25069 7.14567 7.49602 6.73101 8.21336L4.79634 11.5567C3.84401 13.202 4.40867 15.3074 6.05867 16.257L7.28634 16.964L8.77534 17.8217L9.42167 18.1934C8.27434 17.4254 7.91001 15.8867 8.61167 14.675L9.11267 13.8097L10.9473 10.6397C11.361 9.92469 11.1147 9.00769 10.3963 8.59369Z" fill="#1E88E5"/>
                  <rect x="19.5" y="0.5" width="23" height="23" rx="11.5" fill="white"/>
                  <rect x="19.5" y="0.5" width="23" height="23" rx="11.5" stroke="#D8D9E0"/>
                  <g clipPath="url(#preview-clip-paytm)">
                    <path d="M37.9467 17.0556C37.9467 18.1297 37.0763 19 36.0022 19H25.8911C24.8174 19 23.9467 18.1297 23.9467 17.0556V6.94444C23.9467 5.87033 24.8174 5 25.8911 5H36.0022C37.0763 5 37.9467 5.87033 37.9467 6.94444V17.0556Z" fill="#4527A0"/>
                    <path d="M34.1616 10.5109C34.1616 10.2461 33.9345 10.0194 33.67 10.0194H32.7624L30.6818 7.58883C30.4928 7.36171 30.1903 7.28627 29.8873 7.36171L29.1687 7.58883C29.0551 7.62655 29.0174 7.77783 29.0928 7.85366L31.3624 10.0571H27.9203C27.8068 10.0571 27.7313 10.1329 27.7313 10.2461V10.6245C27.7313 10.8893 27.9584 11.2102 28.2229 11.2102H28.9898V12.8843C28.9898 14.2462 29.6163 15.0403 30.8265 15.0403C31.2049 15.0403 31.3624 15.0026 31.7404 14.8513V16.0615C31.7404 16.4018 32.0052 16.6667 32.3455 16.6667H32.6512C32.7647 16.6667 32.8783 16.5531 32.8783 16.4395V11.2102H33.9718C34.0854 11.2102 34.1608 11.1343 34.1608 11.0212V10.5109H34.1616ZM31.7412 13.7162C31.514 13.8297 31.2115 13.8674 30.9848 13.8674C30.3797 13.8674 30.1693 13.5649 30.1693 12.8839V11.2098H31.7415V13.7162H31.7412Z" fill="white"/>
                  </g>
                  <rect x="38.5" y="0.5" width="23" height="23" rx="11.5" fill="white"/>
                  <rect x="38.5" y="0.5" width="23" height="23" rx="11.5" stroke="#D8D9E0"/>
                  <path d="M61.0915 10.5647C60.8887 9.98508 60.3363 9.56885 59.6874 9.56885H59.6738C59.2519 9.56885 58.8718 9.74442 58.6012 10.0263C58.3301 9.74442 57.9499 9.56885 57.5285 9.56885H57.515C57.1441 9.56885 56.8052 9.70462 56.5449 9.92936V9.81512C56.536 9.70134 56.4423 9.61193 56.3267 9.61193H55.3313C55.2096 9.61193 55.1113 9.71025 55.1113 9.83244V15.2378C55.1113 15.36 55.2096 15.4583 55.3313 15.4583H56.3267C56.4376 15.4583 56.5289 15.3754 56.5435 15.2682L56.543 11.3878C56.5429 11.3748 56.5435 11.3618 56.5449 11.3489C56.5608 11.1757 56.6877 11.0334 56.8881 11.0156H57.0716C57.1554 11.0231 57.2261 11.0526 57.2818 11.097C57.3684 11.1659 57.4166 11.2717 57.4166 11.3878L57.4204 15.249C57.4204 15.3712 57.5191 15.47 57.6404 15.47H58.6358C58.7533 15.47 58.8488 15.3763 58.8544 15.2598L58.854 11.3826C58.8535 11.2553 58.9125 11.1401 59.016 11.0718C59.067 11.039 59.1283 11.017 59.199 11.0104H59.3826C59.5979 11.0291 59.7281 11.1925 59.7276 11.3826L59.7314 15.2387C59.7314 15.3609 59.8302 15.4592 59.9514 15.4592H60.9468C61.068 15.4592 61.1668 15.3609 61.1668 15.2387V11.0914C61.1668 10.8086 61.135 10.6883 61.0915 10.5647ZM54.353 9.62601H53.7837V8.70085C53.7837 8.58989 53.6938 8.5 53.5828 8.5C53.5697 8.5 53.5571 8.50186 53.5449 8.50421C52.9138 8.67744 53.0402 9.55157 51.888 9.62601H51.776C51.7592 9.62601 51.7433 9.62835 51.7278 9.63162C51.6295 9.65364 51.5555 9.74118 51.5555 9.84607V10.8414C51.5555 10.9627 51.6543 11.0615 51.776 11.0615H52.3767L52.3758 15.2823C52.3758 15.4026 52.4732 15.5 52.5935 15.5H53.5777C53.6975 15.5 53.7949 15.4026 53.7949 15.2823L53.7954 11.0615H54.353C54.4742 11.0615 54.573 10.9627 54.573 10.8414V9.84607C54.573 9.72481 54.4742 9.62601 54.353 9.62601Z" fill="#00BAF2"/>
                  <path d="M50.7715 9.62646H49.7761C49.6549 9.62646 49.5566 9.72525 49.5566 9.8465V11.9047C49.5542 12.032 49.4512 12.1341 49.3234 12.1341H48.9067C48.7775 12.1341 48.6731 12.0302 48.6731 11.901L48.6693 9.84652C48.6693 9.72525 48.5705 9.62647 48.4493 9.62647H47.4539C47.3322 9.62647 47.2339 9.72525 47.2339 9.84652V12.1023C47.2339 12.9591 47.8449 13.5701 48.7021 13.5701C48.7021 13.5701 49.3454 13.5701 49.3651 13.5738C49.4812 13.5869 49.5715 13.6843 49.5715 13.8042C49.5715 13.9226 49.4831 14.0195 49.3683 14.0341C49.3627 14.035 49.3576 14.0364 49.3515 14.0373L47.8959 14.0425C47.7742 14.0425 47.6758 14.1413 47.6758 14.2625V15.2575C47.6758 15.3792 47.7742 15.4775 47.8959 15.4775H49.5233C50.381 15.4775 50.9916 14.867 50.9916 14.0097V9.84652C50.9916 9.72525 50.8932 9.62646 50.7715 9.62646ZM41.137 11.4503V12.0646C41.137 12.1933 41.0326 12.2982 40.9038 12.2982L40.2722 12.2987V11.0678H40.9038C41.0326 11.0678 41.137 11.1717 41.137 11.301V11.4503ZM41.2245 9.62622H39.0488C38.9295 9.62622 38.833 9.72314 38.833 9.84206V10.8173C38.833 10.8192 38.8335 10.8211 38.8335 10.8229C38.8335 10.8276 38.833 10.8323 38.833 10.8365V15.2507C38.833 15.3705 38.9229 15.4684 39.0343 15.4712H40.0484C40.1697 15.4712 40.2685 15.3729 40.2685 15.2511L40.2722 13.7384H41.2245C42.0214 13.7384 42.5767 13.1855 42.5767 12.3853V10.9812C42.5767 10.181 42.0214 9.62622 41.2245 9.62622ZM45.2669 13.7872V13.9426C45.2669 13.9553 45.2651 13.9674 45.2632 13.9791C45.2609 13.9901 45.2577 14.0009 45.2538 14.0114C45.2229 14.0985 45.1358 14.1617 45.0324 14.1617H44.618C44.4888 14.1617 44.3835 14.0634 44.3835 13.9426V13.7549C44.3835 13.7525 44.383 13.7502 44.383 13.7479L44.3835 13.2483V13.0919L44.3839 13.0905C44.3844 12.9702 44.4888 12.8728 44.618 12.8728H45.0324C45.1621 12.8728 45.2669 12.9706 45.2669 13.0919L45.2669 13.7872ZM45.1087 9.63194H43.7275C43.6053 9.63194 43.5066 9.72464 43.5066 9.83841V10.2256C43.5066 10.2279 43.507 10.2308 43.507 10.2331C43.507 10.2359 43.5065 10.2387 43.5065 10.2415V10.772C43.5065 10.8923 43.6114 10.9906 43.7407 10.9906H45.0558C45.1597 11.007 45.2421 11.0829 45.2538 11.2013V11.3296C45.2421 11.4425 45.1607 11.5248 45.0614 11.5342H44.4102C43.544 11.5342 42.9269 12.1096 42.9269 12.9177V14.0751C42.9269 14.8785 43.4574 15.4502 44.3175 15.4502H46.1223C46.4463 15.4502 46.709 15.2049 46.709 14.9029V11.1259C46.709 10.2102 46.2371 9.63194 45.1087 9.63194Z" fill="#1F336B"/>
                  <defs>
                    <clipPath id="preview-clip-paytm">
                      <rect x="23.611" y="5" width="14.7778" height="14" rx="2" fill="white"/>
                    </clipPath>
                  </defs>
                </svg>
              </span>
            )}
          </div>
        </div>
        {tx.checkout_trust_message ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "0 16px 10px", fontSize: 11, color: textSec, fontWeight: 500 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
              <rect width="18" height="11" x="3" y="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>{tx.checkout_trust_message}</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
              <rect width="18" height="11" x="3" y="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
        ) : null}
      </div>
      </>)}
    </div>
  );
}

function QtyMock({ border, text, textSec, bg, radius, qty, minimal }) {
  const isOne = qty <= 1;
  const minStyle = minimal
    ? { background: "#f3f4f6", borderRadius: radius, width: 24, height: 24, lineHeight: "24px", fontSize: 12 }
    : {};
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 24,
        border: minimal ? "none" : `1px solid ${border}`,
        borderRadius: 999,
        overflow: "hidden",
        background: minimal ? "transparent" : bg,
      }}
    >
      {/* Left button: trash at qty=1, minus at qty>1 */}
      <span
        style={{
          width: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: textSec,
          fontSize: 14,
          lineHeight: "24px",
          ...minStyle,
        }}
      >
        {isOne
          ? <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4.87183 13.6667C4.53939 13.6667 4.25539 13.549 4.01983 13.3135C3.78439 13.0779 3.66667 12.794 3.66667 12.4615V4.00001H3V3.00001H6V2.41034H10V3.00001H13V4.00001H12.3333V12.4615C12.3333 12.7983 12.2167 13.0833 11.9833 13.3167C11.75 13.55 11.4649 13.6667 11.1282 13.6667H4.87183ZM11.3333 4.00001H4.66667V12.4615C4.66667 12.5214 4.68589 12.5706 4.72433 12.609C4.76278 12.6474 4.81194 12.6667 4.87183 12.6667H11.1282C11.1795 12.6667 11.2265 12.6453 11.2692 12.6025C11.3119 12.5598 11.3333 12.5128 11.3333 12.4615V4.00001ZM6.26933 11.3333H7.26917V5.33334H6.26933V11.3333ZM8.73083 11.3333H9.73067V5.33334H8.73083V11.3333Z" fill="#5C6770"/>
            </svg>
          : "−"
        }
      </span>
      <span
        style={{
          width: 28,
          textAlign: "center",
          fontSize: 12,
          fontWeight: 600,
          color: text,
          lineHeight: "24px",
          borderLeft: minimal ? "none" : `1px solid ${border}`,
          borderRight: minimal ? "none" : `1px solid ${border}`,
        }}
      >
        {qty}
      </span>
      <span
        style={{
          width: 28,
          textAlign: "center",
          color: textSec,
          fontSize: 14,
          lineHeight: "24px",
          ...minStyle,
        }}
      >
        +
      </span>
    </div>
  );
}
