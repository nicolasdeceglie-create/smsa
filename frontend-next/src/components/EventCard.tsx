import type { CSSProperties } from "react";
import { fmtTime } from "@/lib/dates";
import { impactVerdict, LEVEL_LABEL, quadrantOfMeeting, toneOf } from "@/lib/scores";
import type { Meeting } from "@/lib/types";
import styles from "./EventCard.module.css";

interface Props {
    meeting: Meeting;
    style: CSSProperties;
    selected: boolean;
    flashing: boolean;
    onOpen: () => void;
}

/*
 * Il blocco prepara tre versioni dei voti (lunga, corta, a pallini) e il CSS,
 * con le container query, mostra quella che entra intera nello spazio del blocco.
 * Il testo completo resta sempre nel tooltip e nel riquadro di dettaglio.
 */
export function EventCard({ meeting: m, style, selected, flashing, onOpen }: Props) {
    const quadrant = quadrantOfMeeting(m);
    const pending = m.myResponse === "needsAction";
    const stripe = quadrant ? `var(--q-${quadrant})` : m.readonly ? "#7c3aed" : "var(--blue)";
    const rated = m.utilita !== null && m.effort !== null;
    const verdict = m.impact !== null ? impactVerdict(m.impact) : null;
    const extra = pending ? " · da confermare" : m.recurring ? " · ricorrente" : "";
    const time = `${fmtTime(m.start)} – ${fmtTime(m.end)}${extra}`;

    const u = rated ? { tone: toneOf("utilita", m.utilita), text: LEVEL_LABEL.utilita[m.utilita!] } : null;
    const e = rated ? { tone: toneOf("effort", m.effort), text: LEVEL_LABEL.effort[m.effort!] } : null;
    const scoreLine = u && e ? `Utilità ${u.text} · Effort ${e.text}` : verdict ? `Impact ${m.impact}/10 · ${verdict.short}` : "";
    const tooltip = [m.title, time, scoreLine].filter(Boolean).join("\n");

    const className = [styles.event, pending && styles.pending, selected && styles.selected, flashing && styles.flashing]
        .filter(Boolean)
        .join(" ");

    return (
        <button
            className={className}
            style={{ ...style, "--stripe": stripe } as CSSProperties}
            onClick={onOpen}
            title={tooltip}
            aria-label={`${m.title}, ${fmtTime(m.start)}`}
        >
            <span className={styles.body}>
                <span className={styles.title}>
                    {m.readonly && (
                        <svg className={styles.lock} viewBox="0 0 24 24" aria-label="Sola lettura">
                            <rect x="5" y="11" width="14" height="10" rx="2" />
                            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                        </svg>
                    )}
                    {m.title}
                </span>

                {u && e && (
                    <>
                        <span className={styles.scores} data-size="long">
                            <span className={`${styles.chip} ${styles[u.tone]}`}>Utilità · {u.text}</span>
                            <span className={`${styles.chip} ${styles[e.tone]}`}>Effort · {e.text}</span>
                        </span>
                        <span className={styles.scores} data-size="short">
                            <span className={`${styles.chip} ${styles[u.tone]}`}>U {u.text}</span>
                            <span className={`${styles.chip} ${styles[e.tone]}`}>E {e.text}</span>
                        </span>
                    </>
                )}
                {!rated && verdict && (
                    <>
                        <span className={styles.scores} data-size="long">
                            <span className={`${styles.chip} ${styles[verdict.tone]}`}>
                                Impact {m.impact}/10 · {verdict.short}
                            </span>
                        </span>
                        <span className={styles.scores} data-size="short">
                            <span className={`${styles.chip} ${styles[verdict.tone]}`}>Impact {m.impact}</span>
                        </span>
                    </>
                )}

                {(rated || verdict) && (
                    <span className={styles.dots} data-size="dots" aria-hidden="true">
                        {u && e ? (
                            <>
                                <span className={styles.dot} data-tone={u.tone} />
                                <span className={styles.dot} data-tone={e.tone} />
                            </>
                        ) : (
                            <span className={styles.mini} data-tone={verdict!.tone}>
                                {m.impact}
                            </span>
                        )}
                    </span>
                )}

                <span className={styles.time}>{time}</span>
            </span>
            {flashing && <span className={styles.flashBadge}>Modificato da Claude</span>}
        </button>
    );
}
