import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import {
  getTemplate,
  getTemplateServiceIds,
  getTemplateVersions,
} from "@/lib/templates/queries";
import {
  getServices,
  getTemplateCategories,
} from "@/lib/industries/queries";
import { TemplateEditor } from "@/components/admin/template-editor";
import { FontLinks } from "@/components/templates/font-links";
import {
  APPROVED_ARABIC_FONTS,
  APPROVED_ENGLISH_FONTS,
} from "@/lib/industries/config";

export const metadata: Metadata = { title: "Edit template · Admin" };

export default async function AdminTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await getTemplate(id);
  if (!template) notFound();

  const [versions, categories, services, linkedServiceIds] = await Promise.all([
    getTemplateVersions(id),
    getTemplateCategories(template.vertical_id),
    getServices(template.vertical_id),
    getTemplateServiceIds(id),
  ]);

  const currentVersion = versions.find(
    (v) => v.version === template.current_version
  );
  if (!currentVersion) notFound();

  return (
    <div className="space-y-6">
      {/* Sample-brand preview uses the default fonts; load them for fidelity. */}
      <FontLinks fonts={[APPROVED_ARABIC_FONTS[1], APPROVED_ENGLISH_FONTS[0]]} />
      <div>
        <Link
          href="/admin/templates"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← All templates
        </Link>
        <h1 className="mt-1 text-2xl font-bold">{template.name}</h1>
      </div>
      <TemplateEditor
        template={template}
        currentJson={currentVersion.template_json}
        versions={versions}
        categories={categories}
        services={services}
        linkedServiceIds={linkedServiceIds}
      />
    </div>
  );
}
