"use client";

import { useState, useTransition } from "react";
import { changePassword } from "@/lib/actions";

export function ChangePasswordForm() {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <button type="button" className="text-xs underline" onClick={() => setOpen(true)}>
        Change password
      </button>
    );
  }

  return (
    <form
      className="mt-2 max-w-sm space-y-2 rounded-xl border border-black/15 bg-white p-3 shadow-[0_2px_0_#1a1a1a]"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg("");
        setErr("");
        start(async () => {
          const res = await changePassword(currentPassword, newPassword);
          if (!res.ok) {
            setErr(res.error);
            return;
          }
          setMsg("Password updated.");
          setCurrent("");
          setNew("");
        });
      }}
    >
      <p className="text-sm font-bold">Change password</p>
      <input
        className="field"
        type="password"
        placeholder="Current password"
        value={currentPassword}
        onChange={(e) => setCurrent(e.target.value)}
        autoComplete="current-password"
        required
      />
      <input
        className="field"
        type="password"
        placeholder="New password (min 6)"
        value={newPassword}
        onChange={(e) => setNew(e.target.value)}
        autoComplete="new-password"
        required
        minLength={6}
      />
      {err ? <p className="text-xs text-red-600">{err}</p> : null}
      {msg ? <p className="text-xs text-ink/60">{msg}</p> : null}
      <div className="flex gap-2">
        <button type="submit" className="btn-outline text-xs" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" className="text-xs underline" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}