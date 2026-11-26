import { fmtTime, fmtWeekRange } from "@/lib/dates";
import type { SourceStatus } from "@/lib/types";
import styles from "./Header.module.css";

interface Props {
    weekStart: Date;
    status: SourceStatus;
    onPrev: () => void;
    onNext: () => void;
    onToday: () => void;
}

export function Header({ weekStart, status, onPrev, onNext, onToday }: Props) {
    const live = status.source === "api";
    const label = !live
        ? "Dati di esempio"
        : status.online
          ? `Live · aggiornato ${status.updatedAt ? fmtTime(status.updatedAt) : "…"}`
          : "Backend non raggiungibile, riprovo…";

    return (
        <header className={styles.header}>
            <div className={styles.brand}>
                <div className={styles.logo} aria-hidden="true">
                    <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#4ade80"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <rect x="3" y="5" width="18" height="16" rx="3" />
                        <path d="M3 10h18M8 3v4M16 3v4" />
                        <path d="m9 15 2 2 4-4" />
                    </svg>
                </div>
                <div>
                    <span className={styles.name}>MeetWise</span>
                    <span className={styles.tagline}>Meno riunioni, più impatto</span>
                </div>
            </div>

            <div className={styles.nav}>
                <button className={styles.today} onClick={onToday}>
                    Oggi
                </button>
                <button className={styles.arrow} onClick={onPrev} aria-label="Settimana precedente">
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        aria-hidden="true"
                    >
                        <path d="m15 18-6-6 6-6" />
                    </svg>
                </button>
                <button className={styles.arrow} onClick={onNext} aria-label="Settimana successiva">
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        aria-hidden="true"
                    >
                        <path d="m9 18 6-6-6-6" />
                    </svg>
                </button>
                <h1 className={styles.range}>{fmtWeekRange(weekStart)}</h1>
            </div>

            <div className={styles.right}>
                {(!live || status.backendMock) && <span className={styles.mock}>MOCK</span>}
                <span className={styles.status} role="status">
                    <span className={`${styles.dot} ${live && !status.online ? styles.dotOff : ""}`} />
                    {label}
                </span>
            </div>
        </header>
    );
}
