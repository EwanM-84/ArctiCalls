-- ArctiCalls Supabase Schema
-- Run this in the Supabase SQL Editor

-- ── Contacts ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ArctiCalls_contacts" (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL DEFAULT auth.uid(),
  name         TEXT NOT NULL,
  phone        TEXT NOT NULL,
  email        TEXT,
  photo_url    TEXT,
  notes        TEXT,
  is_favourite BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE "ArctiCalls_contacts" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner only contacts"
  ON "ArctiCalls_contacts"
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── Recents ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ArctiCalls_recents" (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID NOT NULL DEFAULT auth.uid(),
  contact_id       UUID REFERENCES "ArctiCalls_contacts"(id) ON DELETE SET NULL,
  phone            TEXT NOT NULL,
  display_name     TEXT,
  direction        TEXT NOT NULL CHECK (direction IN ('outbound', 'missed')),
  duration_seconds INTEGER DEFAULT 0,
  started_at       TIMESTAMPTZ DEFAULT NOW(),
  ended_at         TIMESTAMPTZ,
  status           TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'missed', 'failed'))
);

ALTER TABLE "ArctiCalls_recents" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner only recents"
  ON "ArctiCalls_recents"
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
