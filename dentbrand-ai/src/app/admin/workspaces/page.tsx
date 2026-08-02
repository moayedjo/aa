import Link from "next/link";
import type { Metadata } from "next";

import { getAdminWorkspaces } from "@/lib/admin/queries";

export const metadata: Metadata = { title: "Workspaces · Admin" };

export default async function AdminWorkspacesPage() {
  const workspaces = await getAdminWorkspaces();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Workspaces</h1>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left">
            <tr>
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Subscription</th>
              <th className="p-3 font-medium">Credits</th>
              <th className="p-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {workspaces.map((w) => (
              <tr key={w.id} className="border-t hover:bg-accent/50">
                <td className="p-3">
                  <Link
                    href={`/admin/workspaces/${w.id}`}
                    className="font-medium hover:underline"
                  >
                    {w.name}
                  </Link>
                </td>
                <td className="p-3">{w.subscriptionStatus ?? "—"}</td>
                <td className="p-3">{w.balance ?? "—"}</td>
                <td className="p-3 text-muted-foreground">
                  {new Date(w.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
