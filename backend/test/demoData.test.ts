import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const FILE = fileURLToPath(new URL("../example-data/calendario.json", import.meta.url));

test("demoData: legge il calendario del gruppo DB e lo converte in CalendarEvent", async () => {
    const { readDemoCalendar, toCalendarEvent } = await import("../../shared/demoData.ts");
    const cal = readDemoCalendar(FILE);
    assert.equal(cal.calendar_owner, "marco.rossi@azienda.it");
    assert.ok(cal.events.length > 50);

    const first = cal.events[0];
    const e = toCalendarEvent(first, cal.calendar_owner);
    assert.equal(e.id, first.id);
    assert.equal(e.title, first.title);
    assert.equal(e.start, first.start);
    assert.equal(e.source, "google");
    assert.equal(e.calendar, "Lavoro");
    assert.equal(e.readonly, false);
    // il proprietario del calendario non è tra i partecipanti, come negli altri connettori
    assert.ok(!e.attendees.includes(cal.calendar_owner));
    assert.equal(e.attendees.length, first.attendees.length - 1);
});

test("demoData: i voti basso/medio/alto diventano 1/3/5, solo per i meeting valutati", async () => {
    const { readDemoCalendar, demoRatings } = await import("../../shared/demoData.ts");
    const cal = readDemoCalendar(FILE);
    const ratings = demoRatings(cal);
    const rated = cal.events.filter((e) => e.utilita && e.effort);
    assert.equal(ratings.length, rated.length);
    for (const r of ratings) {
        assert.ok([1, 3, 5].includes(r.rating));
        assert.ok([1, 3, 5].includes(r.effort));
    }
    const first = rated[0];
    const match = ratings.find((r) => r.event.id === first.id)!;
    assert.equal(match.rating, { basso: 1, medio: 3, alto: 5 }[first.utilita!]);
});

test("connettore mock: con MOCK_DATA_FILE usa gli eventi del file", async () => {
    process.env.MOCK = "true";
    process.env.MOCK_DATA_FILE = FILE;
    const { mockConnector } = await import("../src/connectors/mock.ts");
    const list = await mockConnector.list(new Date("2026-11-23T00:00:00+01:00"), new Date("2026-11-30T00:00:00+01:00"));
    assert.ok(list.length >= 18);
    assert.ok(list.some((e) => e.title === "Standup Tech Leads Software"));
    assert.ok(list.every((e) => e.id.startsWith("evt_")));
});
