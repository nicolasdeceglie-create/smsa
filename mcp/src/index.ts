// ============================================================
//  SMSA — Server MCP (stdio) per Claude Desktop.
//
//  Le DESCRIZIONI dei tool sono la parte più importante (ticket M6):
//  è da lì che Claude capisce quale tool usare e con quali parametri.
//  Se in demo Claude sbaglia, quasi sempre si corregge la descrizione.
// ============================================================
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { api } from "./api.ts";

const TZ = process.env.TIMEZONE ?? "Europe/Rome";

const server = new McpServer({ name: "smsa", version: "0.1.0" });

/** Risposta testuale per Claude (JSON compatto e leggibile) */
function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: typeof data === "string" ? data : JSON.stringify(data, null, 1) }] };
}
/** Errore leggibile per Claude, senza far crashare il server */
function fail(err: unknown) {
  return { isError: true, content: [{ type: "text" as const, text: `Errore: ${err instanceof Error ? err.message : String(err)}` }] };
}
async function run(fn: () => Promise<unknown>) {
  try { return ok(await fn()); } catch (e) { return fail(e); }
}

const isoDate = z.string().describe(
  `Data e ora ISO 8601 con fuso orario, es. "2026-11-27T10:00:00+01:00". Il fuso dell'utente è ${TZ}.`
);

// ---------- M7: data e ora corrente ----------
server.registerTool(
  "get_current_datetime",
  {
    title: "Data e ora attuali",
    description:
      `Restituisce data, ora e giorno della settimana attuali nel fuso dell'utente (${TZ}). ` +
      `Usalo SEMPRE prima di interpretare espressioni relative come "oggi", "domani", "venerdì", "la prossima settimana".`,
    annotations: { readOnlyHint: true },
  },
  async () =>
    run(async () => {
      const now = new Date();
      return {
        now_iso: now.toISOString(),
        local: now.toLocaleString("it-IT", { timeZone: TZ, dateStyle: "full", timeStyle: "short" }),
        timezone: TZ,
      };
    })
);

// ---------- M4: eventi ----------
server.registerTool(
  "list_events",
  {
    title: "Elenca eventi",
    description:
      "Elenca gli eventi di TUTTI i calendari collegati (Google e calendari iCloud/ICS) in un intervallo di tempo. " +
      "Ogni evento ha: id, title, start, end, attendees, calendar, readonly. " +
      "Usalo per rispondere a domande sull'agenda e per trovare l'id di un evento prima di modificarlo, cancellarlo o valutarlo. " +
      "Gli eventi con readonly=true (es. iCloud) NON possono essere modificati né cancellati.",
    inputSchema: {
      from: isoDate.optional().describe("Inizio intervallo (ISO 8601). Default: 7 giorni fa."),
      to: isoDate.optional().describe("Fine intervallo (ISO 8601). Default: tra 14 giorni."),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ from, to }) => run(() => api.listEvents(from, to))
);

server.registerTool(
  "create_event",
  {
    title: "Crea evento",
    description:
      "Crea un nuovo evento nel calendario Google dell'utente. " +
      "Se l'utente non indica un orario preciso, usa prima find_free_slots per proporre uno slot libero.",
    inputSchema: {
      title: z.string().describe("Titolo dell'evento"),
      start: isoDate.describe("Inizio (ISO 8601 con fuso)"),
      end: isoDate.describe("Fine (ISO 8601 con fuso)"),
      attendees: z.array(z.string().email()).optional().describe("Email dei partecipanti (opzionale)"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  async (args) => run(() => api.createEvent(args))
);

server.registerTool(
  "update_event",
  {
    title: "Modifica evento",
    description:
      "Modifica un evento esistente (titolo, orario, partecipanti): passa solo i campi da cambiare. " +
      "Serve l'id dell'evento: se non lo hai, usa prima list_events. " +
      "Non funziona sugli eventi con readonly=true. " +
      "Per spostare un evento mantenendo la durata, aggiorna sia start che end. " +
      "Se l'evento ha altri partecipanti, chiedi conferma all'utente prima di modificarlo.",
    inputSchema: {
      event_id: z.string().describe("id dell'evento (da list_events)"),
      title: z.string().optional(),
      start: isoDate.optional(),
      end: isoDate.optional(),
      attendees: z.array(z.string().email()).optional().describe("Lista COMPLETA dei partecipanti (sostituisce quella attuale)"),
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
  },
  async ({ event_id, ...patch }) => run(() => api.updateEvent(event_id, patch))
);

server.registerTool(
  "delete_event",
  {
    title: "Cancella evento",
    description:
      "Cancella definitivamente un evento. Serve l'id (da list_events). " +
      "Non funziona sugli eventi con readonly=true. " +
      "Chiedi SEMPRE conferma all'utente prima di cancellare, indicando titolo e data dell'evento.",
    inputSchema: { event_id: z.string().describe("id dell'evento (da list_events)") },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
  },
  async ({ event_id }) => run(async () => { await api.deleteEvent(event_id); return `Evento ${event_id} cancellato.`; })
);

// ---------- M8: slot liberi ----------
server.registerTool(
  "find_free_slots",
  {
    title: "Trova slot liberi",
    description:
      "Trova gli intervalli liberi in un giorno, nell'orario lavorativo 9:00-18:00, considerando tutti i calendari. " +
      "Usalo quando l'utente vuole fissare o spostare un meeting senza indicare un orario preciso.",
    inputSchema: {
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Giorno nel formato YYYY-MM-DD, es. "2026-11-27"'),
      duration: z.number().int().positive().default(30).describe("Durata minima dello slot in minuti (default 30)"),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ date, duration }) => run(() => api.freeSlots(date, duration))
);

// ---------- M5: rating ----------
server.registerTool(
  "rate_meeting",
  {
    title: "Valuta un meeting",
    description:
      "Salva la valutazione di un meeting con DUE punteggi distinti, entrambi da 1 a 5:\n" +
      "- rating: quanto è stato UTILE / com'è andato (1 = inutile, 5 = utilissimo)\n" +
      "- effort: quanto è COSTATO in energia, preparazione, stanchezza (1 = nessuno sforzo, 5 = sfiancante)\n" +
      "Deduci i punteggi da come l'utente descrive il meeting (es. \"inutile e mi ha distrutto\" → rating 1, effort 5). " +
      "Se uno dei due punteggi non è deducibile, CHIEDILO all'utente prima di salvare. " +
      "Salva nella nota un breve riassunto del commento dell'utente. " +
      "Serve l'id dell'evento: usa prima list_events.",
    inputSchema: {
      event_id: z.string().describe("id dell'evento (da list_events)"),
      rating: z.number().int().min(1).max(5).describe("Utilità del meeting, 1-5"),
      effort: z.number().int().min(1).max(5).describe("Sforzo / energia richiesti, 1-5"),
      note: z.string().optional().describe("Breve commento dell'utente"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  async (args) => run(() => api.rate(args))
);

const MATRIX =
  "Interpreta i dati con la matrice rating × effort:\n" +
  "- keep (rating alto, effort basso): da tenere così\n" +
  "- optimize (rating alto, effort alto): utile ma pesante → preparare meglio, accorciare, ridurre partecipanti\n" +
  "- shorten (rating basso, effort basso): da accorciare o sostituire con un aggiornamento asincrono (chat/email)\n" +
  "- drop (rating basso, effort alto): candidato da eliminare\n" +
  "Per i meeting ricorrenti proponi azioni concrete sui prossimi eventi (spostare, accorciare, cancellare) e, se l'utente accetta, eseguile.";

server.registerTool(
  "get_meeting_history",
  {
    title: "Storico valutazioni",
    description:
      "Restituisce tutte le valutazioni passate (rating, effort, nota) con titolo, data e partecipanti del meeting. " +
      "Usalo per analisi dettagliate: andamento nel tempo, confronto per partecipante, commenti ricorrenti.\n" + MATRIX,
    annotations: { readOnlyHint: true },
  },
  async () => run(() => api.ratings())
);

// ---------- M10: insight ----------
server.registerTool(
  "get_meeting_insights",
  {
    title: "Insight sui meeting",
    description:
      "Riepilogo per meeting (raggruppato per titolo, quindi i ricorrenti sono aggregati): numero di valutazioni, " +
      "rating medio, effort medio e quadrante già calcolato (keep / optimize / shorten / drop). " +
      "Usalo per domande come \"quali meeting dovrei eliminare?\" o \"dove perdo più energie?\".\n" + MATRIX,
    annotations: { readOnlyHint: true },
  },
  async () => run(() => api.summary())
);

// ---------- M12: prompt pronto per la demo ----------
server.registerPrompt(
  "weekly_review",
  {
    title: "Review settimanale",
    description: "Analizza i meeting e proponi cosa tagliare nella prossima settimana",
  },
  () => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text:
          "Fai una review dei miei meeting: usa get_meeting_insights e get_meeting_history, " +
          "dimmi quali tenere, ottimizzare, accorciare o eliminare, poi guarda la mia agenda della prossima settimana " +
          "con list_events e proponimi modifiche concrete. Non modificare nulla senza la mia conferma.",
      },
    }],
  })
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("SMSA MCP server avviato (stdio)");
