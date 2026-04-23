import { useLoaderData, useFetcher, Link } from "react-router";
import { useEffect } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  loadConfig,
  saveConfig,
  getShopAndTheme,
  getSelectedTheme,
} from "../lib/config.server.js";
import { getFreebieDiscountStatus } from "../lib/discount.server.js";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const preferred = await getSelectedTheme(session.shop);
  const { shopId, themeId } = await getShopAndTheme(admin, session, preferred);
  const config = await loadConfig(shopId, themeId);

  const activePromotions = [];
  for (const offer of config.offers) {
    if (offer.enabled) {
      activePromotions.push({ name: offer.name, type: "Offer", id: offer.id });
    }
  }
  for (const coupon of config.coupons) {
    if (coupon.enabled) {
      activePromotions.push({
        name: coupon.is_automatic ? coupon.title : coupon.code,
        type: "Coupon",
        id: coupon.id,
      });
    }
  }
  for (const gift of config.claim_gifts) {
    if (gift.enabled) {
      activePromotions.push({
        name: gift.name,
        type: "Claim Gift",
        id: gift.id,
      });
    }
  }

  let discountFunctionActive = false;
  try {
    const dfStatus = await getFreebieDiscountStatus(admin, session.shop);
    discountFunctionActive = dfStatus.active;
  } catch {
    // Function may not be deployed yet
  }

  return {
    totalPromotions:
      config.offers.length + config.coupons.length + config.claim_gifts.length,
    activePromotions,
    progressBarEnabled: config.progress_bar.enabled,
    upsellsEnabled: config.upsells.enabled,
    upsellsCount: config.upsells.products.length,
    bottomRibbonEnabled: config.bottom_ribbon.enabled,
    milestonesCount: config.progress_bar.visual_milestones.length,
    discountFunctionActive,
  };
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const preferred = await getSelectedTheme(session.shop);
  const { shopId, themeId } = await getShopAndTheme(admin, session, preferred);
  const config = await loadConfig(shopId, themeId);
  const body = await request.json();

  if (body._action === "toggle_progress_bar") {
    config.progress_bar.enabled = !config.progress_bar.enabled;
  } else if (body._action === "toggle_upsells") {
    config.upsells.enabled = !config.upsells.enabled;
  } else if (body._action === "toggle_ribbon") {
    config.bottom_ribbon.enabled = !config.bottom_ribbon.enabled;
  }

  await saveConfig(shopId, themeId, config);
  return { ok: true };
};

const PROMO_BADGE_TONE = {
  Offer: "cx-badge-magic",
  Coupon: "cx-badge-info",
  "Claim Gift": "cx-badge-success",
};

function Toggle({ checked, onChange, label }) {
  return (
    <label className="cx-toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
      />
      <span className="cx-toggle-track" />
      {label && <span className="cx-toggle-label">{label}</span>}
    </label>
  );
}

export default function Dashboard() {
  const data = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  useEffect(() => {
    if (fetcher.data?.ok) {
      shopify.toast.show("Updated");
    }
  }, [fetcher.data, shopify]);

  function handleToggle(actionName) {
    fetcher.submit(JSON.stringify({ _action: actionName }), {
      method: "POST",
      encType: "application/json",
    });
  }

  const hasPromotions = data.totalPromotions > 0;
  const hasActivePromotions = data.activePromotions.length > 0;

  return (
    <s-page heading="Cart Max">
      <s-button
        slot="primary-action"
        variant="primary"
        href="/app/promotions/new?type=offer"
      >
        Create promotion
      </s-button>

      <div className="cx-layout cx-layout-wide">
        {/* Onboarding */}
        {!hasPromotions && (
          <div className="cx-card">
            <div className="cx-card-header">
              <h3 className="cx-card-title">Get started with Cart Max</h3>
            </div>
            <div className="cx-card-body">
              <div className="cx-banner cx-banner-info" style={{ marginBottom: 20 }}>
                <svg className="cx-banner-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3a1 1 0 110 2 1 1 0 010-2zm2 8H6v-1h1V8H6V7h3v4h1v1z"/>
                </svg>
                <span>Welcome! Set up your cart drawer experience in a few simple steps.</span>
              </div>
              <div className="cx-steps">
                <div className="cx-step">
                  <span className="cx-step-number">1</span>
                  <div className="cx-step-content">
                    <div className="cx-step-title">
                      <Link to="/app/promotions/new?type=offer">Create your first offer</Link>
                    </div>
                    <div className="cx-step-desc">Add free gifts, BOGO deals, or cart freebies</div>
                  </div>
                </div>
                <div className="cx-step">
                  <span className="cx-step-number">2</span>
                  <div className="cx-step-content">
                    <div className="cx-step-title">
                      <Link to="/app/settings">Configure settings</Link>
                    </div>
                    <div className="cx-step-desc">Set up the progress bar, upsells, and ribbon</div>
                  </div>
                </div>
                <div className="cx-step">
                  <span className="cx-step-number">3</span>
                  <div className="cx-step-content">
                    <div className="cx-step-title">Preview your cart drawer</div>
                    <div className="cx-step-desc">Open your storefront to see it in action</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard grid */}
        {hasPromotions && (
          <div className="cx-grid-sidebar">
            {/* Main content */}
            <div className="cx-flex-col cx-gap-lg">
              {/* Stats row */}
              <div className="cx-grid-3">
                <div className="cx-stat">
                  <span className="cx-stat-label">Total</span>
                  <span className="cx-stat-value">{data.totalPromotions}</span>
                  <span className="cx-stat-footer">Promotions created</span>
                </div>
                <div className="cx-stat">
                  <span className="cx-stat-label">Active</span>
                  <span className="cx-stat-value">{data.activePromotions.length}</span>
                  <span className="cx-stat-footer">Running now</span>
                </div>
                <div className="cx-stat">
                  <span className="cx-stat-label">Milestones</span>
                  <span className="cx-stat-value">{data.milestonesCount}</span>
                  <span className="cx-stat-footer">Visual milestones</span>
                </div>
              </div>

              {/* Active promotions */}
              <div className="cx-card">
                <div className="cx-card-header">
                  <h3 className="cx-card-title">Active promotions</h3>
                  <Link to="/app/promotions" className="cx-btn-link">
                    View all ({data.totalPromotions})
                  </Link>
                </div>
                {hasActivePromotions ? (
                  <>
                    {data.activePromotions.slice(0, 5).map((promo) => (
                      <div className="cx-list-item" key={promo.id}>
                        <div className="cx-list-item-info">
                          <div className="cx-flex cx-items-center cx-gap-sm">
                            <span className="cx-list-item-title">{promo.name}</span>
                            <span className={`cx-badge ${PROMO_BADGE_TONE[promo.type]}`}>
                              {promo.type}
                            </span>
                          </div>
                        </div>
                        <Link to={`/app/promotions/${promo.id}`} className="cx-btn cx-btn-ghost cx-btn-sm">
                          Edit
                        </Link>
                      </div>
                    ))}
                    {data.activePromotions.length > 5 && (
                      <div className="cx-card-footer">
                        <Link to="/app/promotions" className="cx-btn-link">
                          View all {data.activePromotions.length} active promotions
                        </Link>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="cx-empty">
                    <p className="cx-empty-title">No active promotions</p>
                    <p className="cx-empty-desc">
                      Enable an existing promotion or create a new one.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="cx-flex-col cx-gap-base">
              <div className="cx-feature">
                <div className="cx-feature-header">
                  <span className="cx-feature-title">Progress Bar</span>
                  <Toggle
                    checked={data.progressBarEnabled}
                    onChange={() => handleToggle("toggle_progress_bar")}
                  />
                </div>
                <span className="cx-feature-meta">
                  {data.milestonesCount} visual milestone{data.milestonesCount !== 1 ? "s" : ""}
                </span>
                <Link to="/app/settings" className="cx-btn-link">Configure</Link>
              </div>

              <div className="cx-feature">
                <div className="cx-feature-header">
                  <span className="cx-feature-title">Upsells</span>
                  <Toggle
                    checked={data.upsellsEnabled}
                    onChange={() => handleToggle("toggle_upsells")}
                  />
                </div>
                <span className="cx-feature-meta">
                  {data.upsellsEnabled
                    ? `${data.upsellsCount} product${data.upsellsCount !== 1 ? "s" : ""}`
                    : "Disabled"}
                </span>
                <Link to="/app/settings" className="cx-btn-link">Configure</Link>
              </div>

              <div className="cx-feature">
                <div className="cx-feature-header">
                  <span className="cx-feature-title">Bottom Ribbon</span>
                  <Toggle
                    checked={data.bottomRibbonEnabled}
                    onChange={() => handleToggle("toggle_ribbon")}
                  />
                </div>
                <span className="cx-feature-meta">
                  {data.bottomRibbonEnabled ? "Enabled" : "Disabled"}
                </span>
                <Link to="/app/settings" className="cx-btn-link">Configure</Link>
              </div>

              <div className="cx-feature">
                <div className="cx-feature-header">
                  <span className="cx-feature-title">Gift Discount</span>
                  <span className={`cx-badge cx-badge-dot ${data.discountFunctionActive ? "cx-badge-success" : "cx-badge-warning"}`}>
                    {data.discountFunctionActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <span className="cx-feature-meta">
                  {data.discountFunctionActive
                    ? "Auto-discounts gifts at checkout"
                    : "Not configured"}
                </span>
                <Link to="/app/promotions?tab=discount-function" className="cx-btn-link">Configure</Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
