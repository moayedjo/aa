import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getWorkspace, getMyWorkspaceRole } from "@/lib/workspaces/queries";
import {
  getTrashedDesigns,
  getWorkspaceDesigns,
} from "@/lib/designs/queries";
import { DesignActions } from "@/components/designs/design-actions";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "My designs" };

export default async function MyDesignsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { id } = await params;
  const workspace = await getWorkspace(id);
  if (!workspace) notFound();

  const { view } = await searchParams;
  const showTrash = view === "trash";

  const [role, designs] = await Promise.all([
    getMyWorkspaceRole(id),
    showTrash ? getTrashedDesigns(id) : getWorkspaceDesigns(id),
  ]);
  const canEdit = role === "owner" || role === "admin" || role === "editor";
  const canDeleteForever = role === "owner" || role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href={`/dashboard/workspaces/${id}`}
            className="text-sm text-muted-foreground hover:underline"
          >
            ← {workspace.name}
          </Link>
          <h1 className="mt-1 text-2xl font-bold">
            {showTrash ? "Trash" : "My designs"}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/workspaces/${id}/designs${showTrash ? "" : "?view=trash"}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            {showTrash ? "Back to designs" : "View trash"}
          </Link>
          {canEdit && !showTrash && (
            <Link
              href={`/dashboard/workspaces/${id}/create`}
              className={cn(buttonVariants({ size: "sm" }))}
            >
              Create design
            </Link>
          )}
        </div>
      </div>

      {designs.length === 0 ? (
        <p className="text-muted-foreground">
          {showTrash
            ? "Trash is empty."
            : "No designs yet — create your first one."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left">
              <tr>
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Language</th>
                <th className="p-3 font-medium">
                  {showTrash ? "Trashed" : "Last edited"}
                </th>
                {canEdit && <th className="p-3 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {designs.map((design) => (
                <tr key={design.id} className="border-t">
                  <td className="p-3">
                    {canEdit && !showTrash ? (
                      <Link
                        href={`/editor/${design.id}`}
                        className="font-medium hover:underline"
                      >
                        {design.name}
                      </Link>
                    ) : (
                      <span className="font-medium">{design.name}</span>
                    )}
                  </td>
                  <td className="p-3">
                    {design.language === "ar" ? "العربية" : "English"}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {new Date(
                      showTrash && design.deleted_at
                        ? design.deleted_at
                        : design.updated_at
                    ).toLocaleString()}
                  </td>
                  {canEdit && (
                    <td className="p-3">
                      <DesignActions
                        designId={design.id}
                        inTrash={showTrash}
                        canDeleteForever={canDeleteForever}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
