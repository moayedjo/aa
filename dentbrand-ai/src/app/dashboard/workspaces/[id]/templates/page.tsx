import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getWorkspace } from "@/lib/workspaces/queries";
import { getBrandKit, getIndustrySettings, getLogoSignedUrl } from "@/lib/brand-kit/queries";
import { getVerticalByKey, getTemplateCategories } from "@/lib/industries/queries";
import { getPublishedTemplates } from "@/lib/templates/queries";
import { buildResolveContext, resolveTemplate } from "@/lib/templates/resolve";
import { TemplatePreview } from "@/components/templates/template-preview";
import { FontLinks } from "@/components/templates/font-links";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Templates" };

export default async function WorkspaceTemplatesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { id } = await params;
  const workspace = await getWorkspace(id);
  if (!workspace) notFound();

  const [brandKit, settings] = await Promise.all([
    getBrandKit(id),
    getIndustrySettings(id),
  ]);
  const logoSignedUrl = await getLogoSignedUrl(brandKit?.logo_path ?? null);

  const industryKey = settings?.industry_key ?? "dental";
  const vertical = await getVerticalByKey(industryKey);
  if (!vertical) notFound();

  const { lang } = await searchParams;
  const language =
    lang === "ar" || lang === "en"
      ? lang
      : (brandKit?.default_language ?? "en");

  const [templates, categories] = await Promise.all([
    getPublishedTemplates(vertical.id),
    getTemplateCategories(vertical.id),
  ]);

  const ctx = buildResolveContext(brandKit, logoSignedUrl, language);

  return (
    <div className="space-y-6">
      <FontLinks
        fonts={[ctx.brand.arabicFont, ctx.brand.englishFont]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href={`/dashboard/workspaces/${id}`}
            className="text-sm text-muted-foreground hover:underline"
          >
            ← {workspace.name}
          </Link>
          <h1 className="mt-1 text-2xl font-bold">Templates</h1>
          <p className="text-sm text-muted-foreground">
            Previewed with your brand applied.
          </p>
        </div>
        <div className="flex gap-1 rounded-md border p-1 text-sm">
          <Link
            href={`?lang=en`}
            className={`rounded px-3 py-1 ${language === "en" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
          >
            English
          </Link>
          <Link
            href={`?lang=ar`}
            className={`rounded px-3 py-1 ${language === "ar" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
          >
            العربية
          </Link>
        </div>
      </div>

      {templates.length === 0 ? (
        <p className="text-muted-foreground">
          No published templates yet — check back soon.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map(({ template, json }) => {
            const resolved = resolveTemplate(json, ctx);
            const category = categories.find(
              (c) => c.id === template.category_id
            );
            return (
              <Card key={template.id} className="overflow-hidden">
                <TemplatePreview resolved={resolved} className="w-full border-b" />
                <CardContent className="space-y-1 p-4">
                  <p className="font-medium">{template.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {category
                      ? language === "ar"
                        ? category.label_ar
                        : category.label_en
                      : "—"}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Ready to use one?{" "}
        <Link
          href={`/dashboard/workspaces/${id}/create`}
          className="underline hover:text-foreground"
        >
          Start the guided create flow
        </Link>
        .
      </p>
    </div>
  );
}
