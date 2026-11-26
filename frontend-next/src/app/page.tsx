"use client";

import { useEffect, useMemo, useState } from "react";
import { EventPopover } from "@/components/EventPopover";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { WeekCalendar } from "@/components/WeekCalendar";
import { useMeetings } from "@/hooks/useMeetings";
import { addDays, startOfWeek } from "@/lib/dates";
import type { Meeting } from "@/lib/types";
import styles from "./page.module.css";

export default function Page() {
    // il calendario dipende dall'ora del browser: lo disegno solo lato client
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    return mounted ? <Home /> : <div className={styles.app} aria-busy="true" />;
}

function Home() {
    const [now, setNow] = useState(() => new Date());
    const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // l'ora corrente si aggiorna ogni minuto (linea verde nel calendario)
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 60_000);
        return () => clearInterval(id);
    }, []);

    // dal backend chiedo la settimana visibile più le due successive, per la lista dell'impact
    const from = weekStart < startOfWeek(now) ? weekStart : startOfWeek(now);
    const to = addDays(weekStart > startOfWeek(now) ? weekStart : startOfWeek(now), 21);
    const { meetings, suggestions, activity, flashIds, status, remove, update, confirm, simulateClaude } = useMeetings(from, to);

    const upcoming = useMemo(
        () =>
            meetings
                .filter((m) => m.impact !== null && m.end > now)
                .sort((a, b) => a.start.getTime() - b.start.getTime())
                .slice(0, 6),
        [meetings, now]
    );

    const goToWeek = (d: Date) => {
        setWeekStart(d);
        setSelectedId(null);
    };

    const openFromList = (m: Meeting) => {
        setWeekStart(startOfWeek(m.start));
        setSelectedId(m.id);
    };

    return (
        <div className={styles.app}>
            <Header
                weekStart={weekStart}
                status={status}
                onPrev={() => goToWeek(addDays(weekStart, -7))}
                onNext={() => goToWeek(addDays(weekStart, 7))}
                onToday={() => goToWeek(startOfWeek(new Date()))}
            />
            <div className={styles.body}>
                <WeekCalendar
                    weekStart={weekStart}
                    meetings={meetings}
                    now={now}
                    selectedId={selectedId}
                    flashIds={flashIds}
                    onSelect={setSelectedId}
                    renderPopover={(m, placement) => (
                        <EventPopover
                            key={m.id}
                            meeting={m}
                            placement={placement}
                            onClose={() => setSelectedId(null)}
                            onDelete={async () => {
                                await remove(m.id);
                                setSelectedId(null);
                            }}
                            onConfirm={() => confirm(m.id)}
                            onSave={(patch) => update(m.id, patch)}
                        />
                    )}
                />
                <Sidebar
                    activity={activity}
                    upcoming={upcoming}
                    suggestions={suggestions}
                    selectedId={selectedId}
                    canSimulate={status.source === "mock"}
                    onSimulate={simulateClaude}
                    onOpen={openFromList}
                />
            </div>
        </div>
    );
}
