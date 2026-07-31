import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";
import {
  initializeAppCheck,
  ReCaptchaV3Provider
} from "firebase/app-check";

/*
Firebase web config.

These values are read from NEXT_PUBLIC_* env vars (see .env.example).
Firebase web config is not secret — it identifies the project in the
browser and is safe to expose. The real access control lives in the
Firestore/Storage security rules (see docs/data-model.md), which enforce
that an owner can only ever read or write their own data.
*/

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Reuse the existing app during Next.js hot-reload instead of re-initializing.
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

/*
App Check — protects the backend from abuse by unregistered clients
(denial-of-wallet, scripted writes). Enabled only when a reCAPTCHA v3 site
key is provided, and only in the browser. With no key it's a safe no-op,
so nothing breaks in dev/CI or before App Check is configured in the
Firebase console. Set NEXT_PUBLIC_RECAPTCHA_SITE_KEY and turn on
enforcement in Firebase to activate.
*/
const appCheckKey = process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_KEY;
if (typeof window !== "undefined" && appCheckKey) {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(appCheckKey),
      isTokenAutoRefreshEnabled: true
    });
  } catch (error) {
    // Ignore double-initialization during hot-reload.
    console.warn("App Check init skipped:", error?.message);
  }
}

export { app, db, auth, storage, googleProvider };
