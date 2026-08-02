import Link from "next/link";

export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b px-6 py-3">
        <Link href="/" className="font-bold">
          DentBrand AI
        </Link>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        {children}
      </main>
      <footer className="border-t px-6 py-6 text-sm text-muted-foreground">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap gap-4">
          <Link href="/privacy" className="hover:underline">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:underline">
            Terms of Service
          </Link>
          <Link href="/refund-policy" className="hover:underline">
            Refund Policy
          </Link>
        </div>
      </footer>
    </div>
  );
}
