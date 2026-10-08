// Display helpers for DataPoint times.
// They read the numeric timestamp, which is always set, instead of splitting dateStr:
// dateStr keeps whatever the source file had (ISO "2026-07-12T09:00:00", "2026-07-12 09:00:00",
// or toLocaleString() for Excel), so splitting it on a space was unreliable.

const pad = (n: number) => String(n).padStart(2, '0');

/** "09:24:10" in local time, or null when the timestamp is missing or invalid. */
export const formatTime = (timestamp: number | null | undefined): string | null => {
  if (timestamp == null || isNaN(timestamp)) return null;
  const d = new Date(timestamp);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

/** "2026-07-12" in local time, or null when the timestamp is missing or invalid. */
export const formatDate = (timestamp: number | null | undefined): string | null => {
  if (timestamp == null || isNaN(timestamp)) return null;
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** "2026-07-12 09:24:10", or an empty string. */
export const formatDateTime = (timestamp: number | null | undefined): string => {
  const date = formatDate(timestamp);
  const time = formatTime(timestamp);
  return date && time ? `${date} ${time}` : '';
};
