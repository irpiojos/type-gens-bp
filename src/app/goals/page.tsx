import { GoalsView } from "@/components/goals/goals-view";
import { getGoalsPageData } from "@/lib/queries";
import { currentISOWeek, currentYearNumber } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function GoalsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; week?: string }>;
}) {
  const sp = await searchParams;
  const year = Number(sp.year) || currentYearNumber();
  const week = Number(sp.week) || currentISOWeek();
  const data = await getGoalsPageData(year);
  if (!data) {
    return <main className="page-shell">Unable to load goals.</main>;
  }
  return <GoalsView data={data} week={week} />;
}