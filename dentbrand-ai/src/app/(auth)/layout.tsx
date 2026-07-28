import Link from "next/link";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <Link href="/" className="block text-center text-xl font-bold">
          DentBrand AI
        </Link>
        {children}
      </div>
    </main>
  );
}
