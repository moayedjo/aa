import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { getWorkspace, getMyWorkspaceRole } from "@/lib/workspaces/queries";
import {
  getBrandKit,
  getIndustrySettings,
  getLogoSignedUrl,
} from "@/lib/brand-kit/queries";
import {
  getContentGoals,
  getServices,
  getVerticalByKey,
} from "@/lib/industries/queries";
import {
  getPublishedTemplates,
  getTemplateServicesMap,
} from "@/lib/templates/queries";
import { buildResolveContext, resolveTemplate } from "@/lib/templates/resolve";
import { CreateFlow } from "@/components/create-flow/create-flow";
import { FontLinks } from "@/components/templates/font-links";

export const metadata: Metadata = { title: "Create a design" };

export default async function CreateDesignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workspace = await getWorkspace(id);
  if (!workspace) notFound();

  // Viewers cannot create designs.
  const role = await getMyWorkspaceRole(id);
  if (role !== "owner" && role !== "admin" && role !== "editor") {
    redirect(`/dashboard/workspaces/${id}`);
  }

  const [brandKit, settings] = await Promise.all([
    getBrandKit(id),
    getIndustrySettings(id),
  ]);
  const logoSignedUrl = await getLogoSignedUrl(brandKit?.logo_path ?? null);

  const vertical = await getVerticalByKey(settings?.industry_key ?? "dental");
  if (!vertical) notFound();

  const [services, goals, templates] = await Promise.all([
    getServices(vertical.id),
    getContentGoals(vertical.id),
    getPublishedTemplates(vertical.id),
  ]);
  const templateServices = await getTemplateServicesMap(
    templates.map((t) => t.template.id)
  );

  const language = brandKit?.default_language ?? "en";
  const ctx = buildResolveContext(brandKit, logoSignedUrl, language);

  // Pre-resolve previews server-side; the create flow is pure selection UI.
  const templateCards = templates.map(({ template, json }) => ({
    id: template.id,
    name: template.name,
    description: template.description,
    supportedLanguages: template.supported_languages,
    serviceIds: templateServices[template.id] ?? [],
    resolved: resolveTemplate(json, ctx),
  }));

  return (
    <div className="space-y-6">
      <FontLinks fonts={[ctx.brand.arabicFont, ctx.brand.englishFont]} />
      <div>
        <Link
          href={`/dashboard/workspaces/${id}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← {workspace.name}
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Create a design</h1>
        <p className="text-sm text-muted-foreground">
          Pick a service, a goal and a template — your brand is applied
          automatically.
        </p>
      </div>
      <CreateFlow
        workspaceId={id}
        services={services}
        goals={goals}
        templates={templateCards}
        selectedServiceKeys={settings?.selected_services ?? []}
        defaultLanguage={language}
      />
    </div>
  );
}
