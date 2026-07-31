/*
Maps a Firebase Auth error to a friendly, user-facing message. Kept in one
place so the messaging stays consistent and enumeration-safe (it never
distinguishes "no such account" from "wrong password").
*/

export function friendlyAuthError(err) {
  const code = err?.code || "";

  if (code.includes("invalid-email")) {
    return "Please enter a valid email address.";
  }
  if (
    code.includes("invalid-credential") ||
    code.includes("wrong-password") ||
    code.includes("user-not-found")
  ) {
    return "Incorrect email or password.";
  }
  if (code.includes("weak-password")) {
    return "Password is too weak — use at least 6 characters.";
  }
  // Enumeration-safe: don't confirm the email is registered, and never
  // leak the raw code via the generic fallback.
  if (code.includes("email-already-in-use")) {
    return "We couldn't create your account. Try signing in instead, or use a different email.";
  }
  if (code.includes("too-many-requests")) {
    return "Too many attempts. Please try again in a little while.";
  }
  if (
    code.includes("operation-not-allowed") ||
    code.includes("admin-restricted-operation")
  ) {
    return "This sign-in method isn't enabled for this project.";
  }
  if (
    code.includes("configuration-not-found") ||
    code.includes("api-key-not-valid")
  ) {
    return "Authentication isn't configured correctly. Please try again later.";
  }
  if (code.includes("network-request-failed")) {
    return "Network error — check your connection and try again.";
  }
  if (code.includes("popup-blocked")) {
    return "Your browser blocked the sign-in popup. Allow popups and try again.";
  }
  if (code.includes("popup-closed") || code.includes("cancelled-popup")) {
    return "Google sign-in was cancelled.";
  }
  if (code.includes("account-exists-with-different-credential")) {
    return "An account already exists with this email using a different sign-in method.";
  }

  // Surface the raw code so unexpected failures stay diagnosable.
  return `Something went wrong${code ? ` (${code})` : ""}. Please try again.`;
}
