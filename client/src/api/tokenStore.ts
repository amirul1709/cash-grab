let expiresAt: number | null = null;

export function setExpiry(ts: number | null): void {
  expiresAt = ts;
}

export function clearExpiry(): void {
  expiresAt = null;
}

export function isTokenExpiring(): boolean {
  if (expiresAt === null) return false; // no active session — don't proactively refresh
  return Date.now() > expiresAt - 15_000; // 15s proactive buffer
}
