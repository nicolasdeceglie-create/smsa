import { useState } from "react";
import { api } from "./api.ts";
import { usePolling } from "./usePolling.ts";
import { CalendarView } from "./components/CalendarView.tsx";
import { RatingsPanel } from "./components/RatingsPanel.tsx";
import { InsightsPanel } from "./components/InsightsPanel.tsx";
import { MatrixChart } from "./components/MatrixChart.tsx";

export default function App() {
  // Intervallo visibile nel calendario (aggiornato da FullCalendar quando cambi settimana)
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);

  const health = usePolling(api.health, [], 10_000);
  const events = usePolling(
    () => (range ? api.events(range.from, range.to) : Promise.resolve([])),
    [range?.from, range?.to]
  );
  const ratings = usePolling(api.ratings);
  const summary = usePolling(api.summary);

  const offline = health.error !== null;

  return (
    <div className="app">
      <header className="header">
        <h1>SMSA</h1>
        <span className="subtitle">Il tuo calendario, gestito da Claude</span>
        <div className="header-right">
          {health.data?.mock && <span className="badge badge-mock">MOCK</span>}
          <span className={`dot ${offline ? "dot-off" : "dot-on"}`} />
          <span className="muted">
            {offline ? "Backend non raggiungibile" : events.updatedAt ? `Aggiornato ${events.updatedAt.toLocaleTimeString("it-IT")}` : "…"}
          </span>
        </div>
      </header>

      <main className="layout">
        <section className="card calendar-card">
          <CalendarView events={events.data ?? []} onRangeChange={setRange} />
        </section>

        <aside className="side">
          <section className="card">
            <h2>Matrice rating × effort</h2>
            <MatrixChart summary={summary.data ?? []} />
          </section>
          <section className="card">
            <h2>Insight meeting</h2>
            <InsightsPanel summary={summary.data ?? []} />
          </section>
          <section className="card">
            <h2>Ultime valutazioni</h2>
            <RatingsPanel ratings={ratings.data ?? []} />
          </section>
        </aside>
      </main>
    </div>
  );
}
