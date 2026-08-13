"use client";

import { useState, useTransition } from "react";
import { changePassword } from "@/lib/actions";

export function ChangePasswordForm() {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [msg, setMsg] = useState("");
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
      className="mt-2 max-w-sm space-y-2 rounded-xl border border-black/15 bg-white p-3 shadow-[2px_2px_0_#1a1a1a]"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg("");
        start(async () => {
          try {
            await changePassword(currentPassword, newPassword);
            setMsg("Password updated.");
            setCurrent("");
            setNew("");
            setOpen(false);
          } catch (err) {
            setMsg(err instanceof Error ? err.message : "Could not update");
          }
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
        required
      />
      <input
        className="field"
        type="password"
        placeholder="New password (min 6)"
        value={newPassword}
        onChange={(e) => setNew(e.target.value)}
        required
        minLength={6}
      />
      {msg ? <p className="text-xs text-ink/60">{msg}</p> : null}
      <div className="flex gap-2">
        <button type="submit" className="btn-outline text-xs" disabled={pending}>
          Save
        </button>
        <button type="button" className="text-xs underline" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}