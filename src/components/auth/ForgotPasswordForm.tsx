"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordResetAction, type AuthActionState } from "@/lib/auth/actions";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { getCopy, type CopyOverrides } from "@/lib/content/copy";

const initial: AuthActionState = {};

export function ForgotPasswordForm({ overrides = {} }: { overrides?: CopyOverrides }) {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, initial);
  const t = (k: Parameters<typeof getCopy>[0]) => getCopy(k, overrides);

  if (state.notice) {
    return (
      <div className="flex flex-col gap-5">
        <p role="status" className="rounded-lg border border-success bg-surface px-3 py-2 text-sm text-success">{state.notice}</p>
        <Link href="/login" className="text-center font-body text-sm text-ink/70 underline underline-offset-4 hover:text-red">
          {t("auth.forgot.toLogin")}
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {state.error ? (
        <p role="alert" className="rounded-lg border border-red bg-surface px-3 py-2 text-sm text-red-ink">{state.error}</p>
      ) : null}

      <Field label={t("auth.forgot.emailLabel")} name="email" type="email" autoComplete="email" required />

      <Button type="submit" disabled={pending}>
        {pending ? t("common.loading") : t("auth.forgot.submit")}
      </Button>

      <Link href="/login" className="text-center font-body text-sm text-ink/70 underline underline-offset-4 hover:text-red">
        {t("auth.forgot.toLogin")}
      </Link>
    </form>
  );
}
