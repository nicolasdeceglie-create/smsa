// Svuota il database e riesegue il seed.
// Da lanciare PRIMA DI OGNI PROVA della demo:  npm run reset
import { clearAll } from "./db.ts";
import { seed } from "./seed.ts";

clearAll();
console.log("Database svuotato.");
seed();
