// ============================================================
//  Ticket B8 — Slot liberi in una giornata lavorativa.
//  Considera gli eventi di TUTTI i calendari (anche iCloud).
// ============================================================
import type { FreeSlot } from "../../shared/types.ts";
import { toZonedIso, zonedDate } from "../../shared/time.ts";
import { config } from "./config.ts";
import { listEvents } from "./calendar.ts";

/** @param day YYYY-MM-DD  @param durationMin durata minima dello slot in minuti */
export async function findFreeSlots(day: string, durationMin: number): Promise<FreeSlot[]> {
  const tz = config.timezone;
  const dayStart = zonedDate(day, config.workday.start, tz);
  const dayEnd = zonedDate(day, config.workday.end, tz);

  const busy = (await listEvents(dayStart, dayEnd))
    .map((e) => ({ start: new Date(e.start), end: new Date(e.end) }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const slots: FreeSlot[] = [];
  let cursor = dayStart;
  // Non proporre slot già passati
  if (cursor < new Date()) cursor = new Date(Math.ceil(Date.now() / 900_000) * 900_000);

  for (const b of busy) {
    if (b.start.getTime() - cursor.getTime() >= durationMin * 60_000) {
      slots.push({ start: toZonedIso(cursor, tz), end: toZonedIso(b.start, tz) });
    }
    if (b.end > cursor) cursor = b.end;
  }
  if (dayEnd.getTime() - cursor.getTime() >= durationMin * 60_000) {
    slots.push({ start: toZonedIso(cursor, tz), end: toZonedIso(dayEnd, tz) });
  }
  return slots;
}
