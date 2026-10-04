export default function formatDate(value, options = {}) { return new Intl.DateTimeFormat(undefined, options).format(new Date(value)); }
