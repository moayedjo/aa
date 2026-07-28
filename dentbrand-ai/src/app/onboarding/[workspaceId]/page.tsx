import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { getWorkspace, getMyWorkspaceRole } from "@/lib/workspaces/queries";
import {
  getBrandKit,
  getIndustrySettings,
  getLogoSignedUrl,
} from "@/lib/brand-kit/queries";
import { getServices, getVerticalByKey, getVerticals } from "@/lib/industries/queries";
import { OnboardingWizard } from "@/components/onboarding/wizard";

export const metadata: Metadata = { title: "Set up your brand" };

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  // RLS: foreign workspaces are invisible → 404.
  const workspace = await getWorkspace(workspaceId);
  if (!workspace) {
    notFound();
  }

  // Brand Kit editing is owner/admin only; other members go to the
  // workspace page instead.
  const role = await getMyWorkspaceRole(workspaceId);
  if (role !== "owner" && role !== "admin") {
    redirect(`/dashboard/workspaces/${workspaceId}`);
  }

  const [brandKit, settings, verticals] = await Promise.all([
    getBrandKit(workspaceId),
    getIndustrySettings(workspaceId),
    getVerticals(),
  ]);
  const logoSignedUrl = await getLogoSignedUrl(brandKit?.logo_path ?? null);

  const industryKey = settings?.industry_key ?? "dental";
  const vertical =
    verticals.find((v) => v.key === industryKey) ??
    (await getVerticalByKey("dental"));
  const services = vertical ? await getServices(vertical.id) : [];

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Set up your brand</h1>
        <p className="text-muted-foreground">
          {workspace.name} — this takes about two minutes and powers every
          design you create.
        </p>
      </div>
      <OnboardingWizard
        workspaceId={workspaceId}
        workspaceName={workspace.name}
        brandKit={brandKit}
        settings={settings}
        logoSignedUrl={logoSignedUrl}
        initialStep={brandKit?.onboarding_step ?? 0}
        verticals={verticals}
        services={services}
      />
    </main>
  );
}
