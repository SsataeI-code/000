"use client";

import { useEffect } from "react";
import { captureTimezoneAction } from "@/lib/time/actions";

/**
 * Silently reports the browser's IANA timezone once per load so the server can
 * reset daily stats at the client's local midnight (§2). Renders nothing; the
 * action is a no-op when the value is unchanged. A device with no resolvable
 * zone just leaves the stored value alone (server falls back to UTC).
 */
export function TimezoneSync() {
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) void captureTimezoneAction(tz);
    } catch {
      /* no timezone available — leave as-is */
    }
  }, []);
  return null;
}
