# Team Server MCP

Server MCP in **stdio** per Claude Desktop. Ogni tool chiama il backend via HTTP (`BACKEND_URL`, default `http://localhost:3001`).

```powershell
npm install
npm run inspector   # prova i tool nel browser con MCP Inspector (serve il backend avviato)
npm run typecheck
```

> ⚠️ In stdio `stdout` è riservato al protocollo: **mai `console.log`**, solo `console.error`.

## Collegarlo a Claude Desktop

1. Claude Desktop → Impostazioni → Sviluppatore → **Modifica configurazione** (apre `claude_desktop_config.json`)
2. Copiate il contenuto di `claude_desktop_config.example.json` e **correggete i percorsi** con quelli del vostro PC (su Windows servono le doppie barre `\\`)
3. Chiudete **completamente** Claude Desktop (anche dall'icona nella barra) e riapritelo
4. Nella chat dovreste vedere i tool di "smsa" nel menu degli strumenti

Il backend deve essere avviato (`cd backend && npm run dev`).

## Tool

| Tool | Cosa fa |
|---|---|
| `get_current_datetime` | Data/ora attuale, serve per interpretare "domani", "venerdì"… |
| `list_events` | Eventi di tutti i calendari |
| `create_event` / `update_event` / `delete_event` | Scritture (bloccate sugli eventi `readonly`) |
| `find_free_slots` | Slot liberi in un giorno |
| `rate_meeting` | Salva **rating** (utilità) ed **effort** (sforzo), 1-5 |
| `get_meeting_history` | Tutte le valutazioni con i dettagli |
| `get_meeting_insights` | Medie per meeting + quadrante |
| `predict_meetings` | Rating ed effort **previsti** per i meeting futuri non valutati: impara dai rating |
| `suggest_delegate` | Fino a 3 colleghi del team (dall'organigramma) a cui delegare un meeting |
| prompt `weekly_review` | Review guidata della settimana |

## Ticket

| | Ticket | Note |
|---|---|---|
| ✅ | M1. Setup SDK + stdio + client HTTP | |
| ✅ | M2. Mock | Il backend in modalità `MOCK=true` fa già da mock |
| 🔲 | **M3. Collegamento a Claude Desktop** | Su ogni PC del team, seguendo i passi sopra |
| ✅ | M4. Tool eventi | |
| ✅ | M5. Tool rating | |
| 🟡 | **M6. Descrizioni dei tool** | Prima versione scritta in `src/index.ts`. **È il lavoro più importante**: testate e migliorate |
| ✅ | M7. Data/ora corrente | |
| ✅ | M8. `find_free_slots` | |
| ✅ | M9. Errori leggibili per Claude | |
| ✅ | M10. `get_meeting_insights` | |
| 🔲 | **M11. Test dello script della demo** | Provate ogni frase del README principale 5 volte. Se Claude sbaglia tool o parametri, correggete la descrizione. Preparate 2-3 formulazioni alternative per ogni passo |
| ✅ | M12. Prompt `weekly_review` | |
| 🔲 | M13. Conferme | Verificate che Claude chieda conferma prima di cancellare o spostare eventi con altri partecipanti |
