export function formatWhen(iso: string, now = Date.now()): string {
  const delta = now - new Date(iso).getTime();
  if (Number.isNaN(delta)) return "";
  const minutes = Math.round(delta / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 14) return `${days} days ago`;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function practiceDay(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function shiftDay(key: string, delta: number): string {
  const [year, month, day] = key.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + delta);
  const nextMonth = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const nextDay = String(utc.getUTCDate()).padStart(2, "0");
  return `${utc.getUTCFullYear()}-${nextMonth}-${nextDay}`;
}

export function currentStreak(dates: string[], now?: Date): number {
  if (dates.length === 0) return 0;
  const clock = now ?? new Date();
  const days = new Set(dates.map((iso) => practiceDay(iso)));
  let key = practiceDay(clock.toISOString());
  if (!days.has(key)) key = shiftDay(key, -1);
  if (!days.has(key)) return 0;
  let streak = 0;
  while (days.has(key)) {
    streak += 1;
    key = shiftDay(key, -1);
  }
  return streak;
}
