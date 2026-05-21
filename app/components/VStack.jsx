// Vertical flex stack with reliable gap.
// Use instead of `s-stack direction="block"` — the polaris-web-components
// `gap` prop doesn't always render correctly through shadow DOM, so we
// apply CSS gap directly on a real <div>.
//
// Gap prop accepts the Polaris space-token integers (200/300/400/...)
// and translates them to pixels, matching Shopify's 4px scale.

const GAP_PX = {
  100: 4,
  200: 8,
  300: 12,
  400: 16,
  500: 20,
  600: 24,
  800: 32,
};

export default function VStack({ gap = 400, children, style }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: GAP_PX[gap] ?? Number(gap), ...style }}>
      {children}
    </div>
  );
}
