import "server-only";
import { Resend } from "resend";
import { decodeEntities } from "@/lib/decode-entities";

/**
 * Lazily-initialized Resend client.
 * Reads RESEND_API_KEY from the environment. Throws if missing.
 */
let _resend: Resend | null = null;

function getResendClient(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      throw new Error(
        "Missing RESEND_API_KEY. Add it to .env.local to enable alert emails."
      );
    }
    _resend = new Resend(key);
  }
  return _resend;
}

/**
 * Lazy accessor for the alert-email sender address.
 * Throws when called (not at import) so that importing the email module
 * does not require ALERTS_FROM_EMAIL to be set at build time. The var is
 * only needed when an email is actually sent.
 */
function getAlertsFrom(): string {
  const value = process.env.ALERTS_FROM_EMAIL;
  if (!value) {
    throw new Error(
      "ALERTS_FROM_EMAIL environment variable is not set. " +
        "Add ALERTS_FROM_EMAIL=alerts@timicy.com to .env.local."
    );
  }
  return value;
}

/**
 * Escape a string for safe interpolation into HTML email bodies.
 * Covers the five characters that can break HTML structure or attributes.
 * Must NOT be applied to plain-text contexts (e.g. email subject lines).
 */
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* -------------------------------------------------------------------------- */
/*  Activation email (single opt-in)                                          */
/*  Sent immediately after a subscription is created or updated. Tells the    */
/*  user their alert is active and includes an unsubscribe link.              */
/* -------------------------------------------------------------------------- */

interface SendActivationEmailParams {
  /** Recipient email address */
  to: string;
  /** User's locale ('el' | 'en') — determines language of the email */
  locale: string;
  /** Human-readable product title shown in the email */
  productTitle: string;
  /** The price the user wants to be notified at */
  targetPrice: number;
  /** Full URL to the unsubscribe page (with token in query string) */
  unsubscribeUrl: string;
}

/**
 * Send an activation email for a price alert subscription (single opt-in).
 * The email is localized based on the `locale` parameter (el or en).
 * Uses simple inline-styled HTML for maximum email client compatibility.
 *
 * Returns { success, error } so the caller can detect send failures
 * without relying on exceptions. Mirrors sendPriceAlertEmail's contract.
 */
export async function sendActivationEmail({
  to,
  locale,
  productTitle,
  targetPrice,
  unsubscribeUrl,
}: SendActivationEmailParams): Promise<{ success: boolean; error?: string }> {
  const resend = getResendClient();

  // Sender address; throws if ALERTS_FROM_EMAIL is unset.
  const from = getAlertsFrom();

  // Format the target price for display (e.g. "149.99")
  const formattedPrice = `€${Number(targetPrice).toFixed(2)}`;

  // Pick localized strings based on the user's locale
  const isGreek = locale === "el";

  // Decode HTML entities so the subject line reads cleanly
  // (e.g. "Sony &amp; Bose" → "Sony & Bose"). Subject is plain text,
  // so decodedTitle is used there without escaping.
  const decodedTitle = decodeEntities(productTitle);

  // For HTML bodies: decode first, then escape, to avoid double-encoding.
  const safeTitle = escapeHtml(decodedTitle);

  const subject = isGreek
    ? `Η ειδοποίηση τιμής για ${decodedTitle} είναι ενεργή`
    : `Your price alert for ${decodedTitle} is active`;

  const heading = isGreek
    ? "Η ειδοποίηση τιμής σου είναι ενεργή"
    : "Your price alert is active";

  const intro = isGreek
    ? `Θα σε ειδοποιήσουμε μέσω email όταν η τιμή του <strong>${safeTitle}</strong> πέσει στα <strong>${formattedPrice}</strong> ή χαμηλότερα.`
    : `We'll email you when <strong>${safeTitle}</strong> drops to <strong>${formattedPrice}</strong> or below.`;

  const didntRequest = isGreek
    ? "Αν δεν ζήτησες αυτή την ειδοποίηση, μπορείς να κάνεις"
    : "If you didn't request this alert, you can";

  const unsubLabel = isGreek ? "διαγραφή εδώ" : "unsubscribe here";

  const footer = isGreek
    ? "TimiCY, Σύγκριση τιμών ηλεκτρονικών στην Κύπρο"
    : "TimiCY. Electronics price comparison in Cyprus";

  // Simple inline-styled HTML email — no confirm button (single opt-in)
  const html = `
<!DOCTYPE html>
<html lang="${locale}">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f9fafb;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:8px;border:1px solid #e5e7eb;overflow:hidden;">
    <!-- Header -->
    <div style="background:#0A2540;padding:24px 32px;">
      <h1 style="margin:0;color:#ffffff;font-size:20px;">${heading}</h1>
    </div>

    <!-- Body -->
    <div style="padding:32px;">
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
        ${intro}
      </p>
    </div>

    <!-- Footer -->
    <div style="padding:16px 32px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;">
      <p style="margin:0 0 8px;">
        ${didntRequest}
        <a href="${unsubscribeUrl}" style="color:#2563eb;">${unsubLabel}</a>.
      </p>
      <p style="margin:0;">${footer}</p>
    </div>
  </div>
</body>
</html>`.trim();

  // Resend's emails.send returns { data, error } and does NOT throw on
  // API errors, so we check the error field explicitly.
  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
  });

  if (error) {
    console.error("Activation email failed:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/* -------------------------------------------------------------------------- */
/*  Price-alert notification email                                            */
/*  Sent when a product's lowest available price drops to or below the        */
/*  user's target price. Includes the current deal, the store offering it,    */
/*  and a CTA button linking directly to the product page.                    */
/* -------------------------------------------------------------------------- */

interface SendPriceAlertEmailParams {
  /** Recipient email address */
  to: string;
  /** User's locale ('el' | 'en') - determines language of the email */
  locale: string;
  /** Human-readable product title shown in the email */
  productTitle: string;
  /** The price the user wanted to be notified at */
  targetPrice: number;
  /** The current lowest available price for the product */
  currentMinPrice: number;
  /** The store name offering the lowest price */
  storeName: string;
  /** Full URL to the product page */
  productUrl: string;
  /** Full URL to the unsubscribe page (with token in query string) */
  unsubscribeUrl: string;
}

/**
 * Send a price-alert notification email when the price drops to/below
 * the user's target. Returns { success, error } so the caller can decide
 * whether to mark the subscription row as notified.
 *
 * Resend's emails.send does NOT throw on API errors; it returns
 * { data, error }. We surface the error field so the calling code can
 * handle partial failures per row.
 */
export async function sendPriceAlertEmail({
  to,
  locale,
  productTitle,
  targetPrice,
  currentMinPrice,
  storeName,
  productUrl,
  unsubscribeUrl,
}: SendPriceAlertEmailParams): Promise<{ success: boolean; error?: string }> {
  const resend = getResendClient();

  // Sender address; throws if ALERTS_FROM_EMAIL is unset.
  const from = getAlertsFrom();

  // Format prices for display (e.g. "€149.99")
  const formattedTarget = `€${Number(targetPrice).toFixed(2)}`;
  const formattedCurrent = `€${Number(currentMinPrice).toFixed(2)}`;

  // Pick localized strings based on the user's locale
  const isGreek = locale === "el";

  // Decode HTML entities so the subject line reads cleanly
  // (e.g. "Sony &amp; Bose" -> "Sony & Bose"). Subject is plain text,
  // so decodedTitle is used there without escaping.
  const decodedTitle = decodeEntities(productTitle);

  // For HTML bodies: decode first, then escape, to avoid double-encoding.
  const safeTitle = escapeHtml(decodedTitle);
  const safeStore = escapeHtml(storeName);

  const subject = isGreek
    ? `Η τιμή έπεσε για ${decodedTitle}`
    : `Price dropped for ${decodedTitle}`;

  const heading = isGreek ? "Η τιμή έπεσε!" : "The price dropped!";

  // Main body text: tells the user the product, current lowest price,
  // the store offering it, and reminds them of their target price.
  const bodyText = isGreek
    ? `Το <strong>${safeTitle}</strong> είναι τώρα διαθέσιμο στα <strong style="color:#15803D;">${formattedCurrent}</strong> από <strong>${safeStore}</strong>. Ο στόχος σου ήταν ${formattedTarget}.`
    : `<strong>${safeTitle}</strong> is now available at <strong style="color:#15803D;">${formattedCurrent}</strong> from <strong>${safeStore}</strong>. Your target was ${formattedTarget}.`;

  // CTA button label
  const ctaLabel = isGreek ? "Δες την προσφορά" : "See the deal";

  // Unsubscribe footer text
  const unsubText = isGreek
    ? "Δεν θέλεις άλλες ειδοποιήσεις για αυτό το προϊόν;"
    : "Don't want more alerts for this product?";

  const unsubLabel = isGreek ? "Διαγραφή εδώ" : "Unsubscribe here";

  const footer = isGreek
    ? "TimiCY - Σύγκριση τιμών ηλεκτρονικών στην Κύπρο"
    : "TimiCY - Electronics price comparison in Cyprus";

  // Simple inline-styled HTML email with navy header, price emphasis,
  // and a CTA button linking to the product page.
  const html = `
<!DOCTYPE html>
<html lang="${locale}">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f9fafb;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:8px;border:1px solid #e5e7eb;overflow:hidden;">
    <!-- Header with navy background -->
    <div style="background:#0A2540;padding:24px 32px;">
      <h1 style="margin:0;color:#ffffff;font-size:20px;">${heading}</h1>
    </div>

    <!-- Body: product info, price, store, and CTA button -->
    <div style="padding:32px;">
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#374151;">
        ${bodyText}
      </p>
      <div style="text-align:center;">
        <a href="${productUrl}" style="display:inline-block;padding:12px 32px;background:#0A2540;color:#ffffff;text-decoration:none;border-radius:6px;font-size:15px;font-weight:600;">${ctaLabel}</a>
      </div>
    </div>

    <!-- Footer: unsubscribe link and branding -->
    <div style="padding:16px 32px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;">
      <p style="margin:0 0 8px;">
        ${unsubText}
        <a href="${unsubscribeUrl}" style="color:#2563eb;">${unsubLabel}</a>.
      </p>
      <p style="margin:0;">${footer}</p>
    </div>
  </div>
</body>
</html>`.trim();

  // Send via Resend. Note: resend.emails.send returns { data, error }
  // and does NOT throw on API errors, so we check the error field.
  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
