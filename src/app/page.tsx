import { Suspense } from "react";
import { ConnectPage } from "@/views/Connect";

export default function Page() {
  // ConnectPage reads ?from=, which needs a Suspense boundary
  return (
    <Suspense>
      <ConnectPage />
    </Suspense>
  );
}
