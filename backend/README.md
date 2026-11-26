# Team Backend

API REST su `http://localhost:3001`, usate dal server MCP e dal frontend.

```powershell
npm install
copy .env.example .env
npm run dev        # riavvio automatico a ogni modifica
npm run auth       # login Google (ticket B2), una volta sola
npm run typecheck
npm test           # test HTTP d'integrazione con SQLite in memoria e calendario mock
```

Con `MOCK=true` (default) usa eventi finti in memoria, **scritture comprese**: la demo funziona anche senza Google e senza rete.

## Dati della demo

Con `MOCK=true` il backend usa eventi finti scritti nel codice. Per avere la settimana piena del gruppo DB
(62 meeting dal 16 novembre al 4 dicembre, con orari e durate diverse) aggiungete al `.env`:

```
MOCK_DATA_FILE=./example-data/calendario.json
```

Gli id degli eventi (`evt_001`, ...) sono gli stessi che usa il seed del database con `SEED_FILE`, così
voti e previsioni si collegano ai meeting giusti. La conversione del formato è in `shared/demoData.ts`.

## Endpoint

| Metodo | Path | Descrizione |
|---|---|---|
| GET | `/health` | Stato, modalità mock, fuso |
| GET | `/events?from&to` | Eventi di Google + ICS uniti e ordinati (default: -7 / +14 giorni) |
| GET | `/events/:id` | Un evento |
| POST | `/events` | `{ title, start, end, attendees? }` |
| PATCH | `/events/:id` | Campi parziali. 403 se l'evento è in sola lettura |
| DELETE | `/events/:id` | 403 se l'evento è in sola lettura |
| GET | `/free-slots?date=YYYY-MM-DD&duration=30` | Slot liberi tra 9:00 e 18:00 |
| POST | `/ratings` | `{ event_id, rating 1-5, effort 1-5, note? }` |
| GET | `/ratings` | Rating con titolo, data e partecipanti dell'evento |
| GET | `/ratings/summary` | Medie per meeting + quadrante (keep / optimize / shorten / drop) |
| GET | `/predictions?from&to` | Rating ed effort previsti per i meeting futuri non valutati (default: adesso / +14 giorni) |
| GET | `/events/:id/delegates` | Fino a 3 colleghi del team a cui delegare, da `data/organigramma.json` (utente: `USER_EMAIL`) |

Gli errori sono `{ "error": "messaggio" }`: **li legge Claude**, quindi devono essere chiari.

## File

- `src/index.ts`: route e validazione
- `src/calendar.ts`: facciata unica (mock oppure Google + ICS), con cache e controllo della sola lettura
- `src/freeSlots.ts`: calcolo degli slot liberi
- `src/connectors/mock.ts | google.ts | ics.ts`
- `src/auth.ts`: login OAuth Google

## Ticket

| | Ticket | Note |
|---|---|---|
| ✅ | B1. Setup Express + TS + .env | |
| 🔲 | **B2. Auth Google, DA FARE SUBITO** | Google Cloud Console → abilita Calendar API → consenso OAuth "Esterno" in **Testing**, aggiungi i test user → credenziali "App desktop" → salva come `backend/credentials.json` → `npm run auth` |
| 🟡 | B3. Google: lettura | Codice scritto in `connectors/google.ts`, **da testare** con credenziali vere |
| 🟡 | B4. Google: scrittura | Come sopra. Decidete `sendUpdates` (`"none"` = nessun invito ai partecipanti) |
| ✅ | B5. Endpoint eventi | |
| ✅ | B6. Endpoint rating | |
| 🟡 | B7. Connettore ICS (iCloud) | Codice scritto, da testare con un vero link iCloud pubblico. TODO: eccezioni dei ricorrenti (`exdate`) |
| ✅ | B8. Slot liberi | |
| ✅ | B9. Riepilogo rating | |
| ✅ | B10. Cache eventi (30s) | |
| ✅ | B11. Modalità mock | |
| 🔲 | B12. Preparare il calendario Google di demo | Un account Google dedicato con eventi realistici per le prossime 2 settimane (titoli uguali a quelli del seed del DB) |
| 🔲 | B13. Prova a `MOCK=false` | Tutti gli endpoint con Google vero + ICS, verificate i fusi orari |
