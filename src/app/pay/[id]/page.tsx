import type { Metadata } from "next";
import { Suspense } from "react";
import { PayPage } from "@/views/Pay";

export const metadata: Metadata = { title: "Pay per call" };

export default function Page() {
  // reads the query string it was opened with
  return (
    <Suspense>
      <PayPage />
    </Suspense>
  );
}
