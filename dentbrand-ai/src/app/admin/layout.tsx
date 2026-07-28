import Link from "next/link";
import { redirect } from "next/navigation";

import { isPlatformAdmin } from "@/lib/auth/queries";
import { SignOutButton } from "@/components/auth/sign-out-button";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Platform-admin gate — role comes from the server-managed user_roles
  // table; RLS additionally blocks every admin write for non-admins.
  if (!(await isPlatformAdmin())) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b bg-secondary/50 px-6 py-3">
        <div className="flex items-center gap-4">
          <Link href="/admin/templates" className="font-bold">
            DentBrand AI · Admin
          </Link>
          <nav className="flex gap-3 text-sm text-muted-foreground">
            <Link href="/admin/templates" className="hover:underline">
              Templates
            </Link>
            <Link href="/dashboard" className="hover:underline">
              Back to app
            </Link>
          </nav>
        </div>
        <SignOutButton />
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 p-6">{children}</main>
    </div>
  );
}
