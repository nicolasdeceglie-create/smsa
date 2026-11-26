# SMSA · frontend Next.js

Calendario settimanale di SMSA in Next.js: tutta l'app sta in una schermata, senza scroll, così in demo si può affiancare a Claude Desktop.

Cosa c'è:

- vista settimanale con i meeting passati colorati per quadrante (da tenere, ottimizzare, accorciare, eliminare) e, sotto il titolo, **utilità** ed **effort**;
- sui meeting futuri l'**impact** da 0 a 10, cioè quanto vale la pena andarci;
- al clic su un evento, un riquadro con descrizione, partecipanti, voti e le azioni: modifica, contatta i partecipanti (apre la mail), elimina, conferma la partecipazione;
- a destra: le ultime modifiche fatte da Claude, i prossimi meeting ordinati per data con il loro impact e i suggerimenti calcolati dai meeting già valutati;
- quando Claude crea, sposta o cancella un meeting, l'evento lampeggia e compare nel pannello "Attività di Claude".

## Avvio

Serve Node.js 22 o superiore.

```powershell
cd frontend-next
npm install
copy .env.example .env.local   # su Mac/Linux: cp .env.example .env.local
npm run dev                    # → http://localhost:3000
```

Altri comandi: `npm run build`, `npm run start`, `npm run typecheck`, `npm test`.

## Collegarlo al backend

Tre terminali, dalla radice della repo:

```powershell
# 1. database con i voti di esempio
cd db; npm install; npm run reset

# 2. backend (MOCK=true nel suo .env se non avete ancora Google)
cd backend; npm install; copy .env.example .env; npm run dev

# 3. frontend
cd frontend-next; npm install
```

Poi in `frontend-next/.env.local`:

```
NEXT_PUBLIC_DATA_SOURCE=api
BACKEND_URL=http://localhost:3001
```

e `npm run dev`. In alto a destra deve comparire "Live · aggiornato hh:mm". Per provare il lampeggio senza Claude basta spostare un evento a mano:

```powershell
curl -X PATCH http://localhost:3001/events/mock-planning -H "Content-Type: application/json" -d '{\"start\":\"2026-11-27T14:00:00+01:00\",\"end\":\"2026-11-27T16:00:00+01:00\"}'
```

Entro 3 secondi l'evento lampeggia con "Modificato da Claude" e compare in "Attività di Claude".

Per vedere il calendario pieno (62 meeting, orari e durate diverse) anche con il backend, usate i dati
della demo: `SEED_FILE` per il database e `MOCK_DATA_FILE` per il backend, come spiegato nel README principale.

## Test

Vitest con Testing Library, in `test/`:

| File | Cosa controlla |
|---|---|
| `api.test.ts` | chiamate al backend, conversione di voti e previsioni, voto trovato per titolo + orario se l'id è diverso, suggerimenti, errori |
| `activity.test.ts` | confronto tra due letture: creato, spostato, rinominato, eliminato |
| `scores.test.ts` | livelli, quadranti, colori, impact e suggerimenti |
| `dates.test.ts` | settimana da lunedì, intervalli a cavallo di due mesi, formati |
| `mock.test.ts` | dati della demo: tre settimane piene, durate da 30 minuti a 2 ore, nessuna sovrapposizione, voti sui passati e impact sui futuri |
| `components.test.tsx` | blocco evento, riquadro di dettaglio con le azioni, pannello laterale |
| `useMeetings.test.ts` | conferma, elimina, modifica e simulazione di Claude |

La CI (`.github/workflows/frontend-next.yml`) lancia typecheck, test e build a ogni pull request che tocca `frontend-next/` o `shared/`.

## Da dove arrivano i dati

Si sceglie con `NEXT_PUBLIC_DATA_SOURCE` in `.env.local`.

| Valore | Dati | Note |
|---|---|---|
| `mock` (predefinito) | `src/data/calendario.json`, copia di `backend/example-data/calendario.json` | Non serve il backend. Il pulsante "Simula una modifica" sposta un meeting per provare il lampeggio. |
| `api` | backend Express della cartella `backend/` | Next gira `/api/*` su `BACKEND_URL` (default `http://localhost:3001`) e legge ogni 3 secondi. |

Con `api` il frontend usa questi endpoint del backend: `/health`, `/events`, `/ratings`, `/ratings/summary`, `/predictions`, `PATCH /events/:id`, `DELETE /events/:id`.

### Come vengono convertiti i voti

La UI ragiona sempre in basso / medio / alto e in impact 0-10. Le conversioni sono in `src/lib/scores.ts`:

- rating ed effort del backend (1-5): 1-2 basso, 3 medio, 4-5 alto;
- impact dal file mock: `likeability / 10`;
- impact dal backend: rating previsto da `/predictions`, portato da 1-5 a 0-10;
- quadrante: stessa regola di `quadrantOf()` in `shared/types.ts`.

## Struttura

```
src/
  app/          layout, pagina e stili globali
  components/   Header, WeekCalendar, EventCard, EventPopover, Sidebar
  hooks/        useMeetings: dati, polling, confronto per il lampeggio, azioni
  lib/          tipi, date, punteggi, client del backend, dati mock
  data/         calendario.json del gruppo DB
```

## Da fare con il backend

- I voti del seed (`seed-N`) e gli eventi del connettore mock (`mock-*`) hanno id diversi: il frontend li collega per titolo e orario di inizio. Con Google Calendar gli id coincidono e il collegamento è diretto.
- Il backend non ha ancora un endpoint per rispondere agli inviti: "Conferma partecipazione" per ora aggiorna solo la UI (`confirm` in `src/hooks/useMeetings.ts`).
- `/events` non restituisce descrizione, organizzatore e ricorrenza: con `api` il riquadro mostra solo quello che arriva. Se il backend li aggiunge a `CalendarEvent`, basta mapparli in `src/lib/api.ts`.
- L'impact dal backend parte dal rating previsto; se il gruppo DB aggiunge un campo `impact` vero, va letto al suo posto in `src/lib/api.ts`.
