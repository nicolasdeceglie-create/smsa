import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import type { Express } from "express";
import type { Server } from "node:http";

let app: Express;
let clearAll: () => void;
let server: Server | undefined;
let baseUrl: string;
const createdEventIds = new Set<string>();

async function postEvent(title: string) {
  const response = await fetch(`${baseUrl}/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title,
      start: "2099-05-12T10:00:00.000Z",
      end: "2099-05-12T10:30:00.000Z",
      attendees: ["test@example.com"],
    }),
  });
  const event = await response.json() as { id: string };
  if (response.ok) createdEventIds.add(event.id);
  return { response, event };
}

before(async () => {
  process.env.MOCK = "true";
  process.env.SMSA_DB_PATH = ":memory:";

  ({ app } = await import("../src/app.ts"));
  ({ clearAll } = await import("../../db/src/db.ts"));

  const listeningServer = app.listen(0, "127.0.0.1");
  server = listeningServer;
  await new Promise<void>((resolve, reject) => {
    listeningServer.once("error", reject);
    listeningServer.once("listening", resolve);
  });
  const address = listeningServer.address();
  assert.ok(address && typeof address !== "string");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

beforeEach(() => {
  clearAll();
});

afterEach(async () => {
  for (const id of createdEventIds) {
    await fetch(`${baseUrl}/events/${id}`, { method: "DELETE" });
  }
  createdEventIds.clear();
  clearAll();
});

after(async () => {
  const listeningServer = server;
  if (!listeningServer?.listening) return;
  await new Promise<void>((resolve, reject) => {
    listeningServer.close((error) => error ? reject(error) : resolve());
  });
});

test("health indica che il backend è avviato in modalità mock", async () => {
  const response = await fetch(`${baseUrl}/health`);
  const body = await response.json() as { ok: boolean; mock: boolean; timezone: string };

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.mock, true);
  assert.equal(typeof body.timezone, "string");
});

test("crea, legge, aggiorna ed elimina un evento", async () => {
  const { response: created, event } = await postEvent("Test CRUD");
  assert.equal(created.status, 201);
  assert.ok(event.id);

  const read = await fetch(`${baseUrl}/events/${event.id}`);
  assert.equal(read.status, 200);
  assert.equal((await read.json() as { title: string }).title, "Test CRUD");

  const updated = await fetch(`${baseUrl}/events/${event.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "Test CRUD aggiornato" }),
  });
  assert.equal(updated.status, 200);
  assert.equal((await updated.json() as { title: string }).title, "Test CRUD aggiornato");

  const listed = await fetch(`${baseUrl}/events?from=2099-05-12T00:00:00.000Z&to=2099-05-13T00:00:00.000Z`);
  assert.equal(listed.status, 200);
  assert.ok((await listed.json() as Array<{ id: string }>).some((item) => item.id === event.id));

  const deleted = await fetch(`${baseUrl}/events/${event.id}`, { method: "DELETE" });
  assert.equal(deleted.status, 204);
  createdEventIds.delete(event.id);

  const missing = await fetch(`${baseUrl}/events/${event.id}`);
  assert.equal(missing.status, 404);
});

test("rifiuta dati evento e rating non validi con errore client", async () => {
  const invalidDate = await fetch(`${baseUrl}/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title: "Data non valida",
      start: "non-una-data",
      end: "2099-05-12T10:30:00.000Z",
    }),
  });
  assert.equal(invalidDate.status, 400);

  const invalidOrder = await fetch(`${baseUrl}/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title: "Intervallo non valido",
      start: "2099-05-12T10:30:00.000Z",
      end: "2099-05-12T10:00:00.000Z",
    }),
  });
  assert.equal(invalidOrder.status, 400);

  const { event } = await postEvent("Test rating non valido");
  const invalidRating = await fetch(`${baseUrl}/ratings`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ event_id: event.id, rating: 6, effort: 3 }),
  });
  assert.equal(invalidRating.status, 400);
});

test("registra il rating, ne rilegge i dati e calcola il riepilogo", async () => {
  const { response: created, event } = await postEvent("Retrospettiva test");
  assert.equal(created.status, 201);

  const saved = await fetch(`${baseUrl}/ratings`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      event_id: event.id,
      rating: 5,
      effort: 2,
      note: "Utile",
    }),
  });
  assert.equal(saved.status, 201);

  const ratings = await fetch(`${baseUrl}/ratings`);
  const ratingRows = await ratings.json() as Array<{
    event_id: string;
    event_title: string;
    event_attendees: string[];
    note: string;
  }>;
  assert.equal(ratings.status, 200);
  assert.equal(ratingRows.length, 1);
  assert.equal(ratingRows[0].event_id, event.id);
  assert.equal(ratingRows[0].event_title, "Retrospettiva test");
  assert.deepEqual(ratingRows[0].event_attendees, ["test@example.com"]);
  assert.equal(ratingRows[0].note, "Utile");

  const summary = await fetch(`${baseUrl}/ratings/summary`);
  const summaryRows = await summary.json() as Array<{ title: string; count: number; quadrant: string }>;
  assert.equal(summary.status, 200);
  assert.deepEqual(summaryRows, [{
    title: "Retrospettiva test",
    count: 1,
    avg_rating: 5,
    avg_effort: 2,
    quadrant: "keep",
  }]);
});

test("impedisce di modificare o eliminare eventi in sola lettura", async () => {
  const patch = await fetch(`${baseUrl}/events/mock-ics-gym`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "Modifica vietata" }),
  });
  assert.equal(patch.status, 403);

  const remove = await fetch(`${baseUrl}/events/mock-ics-gym`, { method: "DELETE" });
  assert.equal(remove.status, 403);
});

test("valida i parametri degli slot liberi", async () => {
  const invalidDate = await fetch(`${baseUrl}/free-slots?date=12-05-2099`);
  assert.equal(invalidDate.status, 400);

  const invalidDuration = await fetch(`${baseUrl}/free-slots?date=2099-05-12&duration=0`);
  assert.equal(invalidDuration.status, 400);

  const valid = await fetch(`${baseUrl}/free-slots?date=2099-05-12&duration=30`);
  const slots = await valid.json() as Array<{ start: string; end: string }>;
  assert.equal(valid.status, 200);
  assert.ok(slots.length > 0);
  assert.ok(slots.every((slot) => new Date(slot.end) > new Date(slot.start)));
});

type Prediction = { event_id: string; rating: number; effort: number; confidence: string; reasons: string[] };

test("prevede i meeting non valutati e impara dai rating", async () => {
  const before = (await (await fetch(`${baseUrl}/predictions`)).json() as Prediction[])
    .find((p) => p.event_id === "mock-status-2");
  assert.ok(before, "il prossimo weekly status report è tra i meeting da prevedere");
  assert.equal(before.confidence, "bassa");

  const saved = await fetch(`${baseUrl}/ratings`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ event_id: "mock-status-1", rating: 1, effort: 5 }),
  });
  assert.equal(saved.status, 201);

  const predictions = await (await fetch(`${baseUrl}/predictions`)).json() as Prediction[];
  const after = predictions.find((p) => p.event_id === "mock-status-2");
  assert.ok(after);
  assert.ok(after.rating < before.rating, "un weekly inutile abbassa l'utilità prevista del prossimo");
  assert.ok(after.effort > before.effort);
  assert.ok(after.reasons.some((r) => r.startsWith("stesso meeting già valutato")));
  assert.ok(!predictions.some((p) => p.event_id === "mock-status-1"), "i meeting già valutati non si prevedono");
});

test("suggerisce a chi delegare dall'organigramma", async () => {
  const res = await fetch(`${baseUrl}/events/mock-deepdive/delegates`);
  assert.equal(res.status, 200);
  const body = await res.json() as { critical: boolean; candidates: Array<{ email: string; reasons: string[] }> };
  assert.equal(body.candidates.length, 3);
  assert.ok(!body.candidates.some((c) => c.email === "davide.ferrari@azienda.it"), "chi è già invitato non si delega");
  assert.ok(body.candidates[0].reasons.some((r) => r.startsWith("competenze sul tema")));

  const ceo = await (await fetch(`${baseUrl}/events/mock-roadmap/delegates`)).json() as { critical: boolean };
  assert.equal(ceo.critical, true, "con il CEO il meeting è critico");
});
