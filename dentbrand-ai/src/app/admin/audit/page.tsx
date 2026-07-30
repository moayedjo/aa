import type { Metadata } from "next";

import { getAuditLog } from "@/lib/admin/queries";

export const metadata: Metadata = { title: "Audit log · Admin" };

export default async function AdminAuditPage() {
  const rows = await getAuditLog();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Audit log</h1>
      <p className="text-sm text-muted-foreground">
        Every privileged action (credit adjustments, ticket changes) is
        recorded here.
      </p>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left">
            <tr>
              <th className="p-3 font-medium">When</th>
              <th className="p-3 font-medium">Action</th>
              <th className="p-3 font-medium">Target</th>
              <th className="p-3 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-3 text-muted-foreground">
                  No audit entries yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t align-top">
                  <td className="p-3 text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="p-3 font-medium">{r.action}</td>
                  <td className="p-3">
                    {r.target_type}
                    {r.target_id ? ` ${r.target_id.slice(0, 8)}` : ""}
                  </td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">
                    {JSON.stringify(r.details)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
