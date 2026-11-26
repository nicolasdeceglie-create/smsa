import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 3001),
  mock: (process.env.MOCK ?? "true").toLowerCase() === "true",
  /** Solo con MOCK=true: file JSON del gruppo DB da usare al posto degli eventi finti (es. ./example-data/calendario.json) */
  mockDataFile: process.env.MOCK_DATA_FILE || null,
  timezone: process.env.TIMEZONE ?? "Europe/Rome",
  /** Chi usa il calendario: deve essere nell'organigramma (backend/data/organigramma.json) */
  userEmail: process.env.USER_EMAIL ?? "marco.rossi@azienda.it",
  google: {
    credentialsPath: process.env.GOOGLE_CREDENTIALS_PATH ?? "./credentials.json",
    tokenPath: process.env.GOOGLE_TOKEN_PATH ?? "./token.json",
    calendarId: process.env.GOOGLE_CALENDAR_ID ?? "primary",
  },
  /** "Nome|URL,Nome|URL" → [{ name, url }] */
  icsFeeds: (process.env.ICS_FEEDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [name, url] = s.includes("|") ? s.split("|") : ["ICS", s];
      return { name: name.trim(), url: url.trim() };
    }),
  /** Orario lavorativo per gli slot liberi */
  workday: { start: "09:00", end: "18:00" },
};

/** Errore con status HTTP: il messaggio arriva fino a Claude, scrivetelo chiaro. */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
