"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import clsx from "clsx";
import { useEffect } from "react";

export function Modal({
  open,
  onOpenChange,
  title,
  children,
  wide,
  className,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title?: string;
  children: React.ReactNode;
  wide?: boolean;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px] data-[state=open]:animate-in" />
        <Dialog.Content
          aria-describedby={undefined}
          className={clsx(
            "fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[min(92vw,560px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-black/15 bg-white p-5 shadow-xl outline-none sm:p-6",
            wide && "sm:w-[min(92vw,720px)]",
            className,
          )}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            {title ? (
              <Dialog.Title className="font-display text-2xl tracking-tight text-ink">
                {title}
              </Dialog.Title>
            ) : (
              <Dialog.Title className="sr-only">Dialog</Dialog.Title>
            )}
            <Dialog.Close
              className="ml-auto rounded-md border border-black/10 p-1.5 text-ink/70 hover:bg-black/5"
              aria-label="Close"
            >
              <X size={16} />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}