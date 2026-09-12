"use client";

import { useEffect, useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { RECAP_READINESS } from "@/lib/constants";
import { deleteRecapProject, upsertRecapProject } from "@/lib/actions";
import { useToast } from "@/components/ui/toast";
import type { RecapProject } from "@/lib/db/schema";

export function RecapModal({
  open,
  onOpenChange,
  yearId,
  project,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  yearId: string;
  project?: RecapProject | null;
}) {
  const { undoableDelete } = useToast();
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const [urls, setUrls] = useState<string[]>([""]);
  const [readiness, setReadiness] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setName(project?.name ?? "");
    setTeam(project?.team ?? "");
    const existing = project?.outputUrls?.length ? [...project.outputUrls] : [""];
    setUrls(existing);
    setReadiness(
      project?.readiness === null || project?.readiness === undefined
        ? ""
        : String(project.readiness),
    );
    setNotes(project?.notes ?? "");
  }, [open, project]);

  function onSave() {
    start(async () => {
      try {
        await upsertRecapProject({
          id: project?.id,
          yearId,
          name,
          team,
          outputUrls: urls,
          readiness: readiness === "" ? null : Number(readiness),
          notes,
        });
        onOpenChange(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save");
      }
    });
  }

  function onDelete() {
    if (!project?.id) return;
    start(async () => {
      await deleteRecapProject(project.id);
      undoableDelete("recap", project.id, "Recap project deleted");
      onOpenChange(false);
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={project ? "Edit Recap Project" : "Add Recap Project"}
      wide
    >
      <div className="grid gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-ink/60">Project name</span>
          <input
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-ink/60">Team / owner</span>
          <input
            className="field"
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            placeholder="Agency team or person"
          />
        </label>

        <div className="text-sm">
          <span className="mb-1 block text-ink/60">Output URLs</span>
          <div className="grid gap-2">
            {urls.map((u, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="field flex-1"
                  value={u}
                  placeholder="drive.google.com/… or vimeo.com/…"
                  onChange={(e) => {
                    const next = [...urls];
                    next[i] = e.target.value;
                    setUrls(next);
                  }}
                />
                {urls.length > 1 ? (
                  <button
                    type="button"
                    className="btn-outline text-xs"
                    onClick={() => setUrls(urls.filter((_, j) => j !== i))}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            ))}
            <button
              type="button"
              className="btn-outline w-fit text-xs"
              onClick={() => setUrls([...urls, ""])}
            >
              + Add URL
            </button>
          </div>
        </div>

        <label className="text-sm">
          <span className="mb-1 block text-ink/60">Recap readiness</span>
          <select
            className="field"
            value={readiness}
            onChange={(e) => setReadiness(e.target.value)}
          >
            <option value="">—</option>
            {RECAP_READINESS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.value} · {r.label}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-ink/50">
            Refers to the material&apos;s readiness for the recap edit, not the quality of
            the work.
          </span>
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-ink/60">Comments / notes</span>
          <textarea
            className="field min-h-[88px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          {project?.id ? (
            <button
              type="button"
              className="text-sm text-ink/50 underline-offset-2 hover:underline"
              disabled={pending}
              onClick={onDelete}
            >
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-outline text-sm"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-outline text-sm"
              onClick={onSave}
              disabled={pending || !name.trim()}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
