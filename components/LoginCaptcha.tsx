"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type CaptchaChallenge = {
  token: string;
  code: string;
  expiresInSeconds: number;
};

export function LoginCaptcha({
  answer,
  onAnswerChange,
  onTokenChange,
  refreshSignal = 0
}: {
  answer: string;
  onAnswerChange: (value: string) => void;
  onTokenChange: (value: string) => void;
  refreshSignal?: number;
}) {
  const [challenge, setChallenge] = useState<CaptchaChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [refreshNotice, setRefreshNotice] = useState("");
  const requestSeq = useRef(0);

  const refreshCaptcha = useCallback(async (options?: { expired?: boolean }) => {
    const requestId = ++requestSeq.current;
    setLoading(true);
    onAnswerChange("");
    onTokenChange("");
    setRefreshNotice(options?.expired ? "The previous verification code expired after 3 minutes. A new code has been generated." : "");
    try {
      const res = await fetch("/api/auth/captcha", { cache: "no-store" });
      const payload = (await res.json()) as CaptchaChallenge;
      if (requestId !== requestSeq.current) {
        return;
      }
      setChallenge(payload);
      setSecondsLeft(payload.expiresInSeconds);
      onTokenChange(payload.token);
    } catch {
      if (requestId !== requestSeq.current) {
        return;
      }
      setChallenge(null);
      setSecondsLeft(0);
    } finally {
      if (requestId !== requestSeq.current) {
        return;
      }
      setLoading(false);
    }
  }, [onAnswerChange, onTokenChange]);

  useEffect(() => {
    refreshCaptcha();
  }, [refreshCaptcha]);

  useEffect(() => {
    if (refreshSignal > 0) {
      refreshCaptcha();
    }
  }, [refreshCaptcha, refreshSignal]);

  useEffect(() => {
    if (!challenge || loading) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          refreshCaptcha({ expired: true });
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [challenge, loading, refreshCaptcha]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <section className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4 dark:border-white/15 dark:bg-white/10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Human Verification</p>
          <div aria-label="Displayed verification code" className="captcha-code">
            {loading ? "..." : challenge?.code ?? "REFRESH"}
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">Expires in {formattedTime}</p>
        </div>
        <button type="button" className="btn-secondary" onClick={() => refreshCaptcha()} disabled={loading}>
          Refresh Code
        </button>
      </div>
      <input
        className="input-field mt-4"
        placeholder="Enter the displayed code"
        value={answer}
        onChange={(event) => onAnswerChange(event.target.value.toUpperCase())}
        autoComplete="off"
        inputMode="text"
      />
      <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">Enter the visible code before submitting email and password. The signed code expires after 3 minutes.</p>
      {refreshNotice ? <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-200">{refreshNotice}</p> : null}
    </section>
  );
}
