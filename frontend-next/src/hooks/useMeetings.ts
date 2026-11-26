"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { deleteMeeting, fetchSnapshot, updateMeeting } from "@/lib/api";
import { fmtDayShort, fmtTime } from "@/lib/dates";
import { loadMockMeetings } from "@/lib/mock";
import { suggestionsFrom } from "@/lib/scores";
import type { ActivityItem, Meeting, MeetingPatch, SourceStatus, Suggestion } from "@/lib/types";

const SOURCE = process.env.NEXT_PUBLIC_DATA_SOURCE === "api" ? "api" : "mock";
const POLL_MS = 3000;
const FLASH_MS = 4000;

/** Confronta due liste e descrive cosa è cambiato (creato, spostato, eliminato) */
function diff(prev: Meeting[], next: Meeting[], ignore: Set<string>): ActivityItem[] {
    const before = new Map(prev.map((m) => [m.id, m]));
    const after = new Map(next.map((m) => [m.id, m]));
    const items: ActivityItem[] = [];
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

export function useMeetings(from: Date, to: Date) {
    const [meetings, setMeetings] = useState<Meeting[]>(() => (SOURCE === "mock" ? loadMockMeetings() : []));
    const [apiSuggestions, setApiSuggestions] = useState<Suggestion[]>([]);
    const [activity, setActivity] = useState<ActivityItem[]>([]);
    const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
    const [status, setStatus] = useState<SourceStatus>({
        source: SOURCE,
        online: SOURCE === "mock",
        backendMock: false,
        updatedAt: SOURCE === "mock" ? new Date() : null,
        error: null,
    });
    const previous = useRef<Meeting[] | null>(null);
    const deletedByUser = useRef(new Set<string>());

    const flash = useCallback((ids: string[]) => {
        if (!ids.length) return;
        setFlashIds((s) => new Set([...s, ...ids]));
        setTimeout(() => {
            setFlashIds((s) => {
                const next = new Set(s);
                ids.forEach((id) => next.delete(id));
                return next;
            });
        }, FLASH_MS);
    }, []);

    const record = useCallback(
        (items: ActivityItem[]) => {
            if (!items.length) return;
            setActivity((a) => [...items, ...a].slice(0, 6));
            flash(items.map((i) => i.meetingId));
        },
        [flash]
    );

    // polling del backend: le modifiche fatte da Claude compaiono da sole
    const fromKey = from.getTime();
    const toKey = to.getTime();
    useEffect(() => {
        if (SOURCE !== "api") return;
        let alive = true;
        previous.current = null;
        const tick = async () => {
            try {
                const snap = await fetchSnapshot(new Date(fromKey), new Date(toKey));
                if (!alive) return;
                if (previous.current) record(diff(previous.current, snap.meetings, deletedByUser.current));
                previous.current = snap.meetings;
                setMeetings(snap.meetings);
                setApiSuggestions(snap.suggestions);
                setStatus({ source: "api", online: true, backendMock: snap.backendMock, updatedAt: new Date(), error: null });
            } catch (e) {
                if (alive) setStatus((s) => ({ ...s, online: false, error: e instanceof Error ? e.message : String(e) }));
            }
        };
        tick();
        const id = setInterval(tick, POLL_MS);
        return () => {
            alive = false;
            clearInterval(id);
        };
    }, [fromKey, toKey, record]);

    const remove = useCallback(async (id: string) => {
        deletedByUser.current.add(id);
        if (SOURCE === "api") await deleteMeeting(id);
        setMeetings((list) => list.filter((m) => m.id !== id));
    }, []);

    const update = useCallback(async (id: string, patch: MeetingPatch) => {
        if (SOURCE === "api") await updateMeeting(id, patch);
        setMeetings((list) =>
            list.map((m) =>
                m.id !== id
                    ? m
                    : {
                          ...m,
                          title: patch.title ?? m.title,
                          start: patch.start ? new Date(patch.start) : m.start,
                          end: patch.end ? new Date(patch.end) : m.end,
                      }
            )
        );
        // la prossima lettura del backend non deve segnarla come modifica di Claude
        if (previous.current) {
            previous.current = previous.current.map((m) =>
                m.id !== id ? m : { ...m, title: patch.title ?? m.title, start: patch.start ? new Date(patch.start) : m.start, end: patch.end ? new Date(patch.end) : m.end }
            );
        }
    }, []);

    /** Nessun endpoint per rispondere agli inviti nel backend: per ora la conferma resta locale */
    const confirm = useCallback((id: string) => {
        setMeetings((list) => list.map((m) => (m.id === id ? { ...m, myResponse: "accepted" } : m)));
    }, []);

    /** Solo in modalità mock: simula Claude che sposta il meeting futuro con l'impact più basso */
    const simulateClaude = useCallback(() => {
        const target = meetings
            .filter((m) => m.impact !== null && m.start > new Date())
            .sort((a, b) => (a.impact ?? 0) - (b.impact ?? 0))[0];
        if (!target) return;
        // un'ora più tardi nello stesso giorno, così il cambio si vede nella settimana aperta
        const HOUR = 60 * 60_000;
        const moved = { ...target, start: new Date(target.start.getTime() + HOUR), end: new Date(target.end.getTime() + HOUR) };
        setMeetings((list) => list.map((m) => (m.id === target.id ? moved : m)));
        record([
            {
                id: `${target.id}-spostato-${Date.now()}`,
                meetingId: target.id,
                at: new Date(),
                verb: "spostato",
                meetingTitle: target.title,
                detail: `a ${fmtDayShort(moved.start)} alle ${fmtTime(moved.start)}: impact ${target.impact}/10`,
            },
        ]);
    }, [meetings, record]);

    const suggestions = SOURCE === "api" ? apiSuggestions : suggestionsFrom(meetings);

    return { meetings, suggestions, activity, flashIds, status, remove, update, confirm, simulateClaude };
}
