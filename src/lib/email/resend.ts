import "server-only";
import { Resend } from "resend";

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
 */
export async function sendActivationEmail({
  to,
  locale,
  productTitle,
  targetPrice,
  unsubscribeUrl,
}: SendActivationEmailParams) {
  const resend = getResendClient();

  // "from" address — use the env var if set, otherwise fall back to Resend's
  // default sandbox address (timicy.com isn't DNS-verified yet).
  const from = process.env.ALERTS_FROM_EMAIL || "onboarding@resend.dev";

  // Format the target price for display (e.g. "149.99")
  const formattedPrice = `€${Number(targetPrice).toFixed(2)}`;

  // Pick localized strings based on the user's locale
  const isGreek = locale === "el";

  const subject = isGreek
    ? `Η ειδοποίηση τιμής για ${productTitle} είναι ενεργή`
    : `Your price alert for ${productTitle} is active`;

  const heading = isGreek
    ? "Η ειδοποίηση τιμής σου είναι ενεργή"
    : "Your price alert is active";

  const intro = isGreek
    ? `Θα σε ειδοποιήσουμε μέσω email όταν η τιμή του <strong>${productTitle}</strong> πέσει στα <strong>${formattedPrice}</strong> ή χαμηλότερα.`
    : `We'll email you when <strong>${productTitle}</strong> drops to <strong>${formattedPrice}</strong> or below.`;

  const didntRequest = isGreek
    ? "Αν δεν ζήτησες αυτή την ειδοποίηση, μπορείς να κάνεις"
    : "If you didn't request this alert, you can";

  const unsubLabel = isGreek ? "διαγραφή εδώ" : "unsubscribe here";

  const footer = isGreek
    ? "TimiCY — Σύγκριση τιμών ηλεκτρονικών στην Κύπρο"
    : "TimiCY — Electronics price comparison in Cyprus";

  // Simple inline-styled HTML email — no confirm button (single opt-in)
  const html = `
<!DOCTYPE html>
<html lang="${locale}">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f9fafb;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:8px;border:1px solid #e5e7eb;overflow:hidden;">
    <!-- Header -->
    <div style="background:#1e40af;padding:24px 32px;">
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

  await resend.emails.send({
    from,
    to,
    subject,
    html,
  });
}
