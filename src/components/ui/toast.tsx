"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { restoreEntity } from "@/lib/actions";

type UndoKind = "task" | "goal" | "member" | "holiday" | "comment";

type Toast = {
  id: string;
  message: string;
  kind?: UndoKind;
  entityId?: string;
};

type ToastCtx = {
  push: (t: Omit<Toast, "id">) => void;
  undoableDelete: (kind: UndoKind, id: string, message: string) => void;
};

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<string, number>>({});

  const dismiss = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
    if (timers.current[id]) window.clearTimeout(timers.current[id]);
  }, []);

  const push = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { ...t, id }]);
      timers.current[id] = window.setTimeout(() => dismiss(id), 60_000);
    },
    [dismiss],
  );

  const undoableDelete = useCallback(
    (kind: UndoKind, id: string, message: string) => {
      push({ message, kind, entityId: id });
    },
    [push],
  );

  const value = useMemo(() => ({ push, undoableDelete }), [push, undoableDelete]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-[70] flex w-[min(92vw,420px)] -translate-x-1/2 flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center justify-between gap-3 rounded-xl border border-black/15 bg-ink px-4 py-3 text-sm text-white shadow-lg"
          >
            <span>{t.message}</span>
            {t.kind && t.entityId ? (
              <button
                className="rounded-md bg-white/15 px-2 py-1 text-xs font-medium underline-offset-2 hover:bg-white/25"
                onClick={async () => {
                  await restoreEntity(t.kind!, t.entityId!);
                  dismiss(t.id);
                }}
              >
                Undo
              </button>
            ) : (
              <button className="text-xs opacity-80" onClick={() => dismiss(t.id)}>
                Dismiss
              </button>
            )}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast outside provider");
  return ctx;
}