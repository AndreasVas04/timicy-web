/**
 * Category definitions — single source of truth for all category slugs
 * and their localized display labels.
 *
 * Category slugs match the `products.category` column in the database exactly.
 * Labels are defined explicitly rather than humanized at runtime so that
 * translations are accurate and natural (e.g. "Πλυντήρια Ρούχων" instead of
 * a naive "Washing Machines" -> "Πλύσιμο Μηχανές" transliteration).
 *
 * The ordered array reflects the canonical display order (by product count,
 * largest categories first). This order is used for navigation and landing
 * page category grids.
 */

export type CategorySlug =
  | "headphones"
  | "speakers"
  | "ovens"
  | "laptops"
  | "smartwatches"
  | "smartphones"
  | "refrigerators"
  | "tvs"
  | "vacuums"
  | "smart_home"
  | "monitors"
  | "coffee_machines"
  | "air_conditioners"
  | "tablets"
  | "cameras"
  | "washing_machines"
  | "desktops"
  | "dishwashers"
  | "air_fryers"
  | "dryers"
  | "consoles";

/** Canonical display order — largest categories first. */
export const CATEGORY_SLUGS: readonly CategorySlug[] = [
  "headphones",
  "speakers",
  "ovens",
  "laptops",
  "smartwatches",
  "smartphones",
  "refrigerators",
  "tvs",
  "vacuums",
  "smart_home",
  "monitors",
  "coffee_machines",
  "air_conditioners",
  "tablets",
  "cameras",
  "washing_machines",
  "desktops",
  "dishwashers",
  "air_fryers",
  "dryers",
  "consoles",
] as const;

/**
 * Localized labels for each category, keyed by slug then locale.
 * Labels are natural retail wording in each language.
 */
const CATEGORY_LABELS: Record<CategorySlug, Record<string, string>> = {
  headphones: { en: "Headphones", el: "Ακουστικά" },
  speakers: { en: "Speakers", el: "Ηχεία" },
  ovens: { en: "Ovens", el: "Φούρνοι" },
  laptops: { en: "Laptops", el: "Laptops" },
  smartwatches: { en: "Smartwatches", el: "Smartwatches" },
  smartphones: { en: "Smartphones", el: "Smartphones" },
  refrigerators: { en: "Refrigerators", el: "Ψυγεία" },
  tvs: { en: "TVs", el: "Τηλεοράσεις" },
  vacuums: { en: "Vacuum Cleaners", el: "Σκούπες" },
  smart_home: { en: "Smart Home", el: "Έξυπνο Σπίτι" },
  monitors: { en: "Monitors", el: "Οθόνες" },
  coffee_machines: { en: "Coffee Machines", el: "Καφετιέρες" },
  air_conditioners: { en: "Air Conditioners", el: "Κλιματιστικά" },
  tablets: { en: "Tablets", el: "Tablets" },
  cameras: { en: "Cameras", el: "Κάμερες" },
  washing_machines: { en: "Washing Machines", el: "Πλυντήρια Ρούχων" },
  desktops: { en: "Desktop PCs", el: "Σταθεροί Υπολογιστές" },
  dishwashers: { en: "Dishwashers", el: "Πλυντήρια Πιάτων" },
  air_fryers: { en: "Air Fryers", el: "Φριτέζες Αέρος" },
  dryers: { en: "Dryers", el: "Στεγνωτήρια" },
  consoles: { en: "Gaming Consoles", el: "Κονσόλες" },
};

/** Check whether a string is a valid category slug. */
export function isValidCategory(slug: string): slug is CategorySlug {
  return CATEGORY_SLUGS.includes(slug as CategorySlug);
}

/**
 * Get the localized display label for a category.
 * Falls back to the English label if the requested locale isn't defined.
 */
export function getCategoryLabel(slug: CategorySlug, locale: string): string {
  const labels = CATEGORY_LABELS[slug];
  return labels[locale] ?? labels.en;
}
