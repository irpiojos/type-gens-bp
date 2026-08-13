"use client";

import { useEffect, useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { ILLUSTRATION_AVATARS } from "@/lib/constants";
import { deleteMember, upsertMember } from "@/lib/actions";
import { useToast } from "@/components/ui/toast";
import { MemberAvatar } from "@/components/ui/member-avatar";
import type { Member } from "@/lib/db/schema";
import clsx from "clsx";

export function MemberModal({
  open,
  onOpenChange,
  yearId,
  member,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  yearId: string;
  member?: Member | null;
}) {
  const { undoableDelete } = useToast();
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(ILLUSTRATION_AVATARS[0]);
  const [avatarType, setAvatarType] = useState<"illustration" | "upload">("illustration");
  const [active, setActive] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setName(member?.name ?? "");
    setAvatarUrl(member?.avatarUrl ?? ILLUSTRATION_AVATARS[0]);
    setAvatarType((member?.avatarType as "illustration" | "upload") ?? "illustration");
    setActive(member?.active ?? true);
  }, [open, member]);

  function onFile(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarType("upload");
      setAvatarUrl(String(reader.result));
    };
    reader.readAsDataURL(file);
  }

  function onSave() {
    start(async () => {
      try {
        await upsertMember({
          id: member?.id,
          name,
          avatarUrl,
          avatarType,
          active,
          yearId,
        });
        onOpenChange(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save");
      }
    });
  }

  function onDelete() {
    if (!member?.id) return;
    start(async () => {
      const res = await deleteMember(member.id);
      if (!res.ok) {
        setError("Cannot delete: tasks still reference this member. Deactivate instead.");
        return;
      }
      undoableDelete("member", member.id, "Member deleted");
      onOpenChange(false);
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={member ? "Edit Team Member" : "Add Team Member"}
    >
      <div className="grid gap-4">
        <div className="flex justify-center">
          <MemberAvatar name={name || "New"} avatarUrl={avatarUrl} size={88} />
        </div>
        <label className="text-sm">
          <span className="mb-1 block text-ink/60">Name</span>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <div>
          <p className="mb-2 text-sm text-ink/60">Pick illustration</p>
          <div className="flex flex-wrap gap-2">
            {ILLUSTRATION_AVATARS.map((src) => (
              <button
                key={src}
                type="button"
                className={clsx(
                  "rounded-full",
                  avatarUrl === src && avatarType === "illustration" && "ring-2 ring-blue-500",
                )}
                onClick={() => {
                  setAvatarType("illustration");
                  setAvatarUrl(src);
                }}
              >
                <MemberAvatar name={name || "x"} avatarUrl={src} size={48} />
              </button>
            ))}
          </div>
        </div>

        <label className="text-sm">
          <span className="mb-1 block text-ink/60">Or upload avatar</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Active
        </label>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-6 flex justify-end gap-2">
        {member?.id ? (
          <button type="button" className="btn-warn" disabled={pending} onClick={onDelete}>
            Delete
          </button>
        ) : null}
        <button type="button" className="btn-outline" disabled={pending} onClick={onSave}>
          Save
        </button>
      </div>
    </Modal>
  );
}