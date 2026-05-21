import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  try {
    const res = await admin.graphql(
      `#graphql
      query ListPages($first: Int!) {
        pages(first: $first, sortKey: TITLE) {
          edges {
            node {
              id
              handle
              title
              isPublished
            }
          }
        }
      }`,
      { variables: { first: 100 } },
    );
    const json = await res.json();
    if (json.errors) {
      console.error("[cartx] /api/pages graphql errors:", json.errors);
      return Response.json({ error: "Failed to load pages" }, { status: 500 });
    }
    const pages = (json.data?.pages?.edges ?? []).map((e) => ({
      id: e.node.id,
      handle: e.node.handle,
      title: e.node.title,
      published: e.node.isPublished,
    }));
    return Response.json({ pages });
  } catch (err) {
    console.error("[cartx] /api/pages loader error:", err);
    return Response.json({ error: err.message || "Failed to load pages" }, { status: 500 });
  }
};
