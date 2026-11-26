// ============================================================
//  Organigramma di TechCore Solutions (data/organigramma.json, dal Drive del team).
//  Serve a sapere chi è l'utente, chi è nel suo team e chi pesa in una riunione.
// ============================================================
import { readFileSync } from "node:fs";
import { config } from "./config.ts";

export interface Employee {
  email: string;
  nome: string;
  ruolo: string;
  team: string;
  manager_email: string | null;
  seniority: "Executive" | "Lead" | "Senior" | "Mid" | "Junior";
  decision_autonomy: "alta" | "media" | "bassa";
  is_key_stakeholder: boolean;
  skills: string[];
  growth_areas: string[];
}

interface Client {
  email: string;
  nome: string;
  azienda: string;
  ruolo: string;
  is_key_stakeholder: boolean;
}

const org = JSON.parse(readFileSync(new URL("../data/organigramma.json", import.meta.url), "utf8")) as {
  employees: Employee[];
  external_clients: Client[];
};

/** Le persone che riportano direttamente all'utente: i possibili delegati. */
export const myTeam = (): Employee[] => org.employees.filter((e) => e.manager_email === config.userEmail);

/** Direzione o cliente chiave: la loro presenza rende critica una riunione. null se non pesa. */
export function keyStakeholder(email: string): string | null {
  const e = org.employees.find((x) => x.email === email);
  if (e?.seniority === "Executive") return `${e.nome} (${e.ruolo})`;
  const c = org.external_clients.find((x) => x.email === email);
  if (c?.is_key_stakeholder) return `${c.nome} (${c.ruolo} di ${c.azienda}, cliente chiave)`;
  return null;
}
