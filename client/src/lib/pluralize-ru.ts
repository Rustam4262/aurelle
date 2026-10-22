/**
 * Russian noun pluralization after a count: 1 отзыв, 2-4 отзыва, 0/5-20/25-30… отзывов.
 * The "11-14 always many" exception is why this can't be done with a simple
 * `count % 10` switch — e.g. 11 and 21 both end in "1" but take different forms.
 */
export function pluralizeRu(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function reviewsWordRu(count: number): string {
  return pluralizeRu(count, "отзыв", "отзыва", "отзывов");
}
