import type { InputHTMLAttributes } from "react";

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

/** Labeled text input. Label is always present and associated (accessibility). */
export function Field({ label, hint, id, className = "", ...props }: FieldProps) {
  const inputId = id ?? props.name ?? label.replace(/\s+/g, "-").toLowerCase();
  const hintId = hint ? `${inputId}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-xs text-ink/80">
        {label}
      </label>
      <input
        id={inputId}
        aria-describedby={hintId}
        className={
          "min-h-tap w-full border border-hairline bg-surface px-3 py-2.5 font-body text-base " +
          "text-ink placeholder:text-ink/40 focus:border-ink " +
          className
        }
        {...props}
      />
      {hint ? (
        <p id={hintId} className="text-xs text-ink/60">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
