import { AnalyticsView } from "@/components/analytics-view";
import { LiveDot, PageHeader } from "@/components/ui";
import { getAnalytics, getLanes } from "@/lib/data";

export const metadata = { title: "Analytics · x402 Maker" };

export default async function AnalyticsPage() {
  const [analytics, lanes] = await Promise.all([getAnalytics(), getLanes()]);
  return (
    <>
      <PageHeader title="Analytics" sub="Who's calling your APIs, from where, and what they pay for.">
        <span className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-surface px-4 text-xs text-ink-2">
          <LiveDot /> live · refreshes every 2s
        </span>
      </PageHeader>
      <AnalyticsView analytics={analytics} lanes={lanes.map((l) => l.name)} />
    </>
  );
}
