import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import type { CalendarEvent } from "../../../shared/types.ts";

/** Un colore per calendario (F2). Aggiungete qui i vostri calendari. */
const CALENDAR_COLORS: Record<string, string> = {
  Lavoro: "#3b6fd8",
  Google: "#3b6fd8",
  "iCloud personale": "#8e5bd6",
};
const FALLBACK_COLORS = ["#2f9e6e", "#d9822b", "#c2417a", "#4a90a4"];

function colorFor(calendar: string): string {
  if (CALENDAR_COLORS[calendar]) return CALENDAR_COLORS[calendar];
  const hash = [...calendar].reduce((a, c) => a + c.charCodeAt(0), 0);
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
}

interface Props {
  events: CalendarEvent[];
  onRangeChange: (r: { from: string; to: string }) => void;
}

export function CalendarView({ events, onRangeChange }: Props) {
  return (
    <FullCalendar
      plugins={[timeGridPlugin, dayGridPlugin]}
      initialView="timeGridWeek"
      locale="it"
      firstDay={1}
      height="100%"
      nowIndicator
      allDaySlot={false}
      slotMinTime="07:00:00"
      slotMaxTime="23:00:00"
      scrollTime="08:30:00"
      headerToolbar={{ left: "prev,next today", center: "title", right: "timeGridWeek,timeGridDay,dayGridMonth" }}
      buttonText={{ today: "Oggi", week: "Settimana", day: "Giorno", month: "Mese" }}
      datesSet={(info) => onRangeChange({ from: info.start.toISOString(), to: info.end.toISOString() })}
      events={events.map((e) => ({
        id: e.id,
        title: e.readonly ? `🔒 ${e.title}` : e.title,
        start: e.start,
        end: e.end,
        backgroundColor: colorFor(e.calendar),
        borderColor: colorFor(e.calendar),
        extendedProps: { calendar: e.calendar, attendees: e.attendees },
        // TODO (F5): evidenziare l'evento appena creato/modificato da Claude
        //   (confrontate la lista nuova con la precedente e aggiungete una classe CSS "flash")
      }))}
      eventDidMount={(info) => {
        const { calendar, attendees } = info.event.extendedProps as { calendar: string; attendees: string[] };
        info.el.title = `${info.event.title}\n${calendar}${attendees.length ? `\n${attendees.join(", ")}` : ""}`;
      }}
    />
  );
}
