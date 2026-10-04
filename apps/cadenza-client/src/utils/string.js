export function capitalize(value = "") {
  if (!value) return "";

  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function truncate(value = "", length = 100) {
  if (value.length <= length) {
    return value;
  }

  return `${value.slice(0, length)}...`;
}

export function slugify(value = "") {
  return value
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
