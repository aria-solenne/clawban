"use client";

import * as React from "react";
import clsx from "clsx";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export function UnlockEditing({ onUnlock }: { onUnlock: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [pw, setPw] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function submit() {
    setErr(null);
    if (!pw.trim()) return;
    setBusy(true);
    try {
      await api("/api/auth", { method: "POST", body: JSON.stringify({ password: pw }) });
      setOpen(false);
      setPw("");
      onUnlock();
    } catch {
      setErr("Nope. Wrong password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="rounded-full border border-ink/15 bg-paper/70 px-3 py-1.5 text-[13px] text-ink/70 shadow-sm">
        View-only
      </div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-ink/15 bg-paper/70 px-3 py-1.5 text-[13px] text-ink hover:border-ink/25 shadow-sm"
      >
        Unlock editing
      </button>

      {open ? (
        <div className="w-full rounded-3xl border border-ink/10 bg-paper/70 p-3 shadow-sm">
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <label>
              <div className="mb-1 text-[11px] tracking-wide text-ink/60">Edit password</div>
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
                className="w-full rounded-2xl border border-ink/10 bg-paper/60 px-3 py-2 text-[13px] text-ink outline-none focus:border-ink/25"
              />
            </label>

            <div className="flex items-end justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-full border border-ink/15 bg-transparent px-3 py-1.5 text-[13px] text-ink/80 hover:border-ink/25"
              >
                Cancel
              </button>
              <button
                disabled={busy || !pw.trim()}
                onClick={submit}
                className={clsx(
                  "rounded-full border px-3 py-1.5 text-[13px]",
                  "border-hot/35 bg-hot/10 text-hot hover:bg-hot/15",
                  (busy || !pw.trim()) && "opacity-50"
                )}
              >
                Unlock
              </button>
            </div>
          </div>

          {err ? <div className="mt-2 text-[12px] text-hot">{err}</div> : null}
          <div className="mt-2 text-[11px] text-ink/55">
            This sets an edit cookie in your browser (30 days).
          </div>
        </div>
      ) : null}
    </div>
  );
}
