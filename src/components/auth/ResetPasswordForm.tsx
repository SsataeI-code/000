"use client";

import { useActionState } from "react";
import { updatePasswordAction, type AuthActionState } from "@/lib/auth/actions";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { getCopy, type CopyOverrides } from "@/lib/content/copy";

const initial: AuthActionState = {};

export function ResetPasswordForm({ overrides = {} }: { overrides?: CopyOverrides }) {
  const [state, formAction, pending] = useActionState(updatePasswordAction, initial);
  const t = (k: Parameters<typeof getCopy>[0]) => getCopy(k, overrides);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {state.error ? (
        <p role="alert" className="border border-red bg-surface px-3 py-2 text-sm text-red-ink">{state.error}</p>
      ) : null}

      <Field
        label={t("auth.reset.passwordLabel")}
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
      />

      <Button type="submit" disabled={pending}>
        {pending ? t("common.loading") : t("auth.reset.submit")}
      </Button>
    </form>
  );
}
