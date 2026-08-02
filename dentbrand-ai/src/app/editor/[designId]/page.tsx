import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import {
  getDesign,
  getDesignVersions,
  getAssetUrlMap,
  parseDesign,
} from "@/lib/designs/queries";
import { getMyWorkspaceRole } from "@/lib/workspaces/queries";
import { getBrandKit, getIndustrySettings } from "@/lib/brand-kit/queries";
import {
  getContentGoals,
  getServices,
  getVerticalByKey,
} from "@/lib/industries/queries";
import {
  getRecentCopyGenerations,
  getRecentImageGenerations,
} from "@/lib/ai/queries";
import { getWallet } from "@/lib/credits/queries";
import { getMyDesignRating } from "@/lib/support/queries";
import { EditorShell } from "@/components/editor/editor-shell";
import { FontLinks } from "@/components/templates/font-links";

export const metadata: Metadata = { title: "Editor" };

export default async function EditorPage({
  params,
}: {
  params: Promise<{ designId: string }>;
}) {
  const { designId } = await params;

  // RLS: designs in foreign workspaces are invisible → 404.
  const design = await getDesign(designId);
  if (!design) notFound();

  // Viewers get the workspace page, not the editor.
  const role = await getMyWorkspaceRole(design.workspace_id);
  if (role !== "owner" && role !== "admin" && role !== "editor") {
    redirect(`/dashboard/workspaces/${design.workspace_id}`);
  }

  // Trashed designs are restored from My Designs, not edited directly.
  if (design.deleted_at) {
    redirect(`/dashboard/workspaces/${design.workspace_id}/designs?view=trash`);
  }

  const parsed = parseDesign(design);
  if (!parsed.ok) {
    // Corrupted design data must be visible, not silently "fixed".
    throw new Error(`This design's data is invalid: ${parsed.error}`);
  }

  const [
    assetUrls,
    brandKit,
    versions,
    settings,
    copyGenerations,
    imageGenerations,
  ] = await Promise.all([
    getAssetUrlMap(parsed.json),
    getBrandKit(design.workspace_id),
    getDesignVersions(design.id),
    getIndustrySettings(design.workspace_id),
    getRecentCopyGenerations(design.id),
    getRecentImageGenerations(design.id),
  ]);

  const [wallet, initialRating] = await Promise.all([
    getWallet(design.workspace_id),
    getMyDesignRating(design.id),
  ]);

  const vertical = await getVerticalByKey(settings?.industry_key ?? "dental");
  const [services, goals] = vertical
    ? await Promise.all([
        getServices(vertical.id),
        getContentGoals(vertical.id),
      ])
    : [[], []];

  const brandColors = [
    brandKit?.primary_color,
    brandKit?.secondary_color,
    brandKit?.accent_color,
    brandKit?.background_color,
    brandKit?.text_color,
    "#ffffff",
    "#000000",
  ].filter((c): c is string => !!c);

  const fonts = [brandKit?.arabic_font, brandKit?.english_font].filter(
    (f): f is string => !!f
  );

  return (
    <>
      <FontLinks fonts={fonts} />
      <EditorShell
        designId={design.id}
        workspaceId={design.workspace_id}
        designName={design.name}
        language={design.language}
        design={parsed.json}
        assetUrls={assetUrls}
        brandColors={[...new Set(brandColors)]}
        versions={versions}
        serverUpdatedAt={design.updated_at}
        services={services}
        goals={goals}
        copyGenerations={copyGenerations}
        imageGenerations={imageGenerations}
        imageBalance={wallet?.balance ?? null}
        initialRating={initialRating}
      />
    </>
  );
}
