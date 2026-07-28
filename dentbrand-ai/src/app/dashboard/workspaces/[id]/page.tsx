import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import {
  getMyWorkspaceRole,
  getWorkspace,
  getWorkspaceMembers,
} from "@/lib/workspaces/queries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Workspace" };

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // RLS returns no row for workspaces the user does not belong to, so a
  // foreign workspace id looks identical to a nonexistent one: 404.
  const workspace = await getWorkspace(id);
  if (!workspace) {
    notFound();
  }

  const [members, myRole] = await Promise.all([
    getWorkspaceMembers(id),
    getMyWorkspaceRole(id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{workspace.name}</h1>
        {myRole && (
          <p className="text-sm text-muted-foreground">Your role: {myRole}</p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Members</CardTitle>
          <CardDescription>
            People with access to this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members found.</p>
          ) : (
            <ul className="divide-y">
              {members.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span>
                    {member.profiles?.full_name || member.profiles?.email || member.user_id}
                  </span>
                  <span className="rounded bg-secondary px-2 py-0.5 text-xs font-medium">
                    {member.role}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Brand Kit and design tools arrive in the next phases.
      </p>
    </div>
  );
}
