import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const base =
  "inline-flex min-h-tap w-full items-center justify-center gap-2 rounded-none px-5 py-3 " +
  "font-label text-sm font-600 uppercase tracking-wide transition-transform " +
  "active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  // Flat, high-contrast, no gradients (§4).
  primary: "bg-red text-surface hover:bg-red-ink",
  ghost: "bg-transparent text-ink underline underline-offset-4 hover:text-red",
};

/** House-style button. 44px min height baked in for tap-target accessibility. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", className = "", type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    />
  );
});
