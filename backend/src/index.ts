// ============================================================
//  Avvio:  npm run dev   →  http://localhost:3001
// ============================================================
import { config } from "./config.ts";
import { app } from "./app.ts";

app.listen(config.port, () => {
  console.log(`SMSA backend su http://localhost:${config.port}  (MOCK=${config.mock})`);
});
