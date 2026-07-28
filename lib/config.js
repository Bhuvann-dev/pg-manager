/*
App configuration flags.

AUTH_ENABLED toggles Firebase Authentication. Authenticated mode is the
DEFAULT: the app requires sign-in and scopes every owner's data to their
account. To run without a login gate (a local sandbox using a fixed owner
id), set NEXT_PUBLIC_AUTH_ENABLED=false. All the auth code (AuthContext,
login/signup pages, route guard) stays in place — this is just a switch.
See docs/decisions.md ADR-006, ADR-007.
*/

export const AUTH_ENABLED =
  process.env.NEXT_PUBLIC_AUTH_ENABLED !== "false";

// Owner id used for all data while AUTH_ENABLED is false (sandbox mode).
export const LOCAL_OWNER_ID = "local-dev";
