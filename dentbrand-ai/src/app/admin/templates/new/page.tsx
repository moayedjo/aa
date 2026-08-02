import type { Metadata } from "next";

import { getVerticals } from "@/lib/industries/queries";
import { getTemplateCategories } from "@/lib/industries/queries";
import { NewTemplateForm } from "@/components/admin/new-template-form";

export const metadata: Metadata = { title: "New template · Admin" };

export default async function NewTemplatePage() {
  const verticals = await getVerticals();
  const categoriesByVertical = await Promise.all(
    verticals.map((v) => getTemplateCategories(v.id))
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">New template</h1>
      <NewTemplateForm
        verticals={verticals}
        categories={categoriesByVertical.flat()}
      />
    </div>
  );
}
