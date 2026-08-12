import { WeekView } from "@/components/week/week-view";
import { getWeekPageData } from "@/lib/queries";
import { currentISOWeek, currentYearNumber } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; week?: string; adj?: string }>;
}) {
  const sp = await searchParams;
  const year = Number(sp.year) || currentYearNumber();
  const week = Number(sp.week) || currentISOWeek();
  const adjacent =
    sp.adj === "prev" || sp.adj === "next" ? (sp.adj as "prev" | "next") : null;

  const data = await getWeekPageData(year, week, adjacent);
  if (!data) {
    return (
      <main className="page-shell">
        <p>No year configured. Open Goals / Settings to begin.</p>
      </main>
    );
  }

  return <WeekView data={data} />;
}