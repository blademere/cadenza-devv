export function formatCurrency(value, currency = "PHP", locale = "en-US") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(value);
}

export function formatNumber(value, locale = "en-US") {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatPercent(value, locale = "en-US") {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 2,
  }).format(value);
}

