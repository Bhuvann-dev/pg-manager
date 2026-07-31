"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState
} from "react";

import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  signOut
} from "firebase/auth";

import { auth, googleProvider } from "../lib/firebase";
import { AUTH_ENABLED, LOCAL_OWNER_ID } from "../lib/config";

/*
Auth context — the single source of truth for the signed-in owner.

The whole app is scoped to `user.uid`. Components read the owner from
here; the service layer uses the uid to scope every Firestore query and
write. See docs/decisions.md ADR-006 for why auth lives in the client.
*/

/**
 * @typedef {Object} AuthContextValue
 * @property {import('firebase/auth').User | null} user
 * @property {boolean} loading
 * @property {(email: string, password: string) => Promise<any>} signup
 * @property {(email: string, password: string) => Promise<any>} login
 * @property {() => Promise<any>} loginWithGoogle
 * @property {(email: string) => Promise<void>} resetPassword
 * @property {() => Promise<void>} logout
 */

/** @type {import('react').Context<AuthContextValue | null>} */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Auth disabled: run as a fixed local owner, no Firebase session.
    if (!AUTH_ENABLED) {
      setUser({ uid: LOCAL_OWNER_ID, email: "local (auth off)" });
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signup = (email, password) =>
    createUserWithEmailAndPassword(auth, email, password);

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const loginWithGoogle = () =>
    signInWithPopup(auth, googleProvider);

  const resetPassword = (email) =>
    sendPasswordResetEmail(auth, email);

  const logout = () => signOut(auth);

  const value = {
    user,
    loading,
    signup,
    login,
    loginWithGoogle,
    resetPassword,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
