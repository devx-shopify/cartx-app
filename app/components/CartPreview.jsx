const RADIUS_MAP = {
  none: "0",
  small: "4px",
  medium: "10px",
  large: "12px",
  pill: "999px",
};
const HEADING_SIZE_MAP = { small: "16px", medium: "18px", large: "20px" };
const BODY_SIZE_MAP = { small: "12px", medium: "13px", large: "14px" };
const IMG_SIZE_MAP = { small: 56, medium: 72, large: 96 };
const DENSITY_MAP = { compact: 8, comfortable: 14, spacious: 20 };

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

function UpsellsPreviewBlock({ bg, border, text, upsellLayout, upsellHDim, upsellVDim, upsellHeading, upsellBtnText, upsellShowCompare, upsellTitleSize }) {
  const isVertical = upsellLayout === 'vertical';
  return (
    <div style={{ padding: "24px 20px", borderTop: `1px solid ${border}`, background: bg }}>
      <div style={{ fontSize: 14, fontWeight: 400, color: "#5c6770", marginBottom: 16 }}>
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
  const imgSize = IMG_SIZE_MAP[l.image_size] || 72;
  const density = DENSITY_MAP[l.density] || 14;
  const isOutline = sh.button_style === "outline";

  const bg = c.background || "#ffffff";
  const text = c.text || "#1a1a1a";
  const textSec = c.secondary_text || "#9ca3af";
  const border = c.border || "#f0f0f0";
  const primary = c.primary || "#1a1a1a";
  const primaryText = c.primary_text || "#ffffff";
  const accent = c.accent || "#16a34a";
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
    flex: 1,
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
              background: accent,
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
            background: accent,
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
        {sec.show_upsells && (
          <UpsellsPreviewBlock
            bg={bg} border={border} text={text}
            upsellLayout={upsellLayout} upsellHDim={upsellHDim} upsellVDim={upsellVDim}
            upsellHeading={upsellHeading} upsellBtnText={upsellBtnText}
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
          padding: "12px 16px",
          borderBottom: `1px solid ${border}`,
          background: bg,
        }}
      >
        <div
          style={{
            fontSize: bodySize,
            fontWeight: 700,
            color: text,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 8,
          }}
        >
          Choose your free gift
        </div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
          {CLAIM_GIFTS.map((gift, i) => {
            const isInCart = gift.inCart;
            return (
              <div
                key={i}
                style={{
                  flexShrink: 0,
                  width: "70%",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  border: isInCart
                    ? `1px solid ${accent}`
                    : `1px solid ${border}`,
                  borderRadius: radius,
                  overflow: "hidden",
                  background: isInCart ? `${accent}10` : bg,
                }}
              >
                <div
                  style={{
                    width: claimImgSize,
                    height: claimImgSize,
                    minWidth: claimImgSize,
                    background: "#f3f4f6",
                  }}
                />
                <div
                  style={{
                    flex: 1,
                    padding: "6px 8px 6px 0",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      lineHeight: 1.3,
                      color: text,
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
                        ...smallBtnStyle,
                        padding: "4px 10px",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "default",
                        width: "fit-content",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Add
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
              {/* Variant — pill switcher */}
              {showVariantSwitcher && (
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: `calc(${bodySize} - 1px)`,
                  color: text,
                  border: `1px solid ${border}`,
                  borderRadius: 999,
                  padding: "3px 8px 3px 10px",
                  marginTop: 2,
                  width: "fit-content",
                  maxWidth: "100%",
                  overflow: "hidden",
                }}>
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.variant}</span>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                </div>
              )}
              <div
                style={{
                  fontWeight: 600,
                  fontSize: bodySize,
                  color: text,
                  marginTop: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {i === 0 && (
                  <span style={{ textDecoration: "line-through", color: "#d1d5db", fontWeight: 400 }}>
                    $39.00
                  </span>
                )}
                {item.price}
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
              <div style={{ marginTop: 4 }}>
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
          background: `${accent}08`,
          borderBottomColor: `${accent}20`,
          borderLeft: `3px solid ${accent}`,
        }}
      >
        <div
          style={{
            width: imgSize,
            height: imgSize,
            minWidth: imgSize,
            borderRadius: imgRadius,
            background: "#f0fdf4",
            border: `1px solid ${accent}30`,
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
          <div style={{ fontWeight: 500, fontSize: bodySize, color: accent }}>
            Free Gift Lip Balm
          </div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              width: "fit-content",
              fontSize: 10,
              fontWeight: 700,
              color: accent,
              background: `${accent}18`,
              padding: "2px 7px",
              borderRadius: 4,
              textTransform: "uppercase",
              letterSpacing: 0.3,
            }}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
            </svg>
            FREE
          </span>
        </div>
      </div>

      {/* ── Coupon input ── */}
      {sec.show_coupons !== false && (<div
        style={{
          padding: "10px 16px",
          borderTop: `1px solid ${border}`,
          background: bg,
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          <div
            style={{
              flex: 1,
              padding: "7px 10px",
              fontSize: 12,
              color: "#d1d5db",
              border: `1px solid ${border}`,
              borderRadius: `calc(${radius} * 0.75)`,
              background: bg,
            }}
          >
            {tx.coupon_placeholder || "Discount code"}
          </div>
          <div
            style={{
              padding: "7px 12px",
              fontSize: 12,
              fontWeight: 600,
              color: text,
              border: `1px solid ${border}`,
              borderRadius: `calc(${radius} * 0.75)`,
              background: bg,
            }}
          >
            Apply
          </div>
        </div>
      </div>

      )}

      {/* ── Upsells ── */}
      {sec.show_upsells !== false && (
        <UpsellsPreviewBlock
          bg={bg} border={border} text={text}
          upsellLayout={upsellLayout} upsellHDim={upsellHDim} upsellVDim={upsellVDim}
          upsellHeading={upsellHeading} upsellBtnText={upsellBtnText}
          upsellShowCompare={upsellShowCompare} upsellTitleSize={upsellTitleSize}
        />
      )}

      {/* ── Footer ── */}
      <div
        style={{
          borderTop: `1px solid ${border}`,
          background: bg,
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
            </div>
          );
        })() : null}
        <div style={{ padding: "10px 16px 14px" }}>
        <div style={{ marginBottom: 8, paddingBottom: 8, borderBottom: `1px dashed ${border}` }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13,
              color: textSec,
              padding: "3px 0",
            }}
          >
            <span>{tx.subtotal_label || "Subtotal"}</span>
            <span>$118.00</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13,
              color: accent,
              fontWeight: 600,
              padding: "3px 0",
            }}
          >
            <span>Discounts</span>
            <span>−$15.00</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div>
            <div
              style={{
                fontSize: 10,
                color: textSec,
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: 0.3,
                lineHeight: 1,
              }}
            >
              {tx.total_label || "Total"}
            </div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: text,
                lineHeight: 1.2,
              }}
            >
              $103.00
            </div>
          </div>
          <div style={{ ...btnStyle, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 44 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85 }}>
              <rect width="18" height="11" x="3" y="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>{tx.checkout_button || "Checkout"}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 8, fontSize: 11, color: textSec, fontWeight: 500 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
            <rect width="18" height="11" x="3" y="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>Guaranteed safe &amp; secure checkout</span>
        </div>
        </div>
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
        height: 28,
        border: minimal ? "none" : `1px solid ${border}`,
        borderRadius: radius,
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
          lineHeight: "28px",
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
          lineHeight: "28px",
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
          lineHeight: "28px",
          ...minStyle,
        }}
      >
        +
      </span>
    </div>
  );
}
