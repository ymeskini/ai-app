export function generateMDNUrl(
  slug: string | null,
  heading: string | null,
): string {
  const base = `https://developer.mozilla.org/en-US/docs/${slug ?? ""}`;
  if (!heading) return base;

  const anchor = heading
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "");

  return `${base}#${anchor}`;
}
