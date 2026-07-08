/**
 * ProductCard — the shared product tile used by category and search grids.
 *
 * Server component (no client JS). The card follows the "Price Ledger"
 * layout: image pane on white, product identity in the middle, and a
 * dedicated price row at the bottom separated by a hairline rule, so
 * the price is the loudest element and every card in a grid row aligns
 * its price on the same baseline.
 *
 * All user-facing strings are passed in pre-translated by the parent
 * page (category and search use different message namespaces), keeping
 * this component free of i18n hooks and rewording risks.
 */

import Image from "next/image";
import { Link } from "@/i18n/navigation";

type ProductCardProps = {
  /** Locale-relative product URL (e.g. /product/slug-p123). */
  href: string;
  /** Decoded product title. */
  title: string;
  /** Brand name, if any. */
  brand: string | null;
  /** Product image URL, if any. */
  imageUrl: string | null;
  /** Fully formatted price line (e.g. "from €199.99"), null when unknown. */
  priceText: string | null;
  /** Secondary line under the price (store count or unavailable label). */
  metaText: string | null;
  /** Formatted savings chip text (e.g. "−€25"), null to hide the chip. */
  savingsText: string | null;
  /** Label shown in the image pane when there is no image. */
  noImageText: string;
  /** When true the card renders demoted (no buyable offer right now). */
  unavailable: boolean;
};

export function ProductCard({
  href,
  title,
  brand,
  imageUrl,
  priceText,
  metaText,
  savingsText,
  noImageText,
  unavailable,
}: ProductCardProps) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface
                 transition-all duration-150 hover:border-brand hover:shadow-md"
    >
      {/* Image pane: white backdrop with a hairline rule below, subtle
          zoom on hover. Image is demoted to reduced opacity when the
          product has no buyable offer. */}
      <div className="relative flex aspect-square items-center justify-center overflow-hidden border-b border-line bg-surface">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={`object-contain p-3 transition-transform duration-150 group-hover:scale-[1.03]${
              unavailable ? " opacity-50" : ""
            }`}
          />
        ) : (
          <span className="text-xs text-faint">{noImageText}</span>
        )}

        {/* Savings chip: amber, reserved exclusively for real spreads. */}
        {savingsText && (
          <span className="absolute top-2 left-2 rounded-sm bg-save px-1.5 py-0.5 text-xs font-semibold tabular-nums text-white">
            {savingsText}
          </span>
        )}
      </div>

      {/* Identity block: brand eyebrow + two-line title. */}
      <div className="flex grow flex-col gap-1 px-3 pt-2.5 pb-3">
        {brand && (
          <span className="text-[0.6875rem] uppercase tracking-[0.08em] text-faint">
            {brand}
          </span>
        )}
        <span className="text-sm font-medium leading-snug text-ink line-clamp-2">
          {title}
        </span>
      </div>

      {/* Price row: the ledger rule. Hairline above, price set in the
          heading face with tabular figures; muted meta line underneath.
          mt-auto on the identity block's sibling keeps this row pinned
          to the bottom so prices align across the grid row. */}
      <div className="mt-auto border-t border-line px-3 py-2.5">
        {priceText ? (
          <span
            className={`price-figure block text-lg font-extrabold sm:text-xl ${
              unavailable ? "text-faint" : "text-ink"
            }`}
          >
            {priceText}
          </span>
        ) : (
          <span className="text-xs text-faint">–</span>
        )}
        {metaText && (
          <span
            className={`mt-0.5 block text-xs ${unavailable ? "text-faint" : "text-mute"}`}
          >
            {metaText}
          </span>
        )}
      </div>
    </Link>
  );
}
