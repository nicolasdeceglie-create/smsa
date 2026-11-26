// ============================================================
//  Ticket B2 — Login Google (da lanciare UNA volta):  npm run auth
//
//  Prerequisiti (Google Cloud Console):
//   1. Crea un progetto e abilita "Google Calendar API"
//   2. Schermata consenso OAuth: tipo "Esterno", stato "Testing",
//      aggiungi gli account del team come "Test users"
//   3. Credenziali → Crea ID client OAuth → tipo "App desktop"
//   4. Scarica il JSON e salvalo come backend/credentials.json
//
//  Questo script apre il login, riceve il codice su localhost
//  e salva backend/token.json (con refresh token).
// ============================================================
import { createServer } from "node:http";
import { readFileSync, writeFileSync } from "node:fs";
import { google } from "googleapis";
import { config } from "./config.ts";

const PORT = 3333;
const REDIRECT = `http://localhost:${PORT}`;
const SCOPES = ["https://www.googleapis.com/auth/calendar"];

const raw = JSON.parse(readFileSync(config.google.credentialsPath, "utf8"));
const { client_id, client_secret } = raw.installed ?? raw.web;
const oauth = new google.auth.OAuth2(client_id, client_secret, REDIRECT);

const url = oauth.generateAuthUrl({ access_type: "offline", prompt: "consent", scope: SCOPES });
console.log("\nApri questo link nel browser e fai il login:\n\n" + url + "\n");

const server = createServer(async (req, res) => {
  const code = new URL(req.url ?? "/", REDIRECT).searchParams.get("code");
  if (!code) { res.end("Nessun codice ricevuto."); return; }
  const { tokens } = await oauth.getToken(code);
  writeFileSync(config.google.tokenPath, JSON.stringify(tokens, null, 2));
  res.end("Login completato! Puoi chiudere questa pagina.");
  console.log(`Token salvato in ${config.google.tokenPath}`);
  server.close();
});
server.listen(PORT);
