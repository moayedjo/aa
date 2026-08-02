import { createClient } from "@/lib/supabase/client";

export interface DesignImageUploadResult {
  ref?: string;
  signedUrl?: string;
  storagePath?: string;
  mimeType?: "image/png" | "image/jpeg" | "image/webp";
  error?: string;
}

const ALLOWED: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Uploads a design image to the private design-assets bucket. Storage RLS
 * restricts writes to workspace owner/admin/editor; forged workspace ids
 * fail server-side. Returns the internal ref stored in design JSON plus a
 * signed URL for immediate canvas display.
 */
export async function uploadDesignImage(
  workspaceId: string,
  designId: string,
  file: File
): Promise<DesignImageUploadResult> {
  const extension = ALLOWED[file.type];
  if (!extension) return { error: "Use a PNG, JPG or WebP image" };
  if (file.size > MAX_BYTES) return { error: "Images must be 5 MB or smaller" };

  const supabase = createClient();
  const storagePath = `${workspaceId}/${designId}/img-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("design-assets")
    .upload(storagePath, file, { upsert: false, contentType: file.type });
  if (uploadError) return { error: `Upload failed: ${uploadError.message}` };

  const { data: signed, error: signError } = await supabase.storage
    .from("design-assets")
    .createSignedUrl(storagePath, 60 * 60);
  if (signError || !signed) {
    return { error: "Uploaded, but the image could not be loaded" };
  }

  return {
    ref: `supabase://design-assets/${storagePath}`,
    signedUrl: signed.signedUrl,
    storagePath,
    mimeType: file.type as DesignImageUploadResult["mimeType"],
  };
}
