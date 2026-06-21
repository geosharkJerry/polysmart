"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement | string, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
      remove?: (widgetId?: string) => void;
    };
    __POLYSMART_TURNSTILE_SITE_KEY__?: string;
  }
}

type Props = {
  onTokenChange: (token: string) => void;
  onExpired?: () => void;
  className?: string;
};

export function TurnstileWidget({ onTokenChange, onExpired, className = "" }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    const siteKey = window.__POLYSMART_TURNSTILE_SITE_KEY__;
    if (!siteKey || !containerRef.current) {
      setConfigured(false);
      setReady(false);
      return;
    }
    setConfigured(true);

    const mount = () => {
      if (!window.turnstile || !containerRef.current || widgetIdRef.current) {
        return;
      }
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: document.documentElement.dataset.theme === "dark" ? "dark" : "light",
        callback: (token: string) => {
          onTokenChange(token);
        },
        "expired-callback": () => {
          onTokenChange("");
          onExpired?.();
        },
        "error-callback": () => {
          onTokenChange("");
        }
      });
      setReady(true);
    };

    if (window.turnstile) {
      mount();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = mount;
    document.head.appendChild(script);

    return () => {
      if (widgetIdRef.current && window.turnstile?.remove) {
        window.turnstile.remove(widgetIdRef.current);
      }
      widgetIdRef.current = null;
    };
  }, [onExpired, onTokenChange]);

  return (
    <div className={className}>
      <div ref={containerRef} className="min-h-[78px] rounded-2xl border border-dashed border-sky-100 bg-white/70 p-3 dark:border-white/15 dark:bg-white/5" />
      {!configured ? (
        <p className="mt-2 text-xs font-semibold text-amber-600 dark:text-amber-300">Human verification is not configured yet. Add TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY in Cloudflare before production sign-in can continue.</p>
      ) : !ready ? (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Loading human verification...</p>
      ) : null}
    </div>
  );
}
