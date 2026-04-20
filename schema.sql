-- Comments table for quake0day.com blog
-- Moderation: new comments land as 'pending', admin approves → 'approved' shows on frontend.

CREATE TABLE IF NOT EXISTS comments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  post_slug   TEXT    NOT NULL,
  name        TEXT    NOT NULL,
  email       TEXT,
  website     TEXT,
  body        TEXT    NOT NULL,
  status      TEXT    NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','approved','rejected')),
  ip          TEXT,
  user_agent  TEXT,
  created_at  INTEGER NOT NULL,
  reviewed_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_comments_slug_status ON comments(post_slug, status);
CREATE INDEX IF NOT EXISTS idx_comments_status      ON comments(status, created_at DESC);
