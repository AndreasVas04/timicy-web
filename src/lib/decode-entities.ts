/**
 * Lightweight HTML entity decoder that works in every JS runtime
 * (Node, Edge, Workers — no DOM required).
 *
 * Handles:
 *  - Common named entities (&amp; &lt; &gt; &quot; &#39; &apos; &nbsp;)
 *  - Decimal numeric entities  (&#123;)
 *  - Hexadecimal numeric entities (&#x1F4A9;)
 *
 * Unknown named entities are left as-is so the function never corrupts
 * markup it doesn't understand.
 *
 * IMPORTANT: &amp; is decoded LAST among named entities. If we decoded it
 * first, an input like "&amp;lt;" would become "&lt;" → "<" (double-decode).
 */

/** Named entities decoded BEFORE &amp; to prevent double-decoding. */
const NAMED: [RegExp, string][] = [
  [/&quot;/g, '"'],
  [/&lt;/g, "<"],
  [/&gt;/g, ">"],
  [/&#39;/g, "'"],
  [/&apos;/g, "'"],
  [/&nbsp;/g, "\u00A0"],
];

/**
 * Decode common HTML entities in a string without relying on the DOM.
 *
 * @param input - The string potentially containing HTML entities.
 * @returns The decoded string, or "" if input is null/undefined/empty.
 */
export function decodeEntities(input: string | null | undefined): string {
  if (!input) return "";

  let result = input;

  // 1. Decode numeric entities first (decimal &#NNN; and hex &#xHHH;).
  //    Using String.fromCodePoint so astral-plane characters work correctly.
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => {
    try {
      return String.fromCodePoint(parseInt(hex, 16));
    } catch {
      // Invalid code point — leave the entity as-is.
      return _;
    }
  });

  result = result.replace(/&#(\d+);/g, (_, dec: string) => {
    try {
      return String.fromCodePoint(parseInt(dec, 10));
    } catch {
      return _;
    }
  });

  // 2. Decode named entities (all except &amp;).
  for (const [pattern, replacement] of NAMED) {
    result = result.replace(pattern, replacement);
  }

  // 3. Decode &amp; LAST to avoid double-decoding (see module docstring).
  result = result.replace(/&amp;/g, "&");

  return result;
}
