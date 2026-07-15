"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpAction, type AuthActionState } from "@/lib/auth/actions";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { getCopy } from "@/lib/content/copy";

const initial: AuthActionState = {};

export function SignupForm({ coachCode }: { coachCode?: string }) {
  const [state, formAction, pending] = useActionState(signUpAction, initial);

  if (state.notice) {
    return (
      <p role="status" className="border border-hairline bg-surface px-4 py-4 text-sm text-ink/80">
        {state.notice}
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {state.error ? (
        <p role="alert" className="border border-red bg-surface px-3 py-2 text-sm text-red-ink">
          {state.error}
        </p>
      ) : null}

      <Field label={getCopy("auth.signup.nameLabel")} name="name" autoComplete="name" required />
      <Field
        label={getCopy("auth.signup.emailLabel")}
        name="email"
        type="email"
        autoComplete="email"
        required
      />
      <Field
        label={getCopy("auth.signup.passwordLabel")}
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
      />
      <Field
        label={getCopy("auth.signup.coachCodeLabel")}
        name="coach_code"
        defaultValue={coachCode}
        hint={getCopy("auth.signup.coachCodeHint")}
        autoCapitalize="characters"
        inputMode="text"
      />

      <label className="flex items-start gap-3 font-body text-sm text-ink/80">
        <input
          type="checkbox"
          name="consent"
          required
          className="mt-1 h-5 w-5 shrink-0 accent-red"
        />
        <span>{getCopy("auth.signup.consentLabel")}</span>
      </label>

      <Button type="submit" disabled={pending}>
        {pending ? getCopy("common.loading") : getCopy("auth.signup.submit")}
      </Button>

      <Link href="/login" className="text-center font-body text-sm text-ink/70 underline underline-offset-4 hover:text-red">
        {getCopy("auth.signup.toLogin")}
      </Link>
    </form>
  );
}
