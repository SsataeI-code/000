import { BrandMark } from "@/components/BrandMark";
import { EditableBrandLogo } from "@/components/EditableBrandLogo";
import { getImageServer } from "@/lib/content/data";

/**
 * Server wrapper that resolves the custom logo (CMS editable images, §4) and
 * renders the brand mark — the uploaded image if set, else the built-in default.
 * When `editable` (a coach/owner viewing), the mark becomes click-to-change in
 * place, so the logo can be swapped with a single tap right in the header.
 */
export async function BrandLogo({ size = 28, editable = false }: { size?: number; editable?: boolean }) {
  const image = await getImageServer();
  const src = image("brand.logo");
  if (editable) return <EditableBrandLogo src={src} size={size} editable />;
  return <BrandMark size={size} src={src} />;
}
