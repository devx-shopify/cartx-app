const RADIUS_MAP = {
  none: "0",
  small: "4px",
  medium: "10px",
  large: "12px",
  pill: "999px",
};
const HEADING_SIZE_MAP = { small: "14px", medium: "16px", large: "18px" };
const BODY_SIZE_MAP = { small: "12px", medium: "13px", large: "14px" };
const IMG_SIZE_MAP = { small: 56, medium: 72, large: 96 };
const DENSITY_MAP = { compact: 8, comfortable: 14, spacious: 20 };

const DUMMY_ITEMS = [
  {
    title: "Classic Cotton T-Shirt",
    variant: "Black / M",
    price: "$29.00",
    qty: 2,
  },
];

const CLAIM_GIFTS = [
  { title: "Mini Perfume Sample", inCart: false },
  { title: "Branded Tote Bag", inCart: true },
];

export default function CartPreview({ settings }) {
  const c = settings.colors || {};
  const sh = settings.shape || {};
  const t = settings.typography || {};
  const tx = settings.text || {};
  const l = settings.layout || {};

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

  return (
    <div
      style={{
        background: bg,
        color: text,
        width: "100%",
        borderRadius: 12,
        boxShadow: "0 4px 24px rgba(0,0,0,0.10), 0 1px 3px rgba(0,0,0,0.06)",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontSize: bodySize,
        overflow: "hidden",
        border: "1px solid #e0e0e0",
      }}
    >
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

      {/* ── Progress bar ── */}
      <div
        style={{
          padding: "10px 16px 22px",
          borderBottom: `1px solid ${border}`,
          background: bg,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: accent,
            textAlign: "center",
            marginBottom: 8,
            lineHeight: 1.3,
          }}
        >
          Spend $15 more for free shipping!
        </div>
        <div style={{ height: 5, background: "#f3f4f6", borderRadius: 3 }}>
          <div
            style={{
              width: "60%",
              height: "100%",
              background: primary,
              borderRadius: 3,
            }}
          />
        </div>
      </div>

      {/* ── Claim Gifts ── */}
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

      {/* ── Regular line items ── */}
      {DUMMY_ITEMS.map((item, i) => (
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
              <div
                style={{
                  fontSize: 10,
                  color: textSec,
                  textTransform: "uppercase",
                  letterSpacing: 0.3,
                  fontWeight: 600,
                }}
              >
                Brand Name
              </div>
            )}
            <div
              style={{
                fontWeight: 500,
                fontSize: bodySize,
                color: text,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {item.title}
            </div>
            {l.show_variant_title !== false && (
              <div
                style={{ fontSize: `calc(${bodySize} - 1px)`, color: textSec }}
              >
                {item.variant}
              </div>
            )}
            <div
              style={{
                fontWeight: 600,
                fontSize: bodySize,
                color: text,
                marginTop: 1,
              }}
            >
              {item.price}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 4,
              }}
            >
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
      ))}

      {/* ── Free gift line item ── */}
      <div
        style={{
          display: "flex",
          gap: 10,
          padding: `${density}px 16px`,
          borderBottom: `1px solid ${border}`,
          background: `${accent}08`,
          borderBottomColor: `${accent}20`,
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
          {l.show_variant_title !== false && (
            <div
              style={{ fontSize: `calc(${bodySize} - 1px)`, color: textSec }}
            >
              Rose
            </div>
          )}
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
      <div
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

      {/* ── Ribbon ── */}
      <div
        style={{
          padding: "7px 12px",
          margin: "4px 16px 8px",
          background: primary,
          color: primaryText,
          fontSize: 11,
          fontWeight: 600,
          textAlign: "center",
          borderRadius: `calc(${radius} * 0.75)`,
          letterSpacing: 0.3,
        }}
      >
        Free shipping on orders over $50!
      </div>

      {/* ── Footer ── */}
      <div
        style={{
          padding: "10px 16px 14px",
          borderTop: `1px solid ${border}`,
          background: bg,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
            color: textSec,
            marginBottom: 2,
          }}
        >
          <span>{tx.subtotal_label || "Subtotal"}</span>
          <span>$118.00</span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
            color: accent,
            fontWeight: 500,
            marginBottom: 6,
          }}
        >
          <span>SUMMER20</span>
          <span>−$15.00</span>
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
          <div style={btnStyle}>{tx.checkout_button || "Checkout"}</div>
        </div>
      </div>
    </div>
  );
}

function QtyMock({ border, text, textSec, bg, radius, qty, minimal }) {
  const minStyle = minimal
    ? {
        background: "#f3f4f6",
        borderRadius: radius,
        width: 24,
        height: 24,
        lineHeight: "24px",
        fontSize: 12,
      }
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
        −
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
