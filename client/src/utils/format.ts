export function formatDate(input: string | Date | null | undefined): string {
  if (!input) return '';
  // Parse the YYYY-MM-DD prefix directly to avoid UTC-to-local timezone shifts
  // (Postgres DATE columns arrive as midnight-UTC strings, which shift one day
  // for users in UTC-N timezones when converted via new Date()).
  const str = typeof input === 'string' ? input : input.toISOString();
  const datePart = str.slice(0, 10);
  const parts = datePart.split('-');
  if (parts.length !== 3) return '';
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}
