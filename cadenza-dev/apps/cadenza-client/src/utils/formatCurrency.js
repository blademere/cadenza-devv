export default function formatCurrency(value, currency = "PHP") { return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value); }
