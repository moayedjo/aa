import Link from "next/link";
import type { Metadata } from "next";

import { getUserWorkspaces } from "@/lib/workspaces/queries";
import { CreateWorkspaceForm } from "@/components/workspaces/create-workspace-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const workspaces = await getUserWorkspaces();

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-2xl font-bold">Your workspaces</h1>
        {workspaces.length === 0 ? (
          <p className="text-muted-foreground">
            You have no workspaces yet. Create one below to get started.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {workspaces.map((workspace) => (
              <li key={workspace.id}>
                <Link href={`/dashboard/workspaces/${workspace.id}`}>
                  <Card className="transition-colors hover:bg-accent">
                    <CardHeader>
                      <CardTitle className="text-lg">{workspace.name}</CardTitle>
                      <CardDescription>
                        Created{" "}
                        {new Date(workspace.created_at).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Create a workspace</CardTitle>
            <CardDescription>
              A workspace holds your clinic&apos;s brand and designs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateWorkspaceForm />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
