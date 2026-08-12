import { YearView } from "@/components/year/year-view";
import { getYearListData } from "@/lib/queries";
import { currentYearNumber } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function YearPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const sp = await searchParams;
  const year = Number(sp.year) || currentYearNumber();
  const data = await getYearListData(year);
  if (!data) return <main className="page-shell">Unable to load year view.</main>;
  return <YearView data={data} />;
}