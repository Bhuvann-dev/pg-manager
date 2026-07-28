"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef
} from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

/*
Toast notifications + a promise-based confirm dialog, replacing the
browser's alert()/confirm(). useToast() exposes:
  toast(message, type?)  -> transient notification ("info"|"success"|"error")
  confirm(message, opts?) -> Promise<boolean> from a styled dialog
*/

const ToastContext = createContext(null);

const TOAST_ICON = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info
};

const TOAST_ACCENT = {
  success: "var(--success)",
  error: "var(--danger)",
  info: "var(--accent)"
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message, type = "info") => {
      const id = (idRef.current += 1);
      setToasts((list) => [...list, { id, message, type }]);
      setTimeout(() => dismiss(id), 3400);
    },
    [dismiss]
  );

  const confirm = useCallback(
    (message, opts = {}) =>
      new Promise((resolve) => {
        setDialog({
          message,
          title: opts.title || "Please confirm",
          confirmLabel: opts.confirmLabel || "Confirm",
          danger: Boolean(opts.danger),
          resolve
        });
      }),
    []
  );

  const closeDialog = (value) => {
    if (dialog) dialog.resolve(value);
    setDialog(null);
  };

  return (
    <ToastContext.Provider value={{ toast, confirm }}>
      {children}

      {/* Toast stack */}
      <div className="fixed z-[60] bottom-4 inset-x-4 md:inset-x-auto md:right-6 md:bottom-6 flex flex-col items-center md:items-end gap-2 pointer-events-none">
        {toasts.map((t) => {
          const Icon = TOAST_ICON[t.type] || Info;
          return (
            <div
              key={t.id}
              className="card pointer-events-auto flex items-center gap-3 pl-3 pr-2 py-2.5 w-full max-w-sm"
              style={{ borderLeft: `3px solid ${TOAST_ACCENT[t.type] || TOAST_ACCENT.info}` }}
            >
              <span style={{ color: TOAST_ACCENT[t.type] || TOAST_ACCENT.info }}>
                <Icon size={18} />
              </span>
              <span className="text-sm flex-1">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="btn-ghost rounded-md p-1"
                aria-label="Dismiss"
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Confirm dialog */}
      {dialog && (
        <div className="modal-backdrop z-[70]">
          <div className="card p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-1">{dialog.title}</h2>
            <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
              {dialog.message}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => closeDialog(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => closeDialog(true)}
                className={`btn ${dialog.danger ? "btn-danger" : "btn-primary"}`}
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
