-- ============================================================
--  Schema SQLite di SMSA
-- ============================================================

-- Copia "fotografata" degli eventi valutati.
-- Serve perché un rating deve avere titolo/data/partecipanti
-- anche se l'evento originale su Google viene cancellato.
CREATE TABLE IF NOT EXISTS events_cache (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  start       TEXT NOT NULL,
  end         TEXT NOT NULL,
  attendees   TEXT NOT NULL DEFAULT '[]',   -- JSON array di email
  source      TEXT NOT NULL DEFAULT 'google',
  calendar    TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS ratings (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id    TEXT NOT NULL REFERENCES events_cache(id),
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  effort      INTEGER NOT NULL CHECK (effort BETWEEN 1 AND 5),
  note        TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_ratings_event ON ratings(event_id);
