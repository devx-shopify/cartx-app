// Serve /robots.txt so crawler hits don't 404 (cartx.fly.dev is the app
// backend, not a public storefront — disallow everything).
export const loader = () => {
  return new Response("User-agent: *\nDisallow: /\n", {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=86400",
    },
  });
};
