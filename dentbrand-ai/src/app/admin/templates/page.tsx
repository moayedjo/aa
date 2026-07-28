import Link from "next/link";
import type { Metadata } from "next";

import { getAllTemplates } from "@/lib/templates/queries";
import { getVerticals } from "@/lib/industries/queries";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Templates · Admin" };

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-secondary text-secondary-foreground",
  testing: "bg-amber-100 text-amber-900",
  approved: "bg-blue-100 text-blue-900",
  published: "bg-emerald-100 text-emerald-900",
  archived: "bg-zinc-200 text-zinc-600",
};

export default async function AdminTemplatesPage() {
  const [templates, verticals] = await Promise.all([
    getAllTemplates(),
    getVerticals(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Templates</h1>
        <Link href="/admin/templates/new" className={cn(buttonVariants())}>
          New template
        </Link>
      </div>

      {templates.length === 0 ? (
        <p className="text-muted-foreground">
          No templates yet. Create one, or run supabase/seed.sql for the five
          starter templates.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left">
              <tr>
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Vertical</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Version</th>
                <th className="p-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => (
                <tr key={template.id} className="border-t hover:bg-accent/50">
                  <td className="p-3">
                    <Link
                      href={`/admin/templates/${template.id}`}
                      className="font-medium hover:underline"
                    >
                      {template.name}
                    </Link>
                  </td>
                  <td className="p-3">
                    {verticals.find((v) => v.id === template.vertical_id)?.key ??
                      "—"}
                  </td>
                  <td className="p-3">
                    <span
                      className={cn(
                        "rounded px-2 py-0.5 text-xs font-medium",
                        STATUS_STYLES[template.status]
                      )}
                    >
                      {template.status}
                    </span>
                  </td>
                  <td className="p-3">v{template.current_version}</td>
                  <td className="p-3 text-muted-foreground">
                    {new Date(template.updated_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
