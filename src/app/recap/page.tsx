import { RecapView } from "@/components/recap/recap-view";
import { getRecapPageData } from "@/lib/queries";
import { currentISOWeek, currentYearNumber } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function RecapPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; week?: string }>;
}) {
  const sp = await searchParams;
  const year = Number(sp.year) || currentYearNumber();
  const week = Number(sp.week) || currentISOWeek();
  const data = await getRecapPageData(year);
  if (!data) {
    return <main className="page-shell">Unable to load Recap.</main>;
  }
  return <RecapView data={data} week={week} />;
}
