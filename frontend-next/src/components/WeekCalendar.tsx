"use client";

import type { CSSProperties, ReactNode } from "react";
import { addDays, dayIndex, fmtTime, hours, sameDay } from "@/lib/dates";
import type { Meeting } from "@/lib/types";
import { EventCard } from "./EventCard";
import styles from "./WeekCalendar.module.css";

const DAY_NAMES = ["LUN", "MAR", "MER", "GIO", "VEN", "SAB", "DOM"];

interface Props {
    weekStart: Date;
    meetings: Meeting[];
    now: Date;
    selectedId: string | null;
    flashIds: Set<string>;
    onSelect: (id: string) => void;
    renderPopover: (m: Meeting, placement: CSSProperties) => ReactNode;
}

/** Fascia oraria visibile: almeno 9-18, allargata se ci sono eventi prima o dopo */
function hourRange(list: Meeting[]): [number, number] {
    let from = 9;
    let to = 18;
    for (const m of list) {
        from = Math.min(from, Math.floor(hours(m.start)));
        to = Math.max(to, Math.ceil(hours(m.end) || 24));
    }
    return [Math.max(0, from), Math.min(24, to)];
}

/** Eventi sovrapposti nello stesso giorno: affiancati in colonne */
function lanes(list: Meeting[]): Map<string, { lane: number; of: number }> {
    const result = new Map<string, { lane: number; of: number }>();
    const sorted = [...list].sort((a, b) => a.start.getTime() - b.start.getTime());
    let group: Meeting[] = [];
    let groupEnd = 0;
    const close = () => {
        const ends: number[] = [];
        const assigned = group.map((m) => {
            let lane = ends.findIndex((end) => end <= m.start.getTime());
            if (lane === -1) lane = ends.length;
            ends[lane] = m.end.getTime();
            return { m, lane };
        });
        assigned.forEach(({ m, lane }) => result.set(m.id, { lane, of: ends.length }));
    };
    for (const m of sorted) {
        if (group.length && m.start.getTime() >= groupEnd) {
            close();
            group = [];
        }
        group.push(m);
        groupEnd = Math.max(groupEnd, m.end.getTime());
    }
    if (group.length) close();
    return result;
}

export function WeekCalendar({ weekStart, meetings, now, selectedId, flashIds, onSelect, renderPopover }: Props) {
    const week = meetings.filter((m) => {
        const d = dayIndex(weekStart, m.start);
        return d >= 0 && d < 7;
    });
    const [from, to] = hourRange(week);
    const rows = (to - from) * 4;
    const rowOf = (d: Date) => Math.min(rows, Math.max(0, Math.round((hours(d) - from) * 4))) + 1;
    const todayIdx = dayIndex(weekStart, now);
    const showNow = todayIdx >= 0 && todayIdx < 7 && hours(now) >= from && hours(now) <= to;

    const laneInfo = new Map<string, { lane: number; of: number }>();
    for (let d = 0; d < 7; d++) {
        lanes(week.filter((m) => dayIndex(weekStart, m.start) === d)).forEach((v, k) => laneInfo.set(k, v));
    }

    const selected = week.find((m) => m.id === selectedId);
    let popover: ReactNode = null;
    if (selected) {
        const d = dayIndex(weekStart, selected.start);
        const startRow = rowOf(selected.start);
        const lateInDay = startRow > rows / 2;
        popover = renderPopover(selected, {
            // lun-mer: a destra dell'evento; da giovedì: a sinistra (il weekend è stretto)
            gridColumn: d <= 2 ? `${d + 3} / span 3` : `${d - 1} / span 3`,
            gridRow: lateInDay ? "1 / -1" : `${startRow} / -1`,
            alignSelf: lateInDay ? "end" : "start",
        });
    }

    return (
        <section className={styles.calendar} aria-label="Calendario settimanale">
            <div className={styles.legend}>
                <span>
                    <i style={{ background: "var(--blue)" }} />
                    Futuro
                </span>
                <span>
                    <i style={{ background: "var(--q-keep)" }} />
                    Da tenere
                </span>
                <span>
                    <i style={{ background: "var(--q-optimize)" }} />
                    Da ottimizzare
                </span>
                <span>
                    <i style={{ background: "var(--q-shorten)" }} />
                    Da accorciare
                </span>
                <span>
                    <i style={{ background: "var(--q-drop)" }} />
                    Da eliminare
                </span>
                <span>
                    <i className={styles.dashed} />
                    Da confermare
                </span>
                <span className={styles.legendNote}>U = utilità · E = effort</span>
            </div>

            <div className={styles.scroller}>
                <div className={styles.days}>
                    <span />
                    {DAY_NAMES.map((name, i) => {
                        const date = addDays(weekStart, i);
                        const isToday = sameDay(date, now);
                        return (
                            <div key={name} className={`${styles.day} ${isToday ? styles.isToday : ""}`}>
                                <span className={styles.dayName}>{name}</span>
                                <span className={styles.dayNum}>{date.getDate()}</span>
                            </div>
                        );
                    })}
                </div>

                <div className={styles.grid} style={{ "--rows": rows, "--hours": to - from } as CSSProperties}>
                    {DAY_NAMES.map((name, i) => (
                        <div
                            key={name}
                            className={styles.column}
                            style={{
                                gridColumn: i + 2,
                                background: i === todayIdx ? "var(--today)" : i > 4 ? "var(--weekend)" : undefined,
                            }}
                        />
                    ))}
                    {Array.from({ length: to - from - 1 }, (_, i) => (
                        <span key={i} className={styles.hour} style={{ gridRow: `${(i + 1) * 4 + 1} / span 4` }}>
                            {from + i + 1}:00
                        </span>
                    ))}
                    {showNow && (
                        <div
                            className={styles.now}
                            style={{ gridColumn: todayIdx + 2, gridRow: rowOf(now) }}
                            aria-label={`Ora attuale ${fmtTime(now)}`}
                        />
                    )}
                    {week.map((m) => {
                        const lane = laneInfo.get(m.id) ?? { lane: 0, of: 1 };
                        return (
                            <EventCard
                                key={m.id}
                                meeting={m}
                                selected={m.id === selectedId}
                                flashing={flashIds.has(m.id)}
                                onOpen={() => onSelect(m.id)}
                                style={{
                                    gridColumn: dayIndex(weekStart, m.start) + 2,
                                    gridRow: `${rowOf(m.start)} / ${Math.max(rowOf(m.end), rowOf(m.start) + 1)}`,
                                    marginLeft: `calc(${(lane.lane / lane.of) * 100}% + 3px)`,
                                    width: `calc(${100 / lane.of}% - 7px)`,
                                }}
                            />
                        );
                    })}
                    {popover}
                </div>
            </div>
        </section>
    );
}
