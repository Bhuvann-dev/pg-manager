"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback
} from "react";
import { useAuth } from "./AuthContext";
import { getSettings } from "../services/settingsService";

/*
Loads the signed-in owner's settings (PG name, owner name, UPI ID) and
exposes them app-wide — the sidebar uses pgName for branding, the Settings
page reads/refreshes them.
*/

/**
 * @typedef {Object} SettingsValue
 * @property {{ pgName?: string, ownerName?: string, upiId?: string, ownerId?: string }} settings
 * @property {() => Promise<void>} refresh
 */

/** @type {import('react').Context<SettingsValue | null>} */
const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState({});

  const refresh = useCallback(async () => {
    if (!user) {
      setSettings({});
      return;
    }
    setSettings((await getSettings(user.uid)) || {});
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <SettingsContext.Provider value={{ settings, refresh }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within a SettingsProvider");
  return ctx;
}
