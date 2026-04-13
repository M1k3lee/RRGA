const timestampFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export function formatTimestamp(value?: string | null, fallback = "source unavailable") {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return `${timestampFormatter.format(parsed)} UTC`;
}

export function formatCount(value: number, noun: string, fallback?: string) {
  if (value <= 0 && fallback) {
    return fallback;
  }
  return `${value.toLocaleString("en-GB")} ${noun}${value === 1 ? "" : "s"}`;
}
