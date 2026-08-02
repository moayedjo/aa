import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-bold tracking-tight">DentBrand AI</h1>
      <p className="max-w-md text-lg text-muted-foreground">
        Create professional, on-brand social media designs for your clinic in
        minutes — no designer needed.
      </p>
      <div className="flex gap-3">
        <Link href="/signup" className={cn(buttonVariants({ size: "lg" }))}>
          Get started
        </Link>
        <Link
          href="/login"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
        >
          Log in
        </Link>
      </div>
      <nav className="mt-8 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
        <Link href="/privacy" className="hover:underline">
          Privacy
        </Link>
        <Link href="/terms" className="hover:underline">
          Terms
        </Link>
        <Link href="/refund-policy" className="hover:underline">
          Refund Policy
        </Link>
      </nav>
    </main>
  );
}
