# SMSA — Calendario gestito da Claude

MVP per l'hackathon: un server MCP permette a **Claude** di gestire tutti i calendari
(Google + iCloud/ICS) e di valutare i meeting con due punteggi, **rating** ed **effort**.
La **web UI** mostra in tempo reale cosa succede.

```
Claude Desktop ──stdio──► mcp/ ──HTTP──► backend/ ──► Google Calendar (lettura + scrittura)
                                             │  └──► Calendari ICS / iCloud (sola lettura)
         frontend-next/ ──HTTP (/api)────────┤
                                             └──► db/ (SQLite: rating + effort)
                         shared/types.ts  ←  contratti comuni a tutti i team
```

## Struttura e team

| Cartella | Team | Cosa contiene |
|---|---|---|
| `shared/` | **tutti** | `types.ts` (Event, Rating, quadranti) e `time.ts` (date con fuso). Ogni modifica va concordata. |
| `db/` | Database | Schema SQLite, funzioni di accesso, seed e reset per la demo |
| `backend/` | Backend | API REST Express, connettori Google / ICS / mock |
| `mcp/` | Server MCP | Server MCP con 9 tool + 1 prompt per Claude Desktop |
| `frontend-next/` | Frontend | Next.js: calendario settimanale a schermo intero con utilità, effort e impact, dettaglio evento, attività di Claude. Vedi il suo README |

Ogni cartella ha il suo `README.md` con **i ticket del team** (✅ già fatto nello scheletro, 🔲 da fare).

## Requisiti

- **Node.js 22.13 o superiore** (serve per SQLite integrato): `node --version`
- Git

## Avvio rapido (modalità MOCK, senza Google)

Funziona subito con eventi finti: ogni team può lavorare senza aspettare gli altri.

```powershell
# 1. Database
cd db
npm install
npm run reset          # crea il DB e carica 18 meeting di esempio

# 2. Backend  (nuovo terminale)
cd backend
npm install
copy .env.example .env # su Mac/Linux: cp .env.example .env
npm run dev            # → http://localhost:3001/health

# 3. Frontend  (nuovo terminale)
cd frontend-next
npm install
copy .env.example .env.local   # poi mettete NEXT_PUBLIC_DATA_SOURCE=api (vedi frontend-next/README.md)
npm run dev            # → http://localhost:3000

# 4. Server MCP
cd mcp
npm install
# poi configurate Claude Desktop: vedi mcp/README.md
```

## Collegare Google Calendar a Claude Desktop

Il server MCP attuale usa il trasporto **stdio**: questa procedura collega SMSA a
Claude Desktop sul computer locale, non a Claude sul web.

### 1. Configurare Google Calendar API e OAuth

1. In [Google Cloud Console](https://console.cloud.google.com/), create o selezionate un progetto e abilitate **Google Calendar API**.
2. Configurate la schermata di consenso OAuth come **External** e, durante lo sviluppo, lasciatela in **Testing**. Aggiungete come test user l'account Google che userete.
3. Create un **OAuth Client ID** di tipo **Desktop app** e scaricate il file JSON.
4. Salvate il file come `backend/credentials.json`. Non condividetelo e non aggiungetelo a Git: contiene credenziali private.

### 2. Autorizzare il backend

Nel file `backend/.env` impostate `MOCK=false`. Se volete usare un calendario diverso da quello principale, impostate anche `GOOGLE_CALENDAR_ID`; per i percorsi personalizzati usate `GOOGLE_CREDENTIALS_PATH` e `GOOGLE_TOKEN_PATH`.

Da un terminale:

```powershell
cd backend
npm install
npm run auth
```

Aprite nel browser il link OAuth mostrato nel terminale, accedete con l'account aggiunto come test user e autorizzate l'accesso a Google Calendar. Al termine vengono creati `backend/token.json` e il callback locale sulla porta `3333` completa il login. Conservate il token come una credenziale: non condividetelo né committatelo.

### 3. Avviare il backend

Lasciate il backend attivo in un terminale:

```powershell
cd backend
npm run dev
```

Verificate `http://localhost:3001/health`: la risposta deve includere `"ok": true` e `"mock": false`. Avviate i comandi dalla cartella `backend`, così i percorsi OAuth relativi puntano ai file appena configurati.

### 4. Collegare Claude Desktop al server MCP

1. Installate le dipendenze MCP: in un altro terminale eseguite `cd mcp` e `npm install`.
2. In Claude Desktop aprite **Impostazioni → Sviluppatore → Modifica configurazione**.
3. Copiate le impostazioni da [mcp/claude_desktop_config.example.json](mcp/claude_desktop_config.example.json) nel file di configurazione aperto. Se il file contiene già altri server MCP, aggiungete solo la voce `smsa` sotto `mcpServers`.
4. Sostituite nei percorsi di `args` il percorso d'esempio con il percorso assoluto del progetto sul vostro computer. In JSON, su Windows, scrivete i separatori come `\\`. Lasciate `BACKEND_URL` su `http://localhost:3001` se non avete cambiato la porta.
5. Chiudete completamente Claude Desktop e riapritelo. I tool `smsa` dovrebbero apparire nel menu degli strumenti.
6. Con il backend ancora attivo, provate prima a chiedere a Claude di elencare gli eventi; verificate poi una modifica o una creazione sul calendario Google.

Le scritture e le eliminazioni agiscono davvero sul calendario Google autorizzato. Il connettore attualmente imposta `sendUpdates: "none"`, quindi non invia inviti o aggiornamenti ai partecipanti. Per i dettagli sulla configurazione MCP, consultate anche [mcp/README.md](mcp/README.md); per variabili e autenticazione Google, [backend/README.md](backend/README.md).

### Calendario pieno per mostrare la UI

Per far vedere il calendario con settimane piene di meeting invece degli eventi finti:

```powershell
cd db;      $env:SEED_FILE="../backend/example-data/calendario.json"; npm run reset
cd backend; # nel .env: MOCK_DATA_FILE=./example-data/calendario.json
            npm run dev
```

Lo script della demo qui sotto usa invece gli eventi finti: per tornarci, togliete `MOCK_DATA_FILE`
e rilanciate `npm run reset` senza `SEED_FILE`.

## Script della demo

Prima di ogni prova: `cd db && npm run reset`

1. **"Cosa ho domani?"** → Claude legge Google + iCloud (gli eventi iCloud hanno il lucchetto 🔒)
2. **"Com'è andato il daily di oggi? Inutile, ma mi ha stancato parecchio"** → Claude salva rating 1-2 ed effort 4 → compare nella UI
3. **"Quali meeting dovrei eliminare?"** → Claude usa la matrice rating × effort → *Weekly status report*
4. **"Cancella il prossimo weekly status report e spostami il daily di domani in uno slot libero"** → si aggiorna live nella UI
5. Bonus: prompt `weekly_review` da Claude Desktop

## Ordine di integrazione

1. Tutti partono in modalità MOCK (`MOCK=true` nel `.env` del backend)
2. Backend completa l'auth Google (B2) → `MOCK=false`
3. Prova end-to-end dello script della demo
4. Prove ripetute, sempre con `npm run reset` prima di ogni giro
