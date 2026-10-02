export function formatDate(
  date,
  options = {
    year: "numeric",
    month: "short",
    day: "numeric",
  },
) {
  return new Intl.DateTimeFormat("en-US", options).format(new Date(date));
}

export function isValidDate(value) {
  const date = new Date(value);

  return !Number.isNaN(date.getTime());
}
