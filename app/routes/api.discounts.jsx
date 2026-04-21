import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const url = new URL(request.url);
  const search = url.searchParams.get("q") || "";

  // Build search query — Shopify uses a specific query syntax
  const searchFilter = search ? `title:*${search}*` : "";

  const res = await admin.graphql(
    `#graphql
    query discounts($first: Int!, $query: String) {
      discountNodes(first: $first, query: $query, sortKey: CREATED_AT, reverse: true) {
        nodes {
          id
          discount {
            __typename
            ... on DiscountCodeBasic {
              title
              status
              codes(first: 1) { nodes { code } }
              customerGets {
                value {
                  ... on DiscountPercentage { percentage }
                  ... on DiscountAmount { amount { amount currencyCode } }
                }
              }
              minimumRequirement {
                ... on DiscountMinimumQuantity { greaterThanOrEqualToQuantity }
                ... on DiscountMinimumSubtotal { greaterThanOrEqualToSubtotal { amount currencyCode } }
              }
            }
            ... on DiscountCodeFreeShipping {
              title
              status
              codes(first: 1) { nodes { code } }
              minimumRequirement {
                ... on DiscountMinimumQuantity { greaterThanOrEqualToQuantity }
                ... on DiscountMinimumSubtotal { greaterThanOrEqualToSubtotal { amount currencyCode } }
              }
            }
            ... on DiscountAutomaticBasic {
              title
              status
              customerGets {
                value {
                  ... on DiscountPercentage { percentage }
                  ... on DiscountAmount { amount { amount currencyCode } }
                }
              }
              minimumRequirement {
                ... on DiscountMinimumQuantity { greaterThanOrEqualToQuantity }
                ... on DiscountMinimumSubtotal { greaterThanOrEqualToSubtotal { amount currencyCode } }
              }
            }
            ... on DiscountAutomaticFreeShipping {
              title
              status
              minimumRequirement {
                ... on DiscountMinimumQuantity { greaterThanOrEqualToQuantity }
                ... on DiscountMinimumSubtotal { greaterThanOrEqualToSubtotal { amount currencyCode } }
              }
            }
            ... on DiscountCodeBxgy {
              title
              status
              codes(first: 1) { nodes { code } }
            }
            ... on DiscountAutomaticBxgy {
              title
              status
            }
            ... on DiscountCodeApp {
              title
              status
              codes(first: 1) { nodes { code } }
            }
            ... on DiscountAutomaticApp {
              title
              status
            }
          }
        }
      }
    }`,
    { variables: { first: 50, query: searchFilter || null } }
  );

  const json = await res.json();
  const nodes = json.data?.discountNodes?.nodes || [];

  const discounts = nodes.map((node) => {
    const d = node.discount;
    if (!d || !d.__typename) return null;

    const typeName = d.__typename;
    const isAutomatic = typeName.startsWith("DiscountAutomatic");
    const code = d.codes?.nodes?.[0]?.code || "";
    const title = d.title || code || "Untitled";
    const status = d.status || "ACTIVE";

    // Determine type label from discount value
    let typeLabel = "Discount";
    if (typeName.includes("FreeShipping")) {
      typeLabel = "Free Shipping";
    } else if (typeName.includes("BuyXGetY")) {
      typeLabel = "Buy X Get Y";
    } else {
      const value = d.customerGets?.value;
      if (value?.percentage != null) {
        typeLabel = Math.round(value.percentage * 100) + "% OFF";
      } else if (value?.amount?.amount != null) {
        typeLabel = value.amount.currencyCode + " " + parseFloat(value.amount.amount).toFixed(0) + " OFF";
      }
    }

    // Minimum requirement
    let triggerType = null;
    let triggerThreshold = null;
    const min = d.minimumRequirement;
    if (min?.greaterThanOrEqualToSubtotal) {
      triggerType = "price";
      triggerThreshold = parseFloat(min.greaterThanOrEqualToSubtotal.amount);
    } else if (min?.greaterThanOrEqualToQuantity) {
      triggerType = "quantity";
      triggerThreshold = parseInt(min.greaterThanOrEqualToQuantity, 10);
    }

    return {
      id: node.id,
      code: isAutomatic ? "" : code,
      title,
      status,
      type_label: typeLabel,
      is_automatic: isAutomatic,
      trigger_type: triggerType,
      trigger_threshold: triggerThreshold,
    };
  }).filter(Boolean);

  return Response.json({ discounts });
};
