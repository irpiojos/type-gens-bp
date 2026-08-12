"use client";

import { useEffect, useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { deleteHoliday, upsertHoliday } from "@/lib/actions";
import { useToast } from "@/components/ui/toast";
import type { Holiday } from "@/lib/db/schema";
import { todayISO } from "@/lib/dates";

export function HolidayModal({
  open,
  onOpenChange,
  yearId,
  holiday,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  yearId: string;
  holiday?: Holiday | null;
}) {
  const { undoableDelete } = useToast();
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [recurringYearly, setRecurringYearly] = useState(false);
  const [isHalfDay, setIsHalfDay] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(holiday?.name ?? "");
    setStartDate(holiday?.startDate ?? todayISO());
    setEndDate(holiday?.endDate ?? holiday?.startDate ?? todayISO());
    setRecurringYearly(holiday?.recurringYearly ?? false);
    setIsHalfDay(holiday?.isHalfDay ?? false);
  }, [open, holiday]);

  function onSave() {
    start(async () => {
      await upsertHoliday({
        id: holiday?.id,
        yearId,
        name,
        startDate,
        endDate,
        recurringYearly,
        isHalfDay,
      });
      onOpenChange(false);
    });
  }

  function onDelete() {
    if (!holiday?.id) return;
    start(async () => {
      await deleteHoliday(holiday.id);
      undoableDelete("holiday", holiday.id, "Holiday deleted");
      onOpenChange(false);
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={holiday ? "Edit Holiday" : "Add Holiday"}
    >
      <div className="grid gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-ink/60">Name</span>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-ink/60">Start</span>
            <input
              type="date"
              className="field"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-ink/60">End</span>
            <input
              type="date"
              className="field"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={recurringYearly}
            onChange={(e) => setRecurringYearly(e.target.checked)}
          />
          Recurring yearly
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isHalfDay}
            onChange={(e) => setIsHalfDay(e.target.checked)}
          />
          Half day
        </label>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        {holiday?.id ? (
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