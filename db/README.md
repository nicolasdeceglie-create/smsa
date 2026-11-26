# Team Database

SQLite integrato in Node (`node:sqlite`): niente installazioni native, funziona subito su Windows.
Il file del DB è `db/data/smsa.db` (non va su git).

```powershell
npm install
npm run reset      # svuota + ricarica i dati di esempio (da fare prima di ogni demo)
npm run seed       # aggiunge i dati di esempio (senza svuotare)
npm run typecheck
```

> L'avviso `ExperimentalWarning: SQLite is an experimental feature` è normale, si può ignorare.

## File

- `schema.sql`: tabelle `events_cache` (fotografia degli eventi valutati) e `ratings` (rating + effort 1-5)
- `src/db.ts`: funzioni usate dal backend: `addRating`, `getRatings`, `getRatingsByEvent`, `getSummary`, `upsertEventSnapshot`, `clearAll`
- `src/seed.ts`: 18 meeting passati che coprono tutti e 4 i quadranti
- `src/reset.ts`: svuota e riesegue il seed

## Ticket

| | Ticket | Note |
|---|---|---|
| ✅ | D1. Schema con `rating` ed `effort` (CHECK 1-5) | |
| ✅ | D2. Modulo `db.ts` | |
| ✅ | D3. Seed base, 4 quadranti | |
| ✅ | D4. Script di reset | |
| 🔲 | D5. **Rendere il seed credibile per la demo** | Nomi, note e meeting realistici per il vostro pitch. Il "colpevole" da scoprire è *Weekly status report*: deve essere evidente. Evitate che i meeting passati cadano nel weekend. |
| 🔲 | D6. Statistiche extra in `getSummary` | Es. trend (ultimo rating vs media), media per partecipante, ore totali spese per meeting |
| 🔲 | D7. Allineare il seed agli eventi veri di Google | Quando il backend passa a `MOCK=false`, i titoli dei meeting ricorrenti nel seed dovrebbero coincidere con quelli nel calendario Google di demo, così Claude può collegare storico e agenda |
| 🔲 | D8. Test veloce | Uno script che inserisce un rating non valido (es. 7) e verifica che venga rifiutato |
