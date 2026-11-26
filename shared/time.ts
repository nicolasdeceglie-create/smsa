// Utility per date ISO con fuso orario esplicito (condivisa da db e backend).

export const DEFAULT_TZ = "Europe/Rome";

function zonedParts(d: Date, tz: string): Record<string, string> {
  const parts: Record<string, string> = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
      timeZoneName: "longOffset",
    }).formatToParts(d).map((p) => [p.type, p.value])
  );
  const offset = parts.timeZoneName === "GMT" ? "+00:00" : parts.timeZoneName.replace("GMT", "");
  return { ...parts, hour: parts.hour === "24" ? "00" : parts.hour, offset };
}

/** Es. toZonedIso(new Date(), "Europe/Rome") → "2026-11-27T10:00:00+01:00" */
export function toZonedIso(d: Date, tz: string = DEFAULT_TZ): string {
  const p = zonedParts(d, tz);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}${p.offset}`;
}

/** Offset del fuso in un certo giorno, es. "+01:00" */
export function offsetOf(d: Date, tz: string = DEFAULT_TZ): string {
  return zonedParts(d, tz).offset;
}

/** Data (YYYY-MM-DD) + ora locale (HH:mm) nel fuso → Date */
export function zonedDate(day: string, time: string, tz: string = DEFAULT_TZ): Date {
  const guess = new Date(`${day}T${time}:00Z`);
  return new Date(`${day}T${time}:00${offsetOf(guess, tz)}`);
}

/** "Oggi" nel fuso, formato YYYY-MM-DD */
export function todayIn(tz: string = DEFAULT_TZ): string {
  return toZonedIso(new Date(), tz).slice(0, 10);
}
