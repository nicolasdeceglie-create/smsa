# Team Frontend

Vite + React + FullCalendar. Legge il backend tramite il proxy `/api` → `http://localhost:3001`.
Fa polling ogni 3 secondi: le modifiche fatte da Claude compaiono da sole.

```powershell
npm install
npm run dev        # → http://localhost:5173  (serve il backend avviato)
npm run typecheck
```

## File

- `src/App.tsx`: layout (calendario + pannello laterale)
- `src/components/CalendarView.tsx`: calendario settimanale, colori per calendario, 🔒 sugli eventi in sola lettura
- `src/components/MatrixChart.tsx`: scatter rating × effort con i 4 quadranti
- `src/components/InsightsPanel.tsx`: tabella delle medie per meeting
- `src/components/RatingsPanel.tsx`: ultime valutazioni
- `src/usePolling.ts`: aggiornamento automatico
- `src/styles.css`: stile

## Ticket

| | Ticket | Note |
|---|---|---|
| ✅ | F1. Setup Vite + React + FullCalendar + proxy | |
| ✅ | F2. Vista settimanale con colori per calendario | Aggiungete i vostri calendari in `CALENDAR_COLORS` |
| ✅ | F3. Pannello rating (rating + effort) | |
| 🟡 | F4. Matrice rating × effort | Versione base in SVG: rendetela più bella (animazioni, etichette con i nomi) |
| 🔲 | **F5. Evidenziare le modifiche di Claude** | Quando un evento viene creato o spostato, deve "lampeggiare" per qualche secondo. Confrontate la lista nuova con la precedente. **È il momento "wow" della demo** |
| 🔲 | F6. Colorare gli eventi passati per quadrante | Usate `/api/ratings` per sapere quali eventi hanno un rating |
| 🔲 | F7. Dettaglio evento | Al clic: partecipanti, calendario, eventuale rating ed effort |
| 🔲 | F8. Branding e stile | Logo, colori, nome del prodotto per il pitch |
| 🔲 | F9. Layout per la demo | Provatelo sullo schermo/proiettore della presentazione, affiancato a Claude Desktop |
