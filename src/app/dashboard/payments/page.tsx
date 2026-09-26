import { ExternalLink } from "lucide-react";
import { PaymentsView } from "@/components/payments-view";
import { TestBuyerButton } from "@/components/test-buyer-button";
import { PageHeader } from "@/components/ui";
import { getHcsTopicUrl, getLanes, getPayments, NOW } from "@/lib/data";

export const metadata = { title: "Payments · x402 Maker" };

export default async function PaymentsPage() {
  const [payments, lanes, hcsTopicUrl] = await Promise.all([getPayments(), getLanes(), getHcsTopicUrl()]);

  return (
    <>
      <PageHeader
        title="Payments"
        sub={
          <>
            Every x402 settlement with its on-chain receipt. Audit all of them on the{" "}
            <a href={hcsTopicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-ink underline-offset-4 hover:text-lime hover:underline">
              HCS receipt topic <ExternalLink className="size-3" />
            </a>
          </>
        }
      >
        <TestBuyerButton />
      </PageHeader>
      <PaymentsView
        payments={payments}
        now={NOW}
        lanes={lanes.map((l) => l.name)}
        chains={Object.fromEntries(lanes.map((l) => [l.name, l.chain]))}
      />
    </>
  );
}
