import { redirect } from "react-router";
import { logout } from "../lib/admin-auth.server.js";
import { assertPublicPageEnabled } from "../lib/public-site.server.js";

export const action = async ({ request }) => {
  assertPublicPageEnabled(request);
  return logout(request);
};

// A bare GET shouldn't render anything — bounce to login.
export const loader = async ({ request }) => {
  assertPublicPageEnabled(request);
  return redirect("/enterprise/login");
};
