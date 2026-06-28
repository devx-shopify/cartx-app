import { redirect } from "react-router";
import { logout } from "../lib/admin-auth.server.js";

export const action = async ({ request }) => logout(request);

// A bare GET shouldn't render anything — bounce to login.
export const loader = async () => redirect("/enterprise/login");
