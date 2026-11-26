import { fmtDayShort, fmtTime } from "./dates";
import type { ActivityItem, Meeting } from "./types";

/**
 * Confronta due letture del backend e descrive cosa è cambiato
 * (creato, spostato, rinominato, eliminato). `ignore` contiene gli eventi
 * eliminati dall'utente dalla UI, che non vanno attribuiti a Claude.
 */
export function diffMeetings(prev: Meeting[], next: Meeting[], ignore: Set<string>): ActivityItem[] {
    const before = new Map(prev.map((m) => [m.id, m]));
    const after = new Set(next.map((m) => m.id));
    const at = new Date();
    const item = (m: Meeting, verb: string, detail = ""): ActivityItem => ({
        id: `${m.id}-${verb}-${at.getTime()}`,
        meetingId: m.id,
        at,
        verb,
        meetingTitle: m.title,
        detail,
    });
    const when = (m: Meeting) => `${fmtDayShort(m.start)} alle ${fmtTime(m.start)}`;

    const items: ActivityItem[] = [];
    for (const m of next) {
        const old = before.get(m.id);
        if (!old) {
            items.push(item(m, "creato", `per ${when(m)}`));
        } else if (old.start.getTime() !== m.start.getTime() || old.end.getTime() !== m.end.getTime()) {
            items.push(item(m, "spostato", `a ${when(m)}`));
        } else if (old.title !== m.title) {
            items.push(item(m, "rinominato"));
        }
    }
    for (const m of prev) {
        if (!after.has(m.id) && !ignore.has(m.id)) items.push(item(m, "eliminato"));
    }
    return items;
}
