import { BrandMark } from "@/components/BrandMark";
import { getImageServer } from "@/lib/content/data";

/**
 * Server wrapper that resolves the owner's custom logo (CMS editable images, §4)
 * and renders the brand mark — the uploaded image if set, else the built-in
 * default. Drop-in replacement for <BrandMark> in server components.
 */
export async function BrandLogo({ size = 28 }: { size?: number }) {
  const image = await getImageServer();
  return <BrandMark size={size} src={image("brand.logo")} />;
}
