/**
 * Format a number as currency amount with thousands separators and fixed decimals.
 * Use for display only (e.g. "51,927.00"). Currency code/symbol is shown separately.
 */
export function formatAmount(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
