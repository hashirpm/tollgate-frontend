import { FeaturesView } from "@/components/features-view";
import { PageHeader } from "@/components/ui";
import { getLanes, getPolicies } from "@/lib/data";

export const metadata = { title: "Features · x402 Maker" };

export default async function FeaturesPage() {
  const [lanes, policies] = await Promise.all([getLanes(), getPolicies()]);
  return (
    <>
      <PageHeader title="Features" sub="Pricing rules and access controls, applied live to each API." />
      <FeaturesView lanes={lanes} initial={policies} />
    </>
  );
}
