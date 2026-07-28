import { createClient } from "@/lib/supabase/client";
import { ALLOWED_LOGO_TYPES, MAX_LOGO_BYTES } from "@/lib/validation/brand-kit";

export interface LogoUploadResult {
  path?: string;
  signedUrl?: string;
  error?: string;
}

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/svg+xml": "svg",
  "image/webp": "webp",
};

/**
 * Uploads a logo to the private brand-assets bucket under the workspace's
 * folder. Storage RLS restricts writes to workspace owners/admins, so a
 * forged workspaceId fails server-side regardless of this client code.
 */
export async function uploadLogo(
  workspaceId: string,
  file: File
): Promise<LogoUploadResult> {
  if (!(ALLOWED_LOGO_TYPES as readonly string[]).includes(file.type)) {
    return { error: "Use a PNG, JPG, SVG or WebP image" };
  }
  if (file.size > MAX_LOGO_BYTES) {
    return { error: "Logo must be 2 MB or smaller" };
  }

  const supabase = createClient();
  const path = `${workspaceId}/logo-${Date.now()}.${EXTENSIONS[file.type]}`;

  const { error: uploadError } = await supabase.storage
    .from("brand-assets")
    .upload(path, file, { upsert: false, contentType: file.type });

  if (uploadError) {
    return { error: `Upload failed: ${uploadError.message}` };
  }

  const { data: signed, error: signError } = await supabase.storage
    .from("brand-assets")
    .createSignedUrl(path, 60 * 60);

  return {
    path,
    signedUrl: signError ? undefined : signed?.signedUrl,
  };
}
