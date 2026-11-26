import type { CSSProperties } from "react";
import { fmtTime } from "@/lib/dates";
import { impactVerdict, LEVEL_LABEL, quadrantOfMeeting, toneOf } from "@/lib/scores";
import type { Meeting } from "@/lib/types";
import styles from "./WeekCalendar.module.css";

interface Props {
    meeting: Meeting;
    style: CSSProperties;
    selected: boolean;
    flashing: boolean;
    onOpen: () => void;
}

export function EventCard({ meeting: m, style, selected, flashing, onOpen }: Props) {
    const quadrant = quadrantOfMeeting(m);
    const pending = m.myResponse === "needsAction";
    const stripe = quadrant ? `var(--q-${quadrant})` : m.readonly ? "#7c3aed" : "var(--blue)";
    const rated = m.utilita !== null && m.effort !== null;
    const extra = pending ? " · da confermare" : m.recurring ? " · ricorrente" : "";
    // sotto i 60 minuti le etichette lunghe non entrano: versione corta "U · alta"
    const compact = m.end.getTime() - m.start.getTime() < 60 * 60_000;
    const uLabel = compact ? "U" : "Utilità";
    const eLabel = compact ? "E" : "Effort";

    const className = [styles.event, compact && styles.compact, pending && styles.pending, selected && styles.selected, flashing && styles.flashing]
        .filter(Boolean)
        .join(" ");

    return (
        <button
            className={className}
            style={{ ...style, "--stripe": stripe } as CSSProperties}
            onClick={onOpen}
            aria-label={`${m.title}, ${fmtTime(m.start)}`}
        >
            <span className={styles.eventBody}>
                <span className={styles.eventTitle}>
                    {m.readonly && (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-label="Sola lettura">
                            <rect x="5" y="11" width="14" height="10" rx="2" />
                            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                        </svg>
                    )}
                    {m.title}
                </span>
                <span className={styles.chips}>
                    {rated && (
                        <>
                            <span className={`${styles.chip} ${styles[toneOf("utilita", m.utilita)]}`} title={`Utilità ${LEVEL_LABEL.utilita[m.utilita!]}`}>
                                {uLabel} · {LEVEL_LABEL.utilita[m.utilita!]}
                            </span>
                            <span className={`${styles.chip} ${styles[toneOf("effort", m.effort)]}`} title={`Effort ${LEVEL_LABEL.effort[m.effort!]}`}>
                                {eLabel} · {LEVEL_LABEL.effort[m.effort!]}
                            </span>
                        </>
                    )}
                    {!rated && m.impact !== null && (
                        <span className={`${styles.chip} ${styles[impactVerdict(m.impact).tone]}`}>
                            Impact {m.impact}/10{compact ? "" : ` · ${impactVerdict(m.impact).short}`}
                        </span>
                    )}
                </span>
                <span className={styles.eventTime}>
                    {fmtTime(m.start)} – {fmtTime(m.end)}
                    {extra}
                </span>
            </span>
            {flashing && <span className={styles.flashBadge}>Modificato da Claude</span>}
        </button>
    );
}
