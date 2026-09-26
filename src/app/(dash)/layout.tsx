import { Layout } from "@/components/Layout";
import { RequireAuth } from "@/components/RequireAuth";

export default function DashLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <Layout>{children}</Layout>
    </RequireAuth>
  );
}
