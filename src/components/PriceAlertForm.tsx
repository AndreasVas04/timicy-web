"use client";

import { useState, FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/* -------------------------------------------------------------------------- */
/*  Props                                                                     */
/* -------------------------------------------------------------------------- */

interface PriceAlertFormProps {
  /** The numeric product ID to subscribe to */
  productId: number;
  /** The current lowest price — used as a hint/prefill for the target price */
  currentMinPrice: number;
  /** User's locale ('el' | 'en') — sent to the API for localized emails */
  locale: string;
}

/* -------------------------------------------------------------------------- */
/*  PriceAlertForm                                                            */
/*  Client component that lets users subscribe to price drop alerts.          */
/*  Submits to /api/alerts/subscribe and shows a generic success message.     */
/*  Includes a honeypot field to deter bots.                                  */
/* -------------------------------------------------------------------------- */

export default function PriceAlertForm({
  productId,
  currentMinPrice,
  locale,
}: PriceAlertFormProps) {
  const t = useTranslations("alerts");

  const [email, setEmail] = useState("");
  const [targetPrice, setTargetPrice] = useState(
    currentMinPrice > 0 ? currentMinPrice.toFixed(2) : ""
  );
  const [honeypot, setHoneypot] = useState(""); // Hidden field — bots fill it, humans don't
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [errors, setErrors] = useState<{ email?: string; price?: string }>({});

  /**
   * Validate inputs client-side before sending to the API.
   * Returns true if all fields are valid.
   */
  function validate(): boolean {
    const newErrors: { email?: string; price?: string } = {};

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      newErrors.email = t("invalidEmail");
    }

    // Target price must be a positive number
    const priceNum = parseFloat(targetPrice);
    if (!targetPrice || isNaN(priceNum) || priceNum <= 0) {
      newErrors.price = t("invalidPrice");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setStatus("submitting");

    try {
      await fetch("/api/alerts/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          productId,
          targetPrice: parseFloat(targetPrice),
          locale,
          website: honeypot, // Honeypot — should be empty for real users
        }),
      });

      // Always show success regardless of server response (no enumeration)
      setStatus("success");
    } catch {
      // Even on network error, show success to avoid information leakage
      setStatus("success");
    }
  }

  // After submission, show the "check your inbox" message
  if (status === "success") {
    return (
      <div className="mt-8 rounded-lg border border-stock/30 bg-stock/5 p-4">
        <p className="font-medium text-stock">{t("successMessage")}</p>
      </div>
    );
  }

  return (
    /* Alert form sheet: white surface with a teal left rail, marking it
       as the page's interactive "do something" element (teal = action). */
    <form
      onSubmit={handleSubmit}
      className="mt-8 rounded-lg border border-line border-l-[3px] border-l-brand bg-surface p-4 sm:p-5"
    >
      <h3 className="text-base sm:text-lg font-bold tracking-tight mb-1">{t("formTitle")}</h3>
      <p className="text-sm text-mute mb-4">{t("formDescription")}</p>

      <div className="flex flex-col gap-3">
        {/* Email input */}
        <div>
          <label htmlFor="alert-email" className="block text-sm font-medium text-mute mb-1">
            {t("emailLabel")}
          </label>
          <input
            id="alert-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailPlaceholder")}
            className="w-full px-3 py-2 border border-line rounded-md text-sm text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
          />
          {errors.email && (
            <p className="text-red-600 text-xs mt-1">{errors.email}</p>
          )}
        </div>

        {/* Target price input */}
        <div>
          <label htmlFor="alert-price" className="block text-sm font-medium text-mute mb-1">
            {t("priceLabel")}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-mute text-sm">€</span>
            <input
              id="alert-price"
              type="number"
              step="0.01"
              min="0.01"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              className="w-full pl-7 pr-3 py-2 border border-line rounded-md text-sm text-ink tabular-nums focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            />
          </div>
          {errors.price && (
            <p className="text-red-600 text-xs mt-1">{errors.price}</p>
          )}
        </div>

        {/* Honeypot field — visually hidden, off-screen for accessibility.
            Bots that auto-fill all fields will populate this, revealing themselves.
            NOT type="hidden" — screen readers skip hidden inputs, but bots fill visible ones. */}
        <div
          aria-hidden="true"
          style={{ position: "absolute", left: "-9999px", top: "-9999px" }}
        >
          <label htmlFor="alert-website">Website</label>
          <input
            id="alert-website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={status === "submitting"}
          className="w-full px-4 py-2.5 bg-ink text-white text-sm font-medium rounded-md hover:bg-ink-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === "submitting" ? t("submitting") : t("submitButton")}
        </button>

        {/* Privacy consent note — small muted text with a link to the
            privacy policy. Uses next-intl rich text to render the <link>
            placeholder as a locale-aware anchor. */}
        <p className="text-xs text-faint mt-2 text-center">
          {t.rich("privacyConsent", {
            link: (chunks) => (
              <Link
                href="/privacy"
                className="text-brand underline-offset-2 hover:underline"
              >
                {chunks}
              </Link>
            ),
          })}
        </p>
      </div>
    </form>
  );
}
