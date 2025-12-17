/**
 * Currency formatting utilities for Uzbekistan market
 * All prices are in UZS (Uzbekistan Som)
 */

/**
 * Format price in UZS (Uzbekistan Som)
 * @param amount - Price in som (whole numbers, no decimals)
 * @param locale - Locale for formatting (default: uz-UZ)
 * @returns Formatted price string with "сум" suffix
 *
 * Examples:
 * formatPrice(150000) => "150 000 сум"
 * formatPrice(1500000) => "1 500 000 сум"
 */
export function formatPrice(amount: number, locale: string = 'ru-UZ'): string {
  // Use Russian locale for Uzbekistan (better number formatting support)
  const formatted = new Intl.NumberFormat(locale, {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)

  return `${formatted} сум`
}

/**
 * Format price in compact form (K for thousands)
 * @param amount - Price in som
 * @returns Compact formatted price
 *
 * Examples:
 * formatPriceCompact(150000) => "150K сум"
 * formatPriceCompact(1500000) => "1.5M сум"
 */
export function formatPriceCompact(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M сум`
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)}K сум`
  }
  return `${amount} сум`
}

/**
 * Currency code for Uzbekistan
 */
export const CURRENCY_CODE = 'UZS'

/**
 * Currency symbol for Uzbekistan Som
 */
export const CURRENCY_SYMBOL = 'сум'
