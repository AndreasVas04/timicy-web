/**
 * Shared rendering helpers for legal pages (privacy, terms).
 *
 * Both pages share the same visual structure: a header block with title
 * and "last updated" date, followed by a card containing sections with
 * headings and paragraphs. This module provides a function to render
 * inline links (email addresses and external references) within paragraph
 * text, so that contact@timicy.com and dataprotection.gov.cy appear as
 * clickable links styled in brand color.
 */

import React from "react";

/**
 * Patterns that should be rendered as clickable links inside legal text.
 * Each entry maps a literal string to the href it should point to.
 */
const LINK_TARGETS: { text: string; href: string }[] = [
  { text: "contact@timicy.com", href: "mailto:contact@timicy.com" },
  { text: "dataprotection.gov.cy", href: "https://dataprotection.gov.cy" },
];

/**
 * Takes a plain-text paragraph and returns a React fragment where known
 * link targets (email addresses, external domains) are wrapped in <a>
 * tags. All other text remains as plain text nodes.
 */
export function renderParagraphWithLinks(text: string): React.ReactNode {
  /* Build a regex that matches any of the known link targets. */
  const pattern = new RegExp(
    `(${LINK_TARGETS.map((lt) => lt.text.replace(/\./g, "\\.")).join("|")})`,
    "g"
  );

  const parts = text.split(pattern);

  return parts.map((part, i) => {
    const target = LINK_TARGETS.find((lt) => lt.text === part);
    if (target) {
      return (
        <a
          key={i}
          href={target.href}
          className="text-brand hover:text-brand-hover transition-colors"
          {...(target.href.startsWith("http")
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {})}
        >
          {part}
        </a>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}
