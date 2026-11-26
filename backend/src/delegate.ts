// ============================================================
//  Delega intelligente: chi del team può andare al meeting al posto dell'utente.
//  Criteri della traccia: competenze sul tema, autonomia decisionale se il
//  meeting è critico, crescita dei junior se non lo è, libero a calendario.
// ============================================================
import type { CalendarEvent, DelegateSuggestion } from "../../shared/types.ts";
import { myTeam } from "./org.ts";
import { words } from "./predict.ts";

/** Parole dei titoli che non somigliano al nome della skill */
const SYNONYMS: Record<string, string[]> = {
  db: ["database", "sql"],
  planning: ["project_management"],
  sprint: ["project_management"],
  roadmap: ["roadmap_prodotto"],
  onboarding: ["ux_ui", "user_research"],
  feedback: ["user_research"],
  rilascio: ["gestione_rilasci"],
  test: ["testing", "testing_automatico", "qa"],
};

/** Le skill che c'entrano con il titolo (stessa parola, stessa radice o sinonimo). */
function relevant(title: string, skills: string[]): string[] {
  const ws = [...words(title)];
  return skills.filter((skill) =>
    skill.split("_").some((part) =>
      ws.some((w) => w === part || (w.length >= 5 && part.length >= 5 && w.slice(0, 5) === part.slice(0, 5)))
    ) || ws.some((w) => SYNONYMS[w]?.includes(skill))
  );
}

const overlaps = (a: CalendarEvent, b: CalendarEvent) =>
  new Date(a.start) < new Date(b.end) && new Date(b.start) < new Date(a.end);

/** Fino a 3 colleghi, il migliore per primo. `others` = eventi dello stesso periodo, per la disponibilità. */
export function suggestDelegates(event: CalendarEvent, others: CalendarEvent[], critical: boolean): DelegateSuggestion[] {
  return myTeam()
    .filter((p) => !event.attendees.includes(p.email))
    .map((p) => {
      let score = 0;
      const reasons: string[] = [];

      const skills = relevant(event.title, p.skills);
      if (skills.length) {
        score += 3 * skills.length;
        reasons.push(`competenze sul tema: ${skills.join(", ")}`);
      }
      if (critical) {
        score += { alta: 3, media: 0, bassa: -3 }[p.decision_autonomy];
        if (p.seniority === "Lead") score += 1;
        reasons.push(`meeting critico, autonomia decisionale ${p.decision_autonomy}`);
      } else {
        const growth = relevant(event.title, p.growth_areas);
        if (growth.length) {
          score += 2;
          reasons.push(`occasione di crescita su ${growth.join(", ")}`);
        }
        if (p.seniority === "Junior") {
          score += 1;
          reasons.push("meeting poco critico: buona palestra per un junior");
        }
      }
      const available = !others.some((o) => o.id !== event.id && o.attendees.includes(p.email) && overlaps(o, event));
      if (available) reasons.push("nessun impegno in quell'orario");
      else {
        score -= 10;
        reasons.push("ha già un impegno in quell'orario");
      }

      return {
        email: p.email,
        nome: p.nome,
        ruolo: p.ruolo,
        seniority: p.seniority,
        decision_autonomy: p.decision_autonomy,
        available,
        score,
        reasons,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}
