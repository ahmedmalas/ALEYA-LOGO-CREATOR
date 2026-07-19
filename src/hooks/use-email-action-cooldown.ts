"use client";

import {
  cooldownMessage,
  EMAIL_ACTION_COOLDOWN_SECONDS,
  type EmailActionKind,
  getCooldownRemainingMs,
  markEmailActionSent,
} from "@/lib/auth/email-action-guard";
import { useEffect, useState } from "react";

export function useEmailActionCooldown(kind: EmailActionKind, email: string) {
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    const tick = () => setRemainingMs(getCooldownRemainingMs(kind, email));
    tick();
    if (!email.trim()) return;
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [kind, email]);

  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const active = remainingMs > 0;

  return {
    active,
    remainingSeconds,
    remainingMs,
    message: active ? cooldownMessage(remainingSeconds) : null,
    cooldownSeconds: EMAIL_ACTION_COOLDOWN_SECONDS[kind],
    markSent: (overrideEmail?: string) => {
      const target = (overrideEmail ?? email).trim();
      if (!target) return;
      markEmailActionSent(kind, target);
      setRemainingMs(getCooldownRemainingMs(kind, target));
    },
  };
}
