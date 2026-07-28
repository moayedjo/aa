import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import {
  getMyWorkspaceRole,
  getWorkspace,
  getWorkspaceMembers,
} from "@/lib/workspaces/queries";
import {
  getBrandKit,
  getIndustrySettings,
  getLogoSignedUrl,
} from "@/lib/brand-kit/queries";
import { computeBrandCompletion } from "@/lib/brand-kit/score";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

  const [members, myRole, brandKit, settings] = await Promise.all([
    getWorkspaceMembers(id),
    getMyWorkspaceRole(id),
    getBrandKit(id),
    getIndustrySettings(id),
  ]);
  const logoSignedUrl = await getLogoSignedUrl(brandKit?.logo_path ?? null);
  const completion = computeBrandCompletion(brandKit, settings);
  const canEditBrand = myRole === "owner" || myRole === "admin";
  const brandColors = [
    brandKit?.primary_color,
    brandKit?.secondary_color,
    brandKit?.accent_color,
    brandKit?.background_color,
    brandKit?.text_color,
  ].filter((c): c is string => !!c);

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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Brand Kit</CardTitle>
          <CardDescription>
            {brandKit?.onboarding_completed_at
              ? `Brand completion: ${completion.score}%`
              : `Onboarding in progress — ${completion.score}% complete`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {logoSignedUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
              <img
                src={logoSignedUrl}
                alt={`${brandKit?.business_name ?? workspace.name} logo`}
                className="h-12 w-12 rounded border object-contain"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded border text-xs text-muted-foreground">
                No logo
              </div>
            )}
            <div className="text-sm">
              <p className="font-medium">
                {brandKit?.business_name ?? "Business name not set"}
              </p>
              <p className="text-muted-foreground">
                {settings
                  ? `${settings.industry_key} · ${settings.selected_services.length} services`
                  : "Industry not selected yet"}
              </p>
            </div>
          </div>

          {brandColors.length > 0 && (
            <div className="flex gap-1.5" aria-label="Brand colors">
              {brandColors.map((color, index) => (
                <span
                  key={`${color}-${index}`}
                  title={color}
                  className="h-6 w-6 rounded-full border"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          )}

          {completion.missing.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Missing: {completion.missing.join(", ")}
            </p>
          )}

          {canEditBrand && (
            <Link
              href={`/onboarding/${id}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              {brandKit?.onboarding_completed_at
                ? "Edit Brand Kit"
                : "Continue onboarding"}
            </Link>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Templates</CardTitle>
          <CardDescription>
            Browse published templates previewed with your brand.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href={`/dashboard/workspaces/${id}/templates`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Browse templates
          </Link>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Design creation and the editor arrive in the next phases.
      </p>
    </div>
  );
}
