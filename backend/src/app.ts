// ============================================================
//  SMSA Backend — API REST usate da MCP server e frontend.
// ============================================================
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import type { NewEvent, EventPatch, NewRating } from "../../shared/types.ts";
import { todayIn } from "../../shared/time.ts";
import { addRating, getRatings, getSummary, upsertEventSnapshot } from "../../db/src/db.ts";
import { config, HttpError } from "./config.ts";
import { createEvent, deleteEvent, getEvent, listEvents, updateEvent } from "./calendar.ts";
import { findFreeSlots } from "./freeSlots.ts";
import { predict } from "./predict.ts";
import { suggestDelegates } from "./delegate.ts";

const app = express();
app.use(cors());
app.use(express.json());

function parseDate(value: unknown, name: string): Date {
  const d = new Date(String(value));
  if (!value || isNaN(d.getTime())) throw new HttpError(400, `Parametro "${name}" mancante o non è una data ISO valida`);
  return d;
}

function requireString(value: unknown, name: string): string {
  if (typeof value !== "string" || !value.trim()) throw new HttpError(400, `Campo "${name}" obbligatorio`);
  return value;
}

function score(value: unknown, name: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 5) throw new HttpError(400, `"${name}" deve essere un intero da 1 a 5`);
  return n;
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, mock: config.mock, timezone: config.timezone, now: new Date().toISOString() });
});

app.get("/events", async (req, res) => {
  const now = Date.now();
  const from = req.query.from ? parseDate(req.query.from, "from") : new Date(now - 7 * 86400_000);
  const to = req.query.to ? parseDate(req.query.to, "to") : new Date(now + 14 * 86400_000);
  res.json(await listEvents(from, to));
});

app.get("/events/:id", async (req, res) => {
  res.json(await getEvent(req.params.id));
});

app.post("/events", async (req, res) => {
  const body = req.body as NewEvent;
  parseDate(body.start, "start");
  parseDate(body.end, "end");
  const input: NewEvent = {
    title: requireString(body.title, "title"),
    start: body.start,
    end: body.end,
    attendees: Array.isArray(body.attendees) ? body.attendees : [],
  };
  if (new Date(input.end) <= new Date(input.start)) throw new HttpError(400, "La fine deve essere dopo l'inizio");
  res.status(201).json(await createEvent(input));
});

app.patch("/events/:id", async (req, res) => {
  const body = req.body as EventPatch;
  if (body.start !== undefined) parseDate(body.start, "start");
  if (body.end !== undefined) parseDate(body.end, "end");
  res.json(await updateEvent(req.params.id, body));
});

app.delete("/events/:id", async (req, res) => {
  await deleteEvent(req.params.id);
  res.status(204).end();
});

app.get("/free-slots", async (req, res) => {
  const date = typeof req.query.date === "string" ? req.query.date : todayIn(config.timezone);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpError(400, `"date" deve essere nel formato YYYY-MM-DD`);
  const duration = Number(req.query.duration ?? 30);
  if (!(duration > 0)) throw new HttpError(400, `"duration" deve essere un numero di minuti`);
  res.json(await findFreeSlots(date, duration));
});

app.post("/ratings", async (req, res) => {
  const body = req.body as NewRating;
  const eventId = requireString(body.event_id, "event_id");
  upsertEventSnapshot(await getEvent(eventId));
  const saved = addRating({
    event_id: eventId,
    rating: score(body.rating, "rating"),
    effort: score(body.effort, "effort"),
    note: typeof body.note === "string" ? body.note : undefined,
  });
  res.status(201).json(saved);
});

app.get("/ratings", (_req, res) => {
  res.json(getRatings());
});

app.get("/ratings/summary", (_req, res) => {
  res.json(getSummary());
});

// Previsioni sui meeting futuri non ancora valutati (default: da adesso a +14 giorni)
app.get("/predictions", async (req, res) => {
  const now = Date.now();
  const from = req.query.from ? parseDate(req.query.from, "from") : new Date(now);
  const to = req.query.to ? parseDate(req.query.to, "to") : new Date(now + 14 * 86400_000);
  const ratings = getRatings();
  const rated = new Set(ratings.map((r) => r.event_id));
  const events = (await listEvents(from, to)).filter((e) => !e.readonly && !rated.has(e.id));
  res.json(events.map((e) => predict(e, ratings)));
});

// A chi del team delegare un meeting
app.get("/events/:id/delegates", async (req, res) => {
  const event = await getEvent(req.params.id);
  const prediction = predict(event, getRatings());
  const day = new Date(event.start).getTime();
  const sameDays = await listEvents(new Date(day - 86400_000), new Date(day + 86400_000));
  const critical = prediction.rating >= 4;
  res.json({ event_id: event.id, title: event.title, critical, prediction, candidates: suggestDelegates(event, sameDays, critical) });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: err instanceof Error ? err.message : "Errore interno" });
});

export { app };
