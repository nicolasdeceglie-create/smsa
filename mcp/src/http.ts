// ============================================================
//  SMSA — Server MCP in modalità HTTP (Streamable HTTP).
//  Serve per usare SMSA da claude.ai e dall'app Claude sul cellulare:
//  claude.ai → ngrok → questo server (porta 3002) → backend (porta 3001)
//
//  Avvio:  npm.cmd run http
//  Poi:    ngrok http --url=<tuo-dominio>.ngrok-free.app 3002
//
//  Sicurezza: l'endpoint è /mcp/<MCP_SECRET>. Chi non conosce il segreto
//  riceve 404. Non condividete l'URL completo e spegnete ngrok dopo la demo.
// ============================================================
import "dotenv/config";
import express from "express";
import { randomBytes } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "./index.ts";

const PORT = Number(process.env.MCP_HTTP_PORT ?? 3002);

let secret = process.env.MCP_SECRET?.trim();
if (!secret || secret.length < 16) {
  secret = randomBytes(16).toString("hex");
  console.warn(
    "⚠️  MCP_SECRET mancante (o più corto di 16 caratteri) in mcp/.env: ne ho generato uno temporaneo.\n" +
    "   Cambierà al prossimo avvio. Copiate questa riga in mcp/.env per renderlo fisso:\n" +
    `   MCP_SECRET=${secret}\n`
  );
}
const MCP_PATH = `/mcp/${secret}`;

const app = express();
app.use(express.json({ limit: "1mb" }));

// Modalità "stateless": a ogni richiesta un server MCP nuovo.
// Semplice e robusto, va benissimo per un utente solo.
app.post(MCP_PATH, async (req, res) => {
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => {
    transport.close();
    server.close();
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("Errore MCP:", err);
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Errore interno" }, id: null });
    }
  }
});

// In stateless non ci sono stream GET né sessioni da chiudere
const notAllowed = (_req: express.Request, res: express.Response) => {
  res.status(405).set("Allow", "POST").json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed" }, id: null });
};
app.get(MCP_PATH, notAllowed);
app.delete(MCP_PATH, notAllowed);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Tutto il resto (anche chi prova /mcp senza segreto): 404
app.use((_req, res) => {
  res.status(404).end();
});

app.listen(PORT, () => {
  const domain = process.env.NGROK_DOMAIN?.trim();
  console.log(`SMSA MCP (HTTP) su http://localhost:${PORT}${MCP_PATH}`);
  console.log(`Backend usato: ${process.env.BACKEND_URL ?? "http://localhost:3001"}\n`);
  if (domain) {
    console.log("1. In un'altra finestra avvia ngrok:");
    console.log(`   ngrok http --url=${domain} ${PORT}\n`);
    console.log("2. URL da incollare su claude.ai → Impostazioni → Connettori → Aggiungi connettore personalizzato:");
    console.log(`   https://${domain}${MCP_PATH}\n`);
  } else {
    console.log(`Avvia ngrok:  ngrok http --url=<tuo-dominio>.ngrok-free.app ${PORT}`);
    console.log(`URL per il connettore claude.ai:  https://<tuo-dominio>.ngrok-free.app${MCP_PATH}`);
    console.log("(Mettete NGROK_DOMAIN in mcp/.env e qui comparirà l'URL completo.)\n");
  }
});
