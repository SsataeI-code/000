"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInAction, type AuthActionState } from "@/lib/auth/actions";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { getCopy } from "@/lib/content/copy";

const initial: AuthActionState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signInAction, initial);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {state.error ? (
        <p role="alert" className="border border-red bg-surface px-3 py-2 text-sm text-red-ink">
          {state.error}
        </p>
      ) : null}

      <Field
        label={getCopy("auth.login.emailLabel")}
        name="email"
        type="email"
        autoComplete="email"
        required
      />
      <Field
        label={getCopy("auth.login.passwordLabel")}
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />

      <Button type="submit" disabled={pending}>
        {pending ? getCopy("common.loading") : getCopy("auth.login.submit")}
      </Button>

      <Link href="/signup" className="text-center font-body text-sm text-ink/70 underline underline-offset-4 hover:text-red">
        {getCopy("auth.login.toSignup")}
      </Link>
    </form>
  );
}
