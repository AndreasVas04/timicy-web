/**
 * Shared layout shell for legal pages (privacy, terms).
 *
 * Renders a consistent page structure:
 * - Header block: h1 title, "last updated" date, subtle horizontal rule.
 * - Body card: white surface with sections separated by border-line
 *   dividers. Each section has a short teal accent bar above the h2
 *   heading, followed by paragraphs with inline links.
 *
 * The about page does NOT use this shell for its body (its structure is
 * different), but it reuses the same header treatment via LegalPageHeader.
 */

import React from "react";
import type { LegalPageContent } from "@/content/legal/privacy";
import { renderParagraphWithLinks } from "@/content/legal/render-helpers";

/* -------------------------------------------------------------------------- */
/*  Header (reused by the about page as well)                                 */
/* -------------------------------------------------------------------------- */

/**
 * Consistent header block for all legal/info pages: h1, optional
 * "last updated" line, and a subtle horizontal rule with spacing.
 */
export function LegalPageHeader({
  title,
  lastUpdated,
}: {
  title: string;
  lastUpdated?: string;
}) {
  return (
    <header className="mb-8">
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-ink font-heading">
        {title}
      </h1>
      {lastUpdated && (
        <p className="mt-2 text-sm text-faint">{lastUpdated}</p>
      )}
      {/* Subtle horizontal rule with breathing room above and below. */}
      <hr className="mt-6 border-line" />
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/*  Full shell (header + sectioned card body)                                 */
/* -------------------------------------------------------------------------- */

/**
 * Complete page shell for privacy and terms: header block above, then a
 * card containing all sections with dividers and accent bars.
 */
export default function LegalPageShell({
  content,
}: {
  content: LegalPageContent;
}) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
      <LegalPageHeader title={content.title} lastUpdated={content.lastUpdated} />

      {/* Body card: white surface with a subtle border, comfortable padding.
          Sections are separated by border-line dividers (divide-y) with
          generous vertical padding per section. */}
      <div className="bg-surface border border-line rounded-lg p-6 sm:p-10">
        <div className="divide-y divide-line">
          {content.sections.map((section, idx) => (
            <section
              key={idx}
              className={idx === 0 ? "pb-8" : "py-8"}
            >
              {/* Short teal accent bar above the heading (3rem wide, 2px tall). */}
              <div className="w-12 h-0.5 bg-brand mb-4" />

              {/* Section heading with clear step-down from the h1. */}
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-ink font-heading mb-3">
                {section.heading}
              </h2>

              {/* Paragraphs with relaxed leading; email addresses and the
                  data-protection authority reference are rendered as links. */}
              {section.paragraphs.map((para, pIdx) => (
                <p
                  key={pIdx}
                  className="text-mute leading-relaxed mt-2"
                >
                  {renderParagraphWithLinks(para)}
                </p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
