import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const base =
  "inline-flex min-h-tap w-full items-center justify-center gap-2 rounded-xl px-5 py-3 " +
  "font-label text-sm font-600 uppercase tracking-wide transition-[transform,box-shadow,background-color,color,border-color] duration-150 " +
  "active:translate-y-[3px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  // Cartoon-game: gradient fill, chunky "pop" bottom edge that presses in, red glow.
  primary: "bg-grad-red text-white shadow-pop-red hover:shadow-glow",
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
