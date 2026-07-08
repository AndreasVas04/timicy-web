"use client";

/**
 * Compact sort dropdown for category pages.
 *
 * Renders a native <select> element styled with theme tokens, paired
 * with an uppercase label. On change, navigates to the URL for the
 * selected sort order (page is always reset to 1 on sort change).
 *
 * A native <select> is used instead of a segmented control because
 * the Greek sort labels (e.g. "Ακριβότερα πρώτα") overflow at narrow
 * viewports (375px). The native dropdown handles long text gracefully
 * on every platform and requires no scroll workarounds.
 */

import { useRouter } from "@/i18n/navigation";

/** Each option carries a pre-built href so the component stays
 *  decoupled from the URL-building logic in the category page. */
type SortOption = {
  value: string;
  label: string;
  href: string;
};

export function SortSelect({
  label,
  options,
  currentValue,
}: {
  /** Uppercase label displayed next to the dropdown (e.g. "ΤΑΞΙΝΟΜΗΣΗ"). */
  label: string;
  /** Available sort options with pre-built hrefs. */
  options: SortOption[];
  /** The currently active sort key. */
  currentValue: string;
}) {
  const router = useRouter();

  /** Navigate to the selected sort option's URL on change. */
  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const selected = options.find((o) => o.value === e.target.value);
    if (selected) {
      router.push(selected.href);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-faint whitespace-nowrap">
        {label}
      </span>
      <select
        value={currentValue}
        onChange={handleChange}
        className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-ink"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
