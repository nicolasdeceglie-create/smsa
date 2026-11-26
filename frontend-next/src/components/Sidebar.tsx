import { fmtDayShort, fmtTime } from "@/lib/dates";
import { impactVerdict, QUADRANT_LABEL } from "@/lib/scores";
import type { ActivityItem, Meeting, Suggestion } from "@/lib/types";
import styles from "./Sidebar.module.css";

interface Props {
    activity: ActivityItem[];
    upcoming: Meeting[];
    suggestions: Suggestion[];
    selectedId: string | null;
    canSimulate: boolean;
    onSimulate: () => void;
    onOpen: (m: Meeting) => void;
}

export function Sidebar({ activity, upcoming, suggestions, selectedId, canSimulate, onSimulate, onOpen }: Props) {
    return (
        <aside className={styles.side}>
            <section className={styles.activity} aria-label="Attività di Claude">
                <div className={styles.activityHead}>
                    <h2>Attività di Claude</h2>
                    {canSimulate ? (
                        <button onClick={onSimulate}>Simula una modifica</button>
                    ) : (
                        <span className={styles.listening}>
                            <span />
                            in ascolto
                        </span>
                    )}
                </div>
                {activity.length === 0 ? (
                    <p className={styles.empty}>Quando Claude crea, sposta o cancella un meeting lo vedi qui.</p>
                ) : (
                    <ol>
                        {activity.slice(0, 2).map((a) => (
                            <li key={a.id}>
                                <span className={styles.time}>{fmtTime(a.at)}</span>
                                <span>
                                    Ha {a.verb} <strong>{a.meetingTitle}</strong> {a.detail}
                                </span>
                            </li>
                        ))}
                    </ol>
                )}
            </section>

            <section className={`${styles.card} ${styles.grow}`} aria-label="Impact dei prossimi meeting">
                <div className={styles.cardHead}>
                    <h2>Vale la pena andarci?</h2>
                    <span>Impact da 0 a 10 dei prossimi meeting, stimato dall&apos;IA</span>
                </div>
                {/* va a capo in una colonna nascosta: si vedono solo le righe che entrano intere */}
                <div className={styles.impactList}>
                    {upcoming.map((m) => {
                        const v = impactVerdict(m.impact ?? 0);
                        return (
                            <button
                                key={m.id}
                                className={`${styles.impactRow} ${selectedId === m.id ? styles.current : ""}`}
                                onClick={() => onOpen(m)}
                            >
                                <span className={`${styles.badge} ${styles[v.tone]}`}>
                                    <strong>{m.impact}</strong>
                                    <small>/10</small>
                                </span>
                                <span className={styles.impactText}>
                                    <span className={styles.impactTitle}>{m.title}</span>
                                    <span className={styles.impactMeta}>
                                        {fmtDayShort(m.start)} · {fmtTime(m.start)} · <strong className={styles[`${v.tone}Text`]}>{v.short}</strong>
                                    </span>
                                </span>
                            </button>
                        );
                    })}
                    {upcoming.length === 0 && <p className={styles.empty}>Nessun meeting futuro da valutare.</p>}
                </div>
                <div className={styles.scale}>
                    <span>
                        <strong className={styles.goodText}>7–10</strong> vale la pena
                    </span>
                    <span>
                        <strong className={styles.midText}>4–6</strong> valuta se delegarlo
                    </span>
                    <span>
                        <strong className={styles.badText}>0–3</strong> puoi saltarlo
                    </span>
                </div>
            </section>

            <section className={styles.card} aria-label="Suggerimenti">
                <div className={styles.cardHead}>
                    <h2>Cosa ti suggerisce Claude</h2>
                </div>
                {suggestions.map((s) => (
                    <div key={s.title} className={styles.tip}>
                        <div className={styles.tipHead}>
                            <strong>{s.title}</strong>
                            <span className={`${styles.qChip} ${styles[`q_${s.quadrant}`]}`}>{QUADRANT_LABEL[s.quadrant]}</span>
                        </div>
                        <span className={styles.tipText}>{s.text}</span>
                    </div>
                ))}
                {suggestions.length === 0 && <p className={styles.empty}>Servono meeting già valutati.</p>}
            </section>
        </aside>
    );
}
