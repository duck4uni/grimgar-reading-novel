"use client";

import { useEffect } from "react";

/**
 * Loads eruda (mobile console) on the client.
 * Shows a gear icon bottom-right of the screen for inspecting
 * console logs, network requests, and DOM on mobile browsers
 * (especially iOS Safari where DevTools access is limited).
 *
 * Toggle via ?debug=1 query param to avoid loading on every visit.
 */
export function ErudaDebug() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const enabled = params.get("debug") === "1";

    if (!enabled) return;

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/eruda";
    script.onload = () => {
      // @ts-expect-error eruda is loaded globally by the script
      window.eruda?.init();
    };
    document.body.appendChild(script);
  }, []);

  return null;
}
