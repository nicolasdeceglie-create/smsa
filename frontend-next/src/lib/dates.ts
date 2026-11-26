const DAY = 86_400_000;

export function startOfDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

/** Lunedì della settimana di d */
export function startOfWeek(d: Date): Date {
    const x = startOfDay(d);
    const offset = (x.getDay() + 6) % 7;
    x.setDate(x.getDate() - offset);
    return x;
}

export function addDays(d: Date, n: number): Date {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
}

export function sameDay(a: Date, b: Date): boolean {
    return startOfDay(a).getTime() === startOfDay(b).getTime();
}

/** 0 = lunedì ... 6 = domenica, rispetto all'inizio settimana */
export function dayIndex(weekStart: Date, d: Date): number {
    return Math.floor((startOfDay(d).getTime() - weekStart.getTime()) / DAY);
}

export function hours(d: Date): number {
    return d.getHours() + d.getMinutes() / 60;
}

const time = new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" });
const dayLong = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long" });
const dayShort = new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric" });
const monthYear = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" });

export const fmtTime = (d: Date) => time.format(d);
export const fmtDayShort = (d: Date) => dayShort.format(d);

export function fmtDayLong(d: Date): string {
    const s = dayLong.format(d);
    return s.charAt(0).toUpperCase() + s.slice(1);
}

export function fmtWeekRange(weekStart: Date): string {
    const end = addDays(weekStart, 6);
    if (weekStart.getMonth() === end.getMonth()) {
        return `${weekStart.getDate()} – ${end.getDate()} ${monthYear.format(end)}`;
    }
    const startMonth = new Intl.DateTimeFormat("it-IT", { month: "long" }).format(weekStart);
    return `${weekStart.getDate()} ${startMonth} – ${end.getDate()} ${monthYear.format(end)}`;
}

/** Per i campi <input type="date"> e <input type="time"> */
export const toDateInput = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const toTimeInput = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
