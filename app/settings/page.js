"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useSettings } from "../../contexts/SettingsContext";
import { useToast } from "../../contexts/ToastContext";
import { saveSettings } from "../../services/settingsService";
import { Loading } from "../../components/States";

export default function SettingsPage() {
  const { user } = useAuth();
  const { settings, refresh } = useSettings();
  const { toast } = useToast();

  const [pgName, setPgName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [upiId, setUpiId] = useState("");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  // Seed the form once settings have loaded.
  useEffect(() => {
    setPgName(settings.pgName || "");
    setOwnerName(settings.ownerName || "");
    setUpiId(settings.upiId || "");
    setReady(true);
  }, [settings]);

  const upiValid = !upiId || /^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upiId);

  const handleSave = async () => {
    if (!upiValid) {
      toast("Enter a valid UPI ID, e.g. name@bank.", "error");
      return;
    }

    setSaving(true);
    const ok = await saveSettings(user.uid, {
      pgName: pgName.trim(),
      ownerName: ownerName.trim(),
      upiId: upiId.trim()
    });
    setSaving(false);

    if (ok) {
      await refresh();
      toast("Settings saved", "success");
    } else {
      toast("Could not save settings.", "error");
    }
  };

  if (!ready) return <Loading label="Loading settings…" />;

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-1">Settings</h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
        Your property details and payee info.
      </p>

      <div className="card p-6 space-y-4">
        <div>
          <label className="label">PG / Property Name</label>
          <input
            className="input"
            value={pgName}
            placeholder="e.g. Sunrise Boys PG"
            onChange={(e) => setPgName(e.target.value)}
          />
          <p className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>
            Shown in the sidebar.
          </p>
        </div>

        <div>
          <label className="label">Owner Name</label>
          <input
            className="input"
            value={ownerName}
            placeholder="Your name"
            onChange={(e) => setOwnerName(e.target.value)}
          />
        </div>

        <div>
          <label className="label">UPI ID</label>
          <input
            className="input"
            value={upiId}
            placeholder="name@bank"
            onChange={(e) => setUpiId(e.target.value)}
          />
          <p className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>
            Saved for upcoming rent payment links. Not shared with tenants yet.
          </p>
          {!upiValid && (
            <p className="text-xs mt-1 t-danger">
              That doesn&apos;t look like a valid UPI ID.
            </p>
          )}
        </div>

        <div className="pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary"
          >
            {saving ? "Saving…" : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
