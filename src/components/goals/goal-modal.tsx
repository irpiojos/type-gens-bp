"use client";

import { useEffect, useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { GOAL_STATUSES } from "@/lib/constants";
import { deleteGoal, upsertGoal } from "@/lib/actions";
import { useToast } from "@/components/ui/toast";
import type { Goal, Member, Project } from "@/lib/db/schema";

type ProjectDraft = { id?: string; name: string; delete?: boolean };

export function GoalModal({
  open,
  onOpenChange,
  yearId,
  goal,
  projects,
  members,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  yearId: string;
  goal?: (Goal & { projects?: Project[] }) | null;
  projects?: Project[];
  members: Member[];
}) {
  const { undoableDelete } = useToast();
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [status, setStatus] = useState("doing");
  const [dueLabel, setDueLabel] = useState("");
  const [ownerMemberId, setOwnerMemberId] = useState("");
  const [projectDrafts, setProjectDrafts] = useState<ProjectDraft[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setName(goal?.name ?? "");
    setTarget(goal?.target ?? "");
    setStatus(goal?.status ?? "doing");
    setDueLabel(goal?.dueLabel ?? "");
    setOwnerMemberId(goal?.ownerMemberId ?? "");
    const existing = (goal?.projects ?? projects ?? []).map((p) => ({
      id: p.id,
      name: p.name,
    }));
    setProjectDrafts(existing.length ? existing : [{ name: "" }]);
  }, [open, goal, projects]);

  function onSave() {
    start(async () => {
      try {
        await upsertGoal({
          id: goal?.id,
          yearId,
          name,
          target: target || null,
          status,
          dueLabel: dueLabel || null,
          ownerMemberId: ownerMemberId || null,
          projects: projectDrafts.filter((p) => p.name.trim() || p.delete),
        });
        onOpenChange(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save");
      }
    });
  }

  function onDelete() {
    if (!goal?.id) return;
    start(async () => {
      const res = await deleteGoal(goal.id);
      if (!res.ok) {
        setError("Cannot delete: tasks still reference this goal.");
        return;
      }
      undoableDelete("goal", goal.id, "Goal deleted");
      onOpenChange(false);
    });
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={goal ? "Edit Goal" : "Add Goal"}>
      <div className="grid gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-ink/60">Name</span>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-ink/60">Target number</span>
            <input
              className="field"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="5/6"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-ink/60">Status</span>
            <select className="field" value={status} onChange={(e) => setStatus(e.target.value)}>
              {GOAL_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.emoji} {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-ink/60">Due</span>
            <input
              className="field"
              value={dueLabel}
              onChange={(e) => setDueLabel(e.target.value)}
              placeholder="Q1 2026"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-ink/60">Owner (optional)</span>
            <select
              className="field"
              value={ownerMemberId}
              onChange={(e) => setOwnerMemberId(e.target.value)}
            >
              <option value="">—</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <p className="mb-2 text-sm text-ink/60">Projects</p>
          <div className="space-y-2">
            {projectDrafts.map((p, i) =>
              p.delete ? null : (
                <div key={p.id ?? i} className="flex gap-2">
                  <input
                    className="field"
                    value={p.name}
                    placeholder="Project name"
                    onChange={(e) =>
                      setProjectDrafts((prev) =>
                        prev.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)),
                      )
                    }
                  />
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() =>
                      setProjectDrafts((prev) =>
                        p.id
                          ? prev.map((x, idx) => (idx === i ? { ...x, delete: true } : x))
                          : prev.filter((_, idx) => idx !== i),
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
              ),
            )}
            <button
              type="button"
              className="text-sm underline"
              onClick={() => setProjectDrafts((prev) => [...prev, { name: "" }])}
            >
              + Add project
            </button>
          </div>
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-6 flex justify-end gap-2">
        {goal?.id ? (
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