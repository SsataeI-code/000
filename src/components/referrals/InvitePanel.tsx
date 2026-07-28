"use client";

import { useState } from "react";
import { referralLink, inviteMessage } from "@/lib/referrals/code";
import type { ReferralStats } from "@/lib/referrals/code";
import { getCopy, type CopyOverrides } from "@/lib/content/copy";
import { IconMessages } from "@/components/icons";

/**
 * Client-side share/invite flow (§8). Shows the client's personal link, offers
 * native share (falling back to copy), and reflects their referral tally as
 * privacy-safe counts — never a friend's name.
 */
export function InvitePanel({
  code,
  origin,
  stats,
  overrides = {},
}: {
  code: string | null;
  origin: string;
  stats: ReferralStats;
  overrides?: CopyOverrides;
}) {
  const [copied, setCopied] = useState(false);
  const t = (k: Parameters<typeof getCopy>[0]) => getCopy(k, overrides);

  if (!code) {
    return (
      <section className="border border-hairline bg-surface p-5">
        <h2 className="text-2xl text-ink">{t("client.invite.title")}</h2>
        <p className="mt-2 font-body text-sm text-ink/60">
          Your invite link will appear here in a moment.
        </p>
      </section>
    );
  }

  // Prefer a server-provided origin; fall back to the live origin in the browser.
  const base = origin || (typeof window !== "undefined" ? window.location.origin : "");
  const link = referralLink(base, code);

  async function share() {
    const shareData = { title: t("brand.name"), text: inviteMessage(link), url: link };
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      // User dismissed the share sheet — fall through to copy.
    }
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="border border-hairline bg-surface p-5">
      <h2 className="text-2xl text-ink">{t("client.invite.title")}</h2>
      <p className="mt-2 font-body text-sm text-ink/60">{t("client.invite.body")}</p>

      <div className="mt-4 flex items-center gap-2 border border-hairline bg-surface-muted px-3 py-2.5">
        <span className="min-w-0 flex-1 truncate font-body text-sm text-ink/80" aria-label="Your invite link">
          {link}
        </span>
        <button
          type="button"
          onClick={copy}
          className="min-h-tap shrink-0 font-label text-[11px] uppercase tracking-wide text-red hover:text-red-ink"
        >
          {copied ? t("client.invite.copied") : t("client.invite.copy")}
        </button>
      </div>

      <button
        type="button"
        onClick={share}
        className="mt-3 inline-flex min-h-tap items-center gap-2 bg-red px-4 py-2.5 font-label text-xs font-600 uppercase tracking-wide text-white hover:bg-red-ink"
      >
        <span aria-hidden className="h-4 w-4"><IconMessages /></span>
        {t("client.invite.share")}
      </button>

      {stats.total > 0 ? (
        <div className="mt-4 flex gap-3 border-t border-hairline pt-4">
          <Stat value={stats.joined} label={t("client.invite.joinedLabel")} />
          <Stat value={stats.rewarded} label={t("client.invite.rewardedLabel")} />
        </div>
      ) : null}
    </section>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex-1 border border-hairline bg-surface-muted p-3 text-center">
      <p className="font-display text-2xl text-ink">{value}</p>
      <p className="font-label text-[10px] uppercase tracking-wide text-ink/50">{label}</p>
    </div>
  );
}
