import { Suspense } from "react";
import { PaymentsPage } from "@/views/Payments";

export const metadata = { title: "Payments" };

export default function Page() {
  return (
    <Suspense>
      <PaymentsPage />
    </Suspense>
  );
}
