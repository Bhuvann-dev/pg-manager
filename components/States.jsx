"use client";

import { Loader2 } from "lucide-react";

/*
Shared loading and empty-state components so every screen handles the
"still loading" and "nothing here yet" cases consistently instead of
flashing a blank table.
*/

export function Loading({ label = "Loading…" }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <Loader2 size={28} className="animate-spin mb-3" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      {Icon && (
        <div className="mb-4 text-gray-500">
          <Icon size={40} />
        </div>
      )}

      <h3 className="text-lg font-semibold">{title}</h3>

      {message && (
        <p className="text-gray-400 text-sm mt-1 max-w-sm">{message}</p>
      )}

      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/*
A shimmering placeholder row, sized to the tenants/rooms tables.
*/

export function SkeletonRows({ rows = 5, cols = 6 }) {
  return (
    <div className="divide-y divide-slate-800">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 p-3">
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className="h-4 flex-1 rounded bg-slate-800 animate-pulse"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
