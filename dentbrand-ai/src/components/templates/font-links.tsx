/**
 * Loads approved Google Fonts for template previews in the viewer's
 * browser. Export-time font embedding (with validation) is Phase 05 scope.
 */
export function FontLinks({ fonts }: { fonts: string[] }) {
  const families = [...new Set(fonts.filter(Boolean))];
  if (families.length === 0) return null;

  const href =
    "https://fonts.googleapis.com/css2?" +
    families
      .map((f) => `family=${encodeURIComponent(f)}:wght@400;700;800`)
      .join("&") +
    "&display=swap";

  return (
    <>
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href={href} />
    </>
  );
}
