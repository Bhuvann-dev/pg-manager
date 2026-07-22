/*
App configuration flags.

AUTH_ENABLED toggles Firebase Authentication. While it is false, the app
runs WITHOUT sign-in: no login gate, and all data is scoped to a fixed
local owner id so you can build and test product features freely.

To require sign-in again, either flip this to true or set
NEXT_PUBLIC_AUTH_ENABLED=true in .env.local. All the auth code
(AuthContext, login/signup pages, route guard) stays in place — this is
just a switch. See docs/decisions.md ADR-006, ADR-007.
*/

export const AUTH_ENABLED =
  process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";

// Owner id used for all data while AUTH_ENABLED is false.
export const LOCAL_OWNER_ID = "local-dev";
