/** Monday of the week containing `date` as YYYY-MM-DD (local). */
export function mondayOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getDay() || 7; // Sun=0 → 7
  d.setDate(d.getDate() - (day - 1));
  d.setHours(0, 0, 0, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Last N ISO Mondays including the current week, oldest → newest. */
export function recentMondays(weeks = 4): string[] {
  const now = new Date();
  const start = new Date(mondayOfWeek(now));
  const out: string[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(start);
    d.setDate(start.getDate() - i * 7);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }
  return out;
}
