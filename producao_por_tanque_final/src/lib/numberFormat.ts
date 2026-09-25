export function safeToFixed(
  value: unknown,
  digits: number,
  fallback = '-',
): string {
  const normalized =
    typeof value === 'string' ? value.replace(',', '.') : value
  const numeric = Number(normalized)
  return Number.isFinite(numeric) ? numeric.toFixed(digits) : fallback
}
