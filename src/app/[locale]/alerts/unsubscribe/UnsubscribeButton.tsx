"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Client component that POSTs the unsubscribe token to the API
 * when the user clicks the button. Shows confirmation inline.
 * Never triggers on page load — only on explicit user action.
 */
export default function UnsubscribeButton({ token }: { token: string }) {
  const t = useTranslations("alerts");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleUnsubscribe() {
    setStatus("loading");

    try {
      await fetch("/api/alerts/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      // The API always returns success (idempotent), so we always show "done"
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return <p className="text-green-700 font-medium">{t("unsubscribeSuccess")}</p>;
  }

  if (status === "error") {
    return <p className="text-red-600">{t("genericError")}</p>;
  }

  return (
    <button
      onClick={handleUnsubscribe}
      disabled={status === "loading"}
      className="px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {status === "loading" ? t("processing") : t("unsubscribeButton")}
    </button>
  );
}
