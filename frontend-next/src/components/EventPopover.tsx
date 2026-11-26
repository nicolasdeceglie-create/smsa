"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { fmtDayLong, fmtTime, toDateInput, toTimeInput } from "@/lib/dates";
import { CALENDAR_OWNER } from "@/lib/mock";
import { impactVerdict, LEVEL_LABEL, LEVEL_STEPS, quadrantOfMeeting, toneOf, type Tone } from "@/lib/scores";
import type { Level, Meeting, MeetingPatch } from "@/lib/types";
import styles from "./EventPopover.module.css";

interface Props {
    meeting: Meeting;
    placement: CSSProperties;
    onClose: () => void;
    onDelete: () => Promise<void>;
    onConfirm: () => void;
    onSave: (patch: MeetingPatch) => Promise<void>;
}

const TONE_COLOR: Record<Tone, string> = { good: "var(--good)", mid: "var(--mid)", bad: "var(--bad)", none: "var(--mid)" };

function Steps({ count, on, color, width }: { count: number; on: number; color: string; width: number }) {
    return (
        <span className={styles.steps} aria-hidden="true">
            {Array.from({ length: count }, (_, i) => (
                <span key={i} style={{ width, background: i < on ? color : "#d6e0ee" }} />
            ))}
        </span>
    );
}

function LevelRow({ kind, level }: { kind: "utilita" | "effort"; level: Level }) {
    const color = TONE_COLOR[toneOf(kind, level)];
    return (
        <>
            <span className={styles.levelName}>{kind === "utilita" ? "Utilità" : "Effort"}</span>
            <span className={styles.levelValue}>
                <Steps count={3} on={LEVEL_STEPS[level]} color={color} width={44} />
                <strong style={{ color }}>{LEVEL_LABEL[kind][level]}</strong>
            </span>
        </>
    );
}

export function EventPopover({ meeting: m, placement, onClose, onDelete, onConfirm, onSave }: Props) {
    const [editing, setEditing] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const quadrant = quadrantOfMeeting(m);
    const rated = m.utilita !== null && m.effort !== null;
    const pending = m.myResponse === "needsAction";
    const others = m.attendees.filter((a) => a.email !== CALENDAR_OWNER);
    const accepted = others.filter((a) => a.status === "accepted").length;
    const square = quadrant ? `var(--q-${quadrant})` : "var(--blue)";
    const mailto = `mailto:${others.map((a) => a.email).join(",")}?subject=${encodeURIComponent(`Re: ${m.title}`)}`;

    const people =
        m.attendees.length === 0
            ? "Evento personale"
            : `${m.attendees.length} ${m.attendees.length === 1 ? "invitato" : "invitati"} · ` +
              (pending ? `${accepted} ${accepted === 1 ? "ha" : "hanno"} accettato, manca la tua risposta` : "tutti hanno accettato");

    async function run(action: () => Promise<void>) {
        setBusy(true);
        setError(null);
        try {
            await action();
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setBusy(false);
        }
    }

    function save(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const day = String(f.get("day"));
        const start = new Date(`${day}T${f.get("start")}`);
        const end = new Date(`${day}T${f.get("end")}`);
        if (end <= start) {
            setError("La fine deve essere dopo l'inizio");
            return;
        }
        run(async () => {
            await onSave({ title: String(f.get("title")), start: start.toISOString(), end: end.toISOString() });
            setEditing(false);
        });
    }

    return (
        <section className={styles.popover} style={placement} role="dialog" aria-label={`Dettaglio: ${m.title}`}>
            <div className={styles.box}>
                <div className={styles.toolbar}>
                    {!m.readonly && (
                        <button onClick={() => setEditing(true)} aria-label="Modifica evento" title="Modifica">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M4 20h4L19 9l-4-4L4 16z" />
                                <path d="m13.5 6.5 4 4" />
                            </svg>
                        </button>
                    )}
                    {others.length > 0 && (
                        <a href={mailto} aria-label="Contatta i partecipanti" title="Contatta i partecipanti">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <rect x="3" y="5" width="18" height="14" rx="2" />
                                <path d="m3 7 9 6 9-6" />
                            </svg>
                        </a>
                    )}
                    {!m.readonly && (
                        <button onClick={() => run(onDelete)} disabled={busy} aria-label="Elimina evento" title="Elimina">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
                            </svg>
                        </button>
                    )}
                    <button onClick={onClose} aria-label="Chiudi" title="Chiudi">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                            <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {editing ? (
                    <form className={styles.form} onSubmit={save}>
                        <label>
                            Titolo
                            <input name="title" defaultValue={m.title} required />
                        </label>
                        <label>
                            Giorno
                            <input name="day" type="date" defaultValue={toDateInput(m.start)} required />
                        </label>
                        <div className={styles.formRow}>
                            <label>
                                Inizio
                                <input name="start" type="time" defaultValue={toTimeInput(m.start)} required />
                            </label>
                            <label>
                                Fine
                                <input name="end" type="time" defaultValue={toTimeInput(m.end)} required />
                            </label>
                        </div>
                        <div className={styles.formActions}>
                            <button type="button" className={styles.secondary} onClick={() => setEditing(false)}>
                                Annulla
                            </button>
                            <button type="submit" className={styles.primary} disabled={busy}>
                                Salva
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className={styles.details}>
                        <span className={styles.square} style={{ background: square }} />
                        <div className={styles.heading}>
                            <h2>{m.title}</h2>
                            <span>
                                {fmtDayLong(m.start)} · {fmtTime(m.start)} – {fmtTime(m.end)}
                            </span>
                        </div>

                        {m.description && (
                            <>
                                <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M4 7h16M4 12h16M4 17h10" />
                                </svg>
                                <span className={styles.text}>{m.description}</span>
                            </>
                        )}

                        <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
                            <circle cx="9" cy="8" r="3.5" />
                            <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.5a3.5 3.5 0 0 1 0 7M21 20c0-2.6-1.7-4.9-4-5.7" />
                        </svg>
                        <div className={styles.stack}>
                            <span className={styles.text}>{people}</span>
                            {m.organizer && <span className={styles.sub}>Organizza {m.organizer}</span>}
                        </div>

                        <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M5 20V10M12 20V4M19 20v-7" />
                        </svg>
                        <div className={styles.stack}>
                            {rated ? (
                                <>
                                    <div className={styles.levels}>
                                        <LevelRow kind="utilita" level={m.utilita!} />
                                        <LevelRow kind="effort" level={m.effort!} />
                                    </div>
                                    <span className={styles.sub}>Come l&apos;hai valutato dopo il meeting</span>
                                </>
                            ) : m.impact !== null ? (
                                <>
                                    <span className={styles.text} style={{ fontWeight: 600, color: TONE_COLOR[impactVerdict(m.impact).tone] }}>
                                        Impact {m.impact}/10 · {impactVerdict(m.impact).text}
                                    </span>
                                    <Steps count={10} on={m.impact} color={TONE_COLOR[impactVerdict(m.impact).tone]} width={16} />
                                    <span className={styles.sub}>
                                        {m.impactReasons[0] ? `Perché: ${m.impactReasons[0]}` : "Stima dell'IA basata sui meeting passati simili"}
                                    </span>
                                </>
                            ) : (
                                <span className={styles.text}>Da valutare a fine meeting</span>
                            )}
                        </div>

                        <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
                            <rect x="3" y="5" width="18" height="16" rx="2" />
                            <path d="M3 10h18M8 3v4M16 3v4" />
                        </svg>
                        <div className={styles.stack}>
                            <span className={styles.text}>
                                {m.calendar}
                                {m.readonly ? " · sola lettura" : " · Google Calendar"}
                            </span>
                            <span className={styles.sub}>{m.recurring ? "Si ripete ogni settimana" : "Evento singolo"}</span>
                        </div>
                    </div>
                )}

                {error && (
                    <p className={styles.error} role="alert">
                        {error}
                    </p>
                )}

                {!editing && pending && (
                    <div className={styles.footer}>
                        <span>Partecipi?</span>
                        <button className={styles.primary} onClick={onConfirm}>
                            Conferma partecipazione
                        </button>
                    </div>
                )}
                {!editing && !pending && !rated && !m.readonly && (
                    <div className={`${styles.footer} ${styles.confirmed}`}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="m5 12 4 4 10-10" />
                        </svg>
                        Partecipazione confermata
                    </div>
                )}
            </div>
        </section>
    );
}
