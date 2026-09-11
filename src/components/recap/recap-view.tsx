"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppNav, MetaStack } from "@/components/layout/app-nav";
import { RecapModal } from "@/components/recap/recap-modal";
import { RECAP_READINESS, recapReadinessLabel } from "@/lib/constants";
import { contextMeta, currentISOWeek } from "@/lib/dates";
import type { getRecapPageData } from "@/lib/queries";
import { Plus } from "lucide-react";

type Data = NonNullable<Awaited<ReturnType<typeof getRecapPageData>>>;

type SortKey = "newest" | "name" | "readiness";

export function RecapView({ data, week }: { data: Data; week: number }) {
  const router = useRouter();
  const meta = contextMeta(data.year.yearNumber, week || currentISOWeek());
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Data["projects"][number] | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("newest");

  const rows = useMemo(() => {
    let list = [...data.projects];
    if (filter !== "all") {
      const n = Number(filter);
      list = list.filter((p) => p.readiness === n);
    }
    if (sort === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "readiness") {
      list.sort((a, b) => {
        const ar = a.readiness ?? -1;
        const br = b.readiness ?? -1;
        if (ar !== br) return br - ar;
        return a.name.localeCompare(b.name);
      });
    } else {
      list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    }
    return list;
  }, [data.projects, filter, sort]);

  return (
    <div className="page-shell relative">
      <AppNav
        yearNumber={data.year.yearNumber}
        week={week || currentISOWeek()}
        theme={data.year.theme}
        yearId={data.year.id}
      />

      <div className="flex items-end justify-between gap-4">
        <h1 className="font-display text-5xl tracking-tight text-ink sm:text-6xl">
          Recap
        </h1>
        <MetaStack year={meta.year} quarter={meta.quarter} season={meta.season} />
      </div>

      <p className="mt-2 max-w-2xl text-sm text-ink/60">
        Agency projects presented at townhalls — curated by hand for the annual recap
        edit. Separate from Historian tasks.
      </p>

      {data.years.length > 1 ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-ink/50">Years</span>
          {data.years.map((y) => (
            <button
              key={y.id}
              type="button"
              className={
                y.yearNumber === data.year.yearNumber
                  ? "btn-nav text-xs is-selected"
                  : "btn-nav text-xs"
              }
              onClick={() => {
                if (y.yearNumber === data.year.yearNumber) return;
                router.push(`/recap?year=${y.yearNumber}`);
              }}
            >
              {y.yearNumber}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn-nav is-selected inline-flex items-center gap-1 text-sm"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus size={14} /> Add project
        </button>
        <label className="ml-auto flex items-center gap-2 text-xs text-ink/60">
          Readiness
          <select
            className="field py-1 text-xs"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All</option>
            {RECAP_READINESS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.value} · {r.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-ink/60">
          Sort
          <select
            className="field py-1 text-xs"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
          >
            <option value="newest">Newest</option>
            <option value="name">Name</option>
            <option value="readiness">Readiness</option>
          </select>
        </label>
      </div>

      <section className="mt-4 divide-y divide-black/10 border-y border-black/10">
        {rows.length === 0 ? (
          <p className="py-8 text-sm text-ink/50">No recap projects for this year yet.</p>
        ) : (
          rows.map((p) => (
            <button
              key={p.id}
              type="button"
              className="grid w-full gap-1 py-3 text-left hover:bg-[#d9f1fa]/40 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1.2fr)] sm:items-start sm:gap-3"
              onClick={() => {
                setEditing(p);
                setOpen(true);
              }}
            >
              <div className="min-w-0">
                <div className="truncate font-medium text-ink">{p.name}</div>
                {p.notes ? (
                  <div className="mt-0.5 line-clamp-2 text-xs text-ink/50">{p.notes}</div>
                ) : null}
              </div>
              <div className="text-sm text-ink/70">{p.team || "—"}</div>
              <div className="text-sm text-ink/70">
                {recapReadinessLabel(p.readiness)}
              </div>
              <div className="flex min-w-0 flex-col gap-0.5">
                {(p.outputUrls ?? []).length ? (
                  (p.outputUrls ?? []).map((u) => (
                    <a
                      key={u}
                      href={u}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-xs text-ink underline decoration-ink/30 underline-offset-2 hover:decoration-ink"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {u.replace(/^https?:\/\//, "")}
                    </a>
                  ))
                ) : (
                  <span className="text-xs text-ink/40">No URLs</span>
                )}
              </div>
            </button>
          ))
        )}
      </section>

      <RecapModal
        open={open}
        onOpenChange={setOpen}
        yearId={data.year.id}
        project={editing}
      />
    </div>
  );
}
