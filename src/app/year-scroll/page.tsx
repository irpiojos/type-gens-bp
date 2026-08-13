import { YearScrollView } from "@/components/year/year-scroll-view";
import { getYearScrollData } from "@/lib/queries";
import { currentYearNumber } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function YearScrollPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const sp = await searchParams;
  const year = Number(sp.year) || currentYearNumber();
  const data = await getYearScrollData(year);
  if (!data) return <main className="page-shell">Unable to load year scroll view.</main>;
  return <YearScrollView data={data} />;
}