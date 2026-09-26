import Link from "next/link";
import { Logo } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <h1 className="text-2xl font-semibold">Nothing at this address</h1>
        <p className="mt-1 text-sm text-ink-2">The page you’re after doesn’t exist.</p>
        <Link href="/dashboard" className="btn btn-primary mt-6">
          Go to overview
        </Link>
      </div>
    </div>
  );
}
