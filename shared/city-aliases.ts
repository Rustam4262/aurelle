/**
 * Known spelling variants for the cities featured as quick-filter chips.
 *
 * salons.city / masters.city is a free-text varchar (no jsonb/locale split),
 * written by whichever owner created the listing — in practice a mix of
 * Cyrillic ("Ташкент") and Latin ("Tashkent") spellings in the same table.
 * A plain substring match against one hardcoded spelling (what the homepage
 * city chips used to link to) silently returns zero/partial results for
 * listings stored in the other script. Matching against every known alias
 * instead of a single literal fixes that without renaming any stored data.
 */
export const CITY_ALIASES: Record<string, string[]> = {
  tashkent: ["tashkent", "ташкент", "toshkent"],
  samarkand: ["samarkand", "самарканд", "samarqand"],
  bukhara: ["bukhara", "бухара", "buxoro"],
};

export const CITY_KEYS = Object.keys(CITY_ALIASES);

/** True if `cityValue` (whatever script it's stored in) names the city behind `canonicalKey`. */
export function cityMatchesKey(cityValue: string, canonicalKey: string): boolean {
  const aliases = CITY_ALIASES[canonicalKey.toLowerCase()];
  const value = cityValue.toLowerCase();
  if (!aliases) return value.includes(canonicalKey.toLowerCase());
  return aliases.some((alias) => value.includes(alias));
}
