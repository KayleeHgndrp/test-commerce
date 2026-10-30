"use client";

import { useEffect, useState } from "react";
import { passKey } from "./ResultPreview";

// Remembers a pack or all-access pass on this device, so the result page of
// the next test can unlock its report. The id comes from the thanks page or,
// on another device, from the link in the report email (?id=).
export function PassSaver({ sessionId, ok, invalid }: { sessionId?: string; ok: string; invalid?: string }) {
  const [state, setState] = useState<"saved" | "invalid" | null>(sessionId ? "saved" : null);

  useEffect(() => {
    const id = sessionId ?? new URLSearchParams(window.location.search).get("id") ?? "";
    const save = () => {
      try {
        localStorage.setItem(passKey, JSON.stringify({ session: id }));
      } catch {}
    };
    if (sessionId) return save();
    fetch(`/api/pass?id=${encodeURIComponent(id)}`)
      .then((res) => {
        if (res.ok) save();
        setState(res.ok ? "saved" : "invalid");
      })
      .catch(() => setState("invalid"));
  }, [sessionId]);

  if (!state) return <div className="h-12" />;
  return <p className={`font-semibold ${state === "saved" ? "text-accent" : "text-rose-600"}`}>{state === "saved" ? ok : invalid}</p>;
}
