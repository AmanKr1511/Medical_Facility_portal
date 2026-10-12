/** Simulates network latency so loading states are visible during development. */
export const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

/** ISO date (YYYY-MM-DD) offset from today. */
export function isoDay(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
