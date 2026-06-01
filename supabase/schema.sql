-- ============================================================
-- BondXP — Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================================
-- IMPORTANT: Enable Anonymous Sign-ins in Supabase Dashboard:
--   Authentication → Providers → Anonymous → Enable
-- Users log in with just a username (no email required).
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- COUPLE_SESSIONS — the shared relationship space
-- ============================================================
CREATE TABLE couple_sessions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invite_code  TEXT UNIQUE NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USERS — both Task User and Reward Giver
-- ============================================================
CREATE TABLE users (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email             TEXT,                          -- NULL for anonymous users
  display_name      TEXT NOT NULL,                 -- username chosen at login
  role              TEXT CHECK (role IN ('task_user', 'reward_giver')) DEFAULT 'task_user',
  couple_session_id UUID REFERENCES couple_sessions(id),
  avatar_url        TEXT,
  timezone          TEXT DEFAULT 'UTC',
  ntfy_topic        TEXT,                          -- NTFY push topic (optional)
  theme_config      JSONB DEFAULT '{}',             -- color/font customization
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PUSH_SUBSCRIPTIONS — Web Push VAPID subscriptions
-- ============================================================
CREATE TABLE push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TASKS — completed tasks logged by Task User
-- ============================================================
CREATE TABLE tasks (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID REFERENCES users(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  description       TEXT,
  category          TEXT,
  icon              TEXT,
  note              TEXT,
  completed_at      TIMESTAMPTZ DEFAULT NOW(),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DAILY_PROGRESS — one record per user per day
-- ============================================================
CREATE TABLE daily_progress (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID REFERENCES users(id) ON DELETE CASCADE,
  date              DATE NOT NULL,
  tasks_completed   INT DEFAULT 0,
  streak_qualified  BOOLEAN DEFAULT FALSE,
  UNIQUE (user_id, date)
);

-- ============================================================
-- STREAKS — current and historical streak data
-- ============================================================
CREATE TABLE streaks (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  current_streak        INT DEFAULT 0,
  longest_streak        INT DEFAULT 0,
  last_completion_date  DATE,
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STREAK_REWARD_CLAIMS
-- Tracks which streak reward the user picked on each milestone day.
--
-- Mechanic:
--   When a user hits a milestone (or any day their streak >= a milestone),
--   they may pick ONE reward from all milestones at or below their streak.
--   One claim per streak-qualification date, no stacking.
-- ============================================================
CREATE TABLE streak_reward_claims (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  claimed_date    DATE NOT NULL,            -- the qualification date (local)
  streak_at_claim INT NOT NULL,             -- streak value when claim was made
  milestone_days  INT NOT NULL,             -- which milestone reward was chosen
  milestone_title TEXT NOT NULL,            -- snapshot of the reward title
  milestone_icon  TEXT,                     -- snapshot of the reward icon
  claimed_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, claimed_date)            -- one claim per day, enforced at DB level
);

-- ============================================================
-- TASK_BANK — lifetime accumulated tasks for redemption
-- ============================================================
CREATE TABLE task_bank (
  user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  lifetime_tasks  INT DEFAULT 0,
  spent_tasks     INT DEFAULT 0,
  available_tasks INT GENERATED ALWAYS AS (lifetime_tasks - spent_tasks) STORED
);

-- ============================================================
-- REWARDS — the reward catalog
-- ============================================================
CREATE TABLE rewards (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_session_id UUID REFERENCES couple_sessions(id),
  title          TEXT NOT NULL,
  description    TEXT,
  category       TEXT NOT NULL,
  cost           INT NOT NULL,
  reward_type    TEXT CHECK (reward_type IN ('streak', 'redemption')) DEFAULT 'redemption',
  icon           TEXT,
  cooldown_hours INT DEFAULT 0,
  hidden         BOOLEAN DEFAULT FALSE,
  active         BOOLEAN DEFAULT TRUE,
  sort_order     INT DEFAULT 0,
  created_by     UUID REFERENCES users(id),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- REDEMPTIONS — reward redemption requests & history
-- ============================================================
CREATE TABLE redemptions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reward_id    UUID REFERENCES rewards(id),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  status       TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'scheduled')) DEFAULT 'pending',
  redeemed_at  TIMESTAMPTZ DEFAULT NOW(),
  approved_at  TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  notes        TEXT,
  cost_at_time INT -- snapshot cost at redemption time
);

-- ============================================================
-- NOTIFICATIONS — in-app notification log
-- ============================================================
CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  read       BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ANALYTICS — monthly rollup snapshots
-- ============================================================
CREATE TABLE analytics (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID REFERENCES users(id) ON DELETE CASCADE,
  month             DATE NOT NULL, -- first day of month
  streak_days       INT DEFAULT 0,
  tasks_completed   INT DEFAULT 0,
  rewards_redeemed  INT DEFAULT 0,
  UNIQUE (user_id, month)
);

-- ============================================================
-- ROW-LEVEL SECURITY
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE streak_reward_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE couple_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER: get current user's couple_session_id without RLS
-- SECURITY DEFINER bypasses RLS to break infinite recursion
-- ============================================================
CREATE OR REPLACE FUNCTION get_my_couple_session_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT couple_session_id FROM users WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM users WHERE id = auth.uid() LIMIT 1;
$$;

-- Users: can read their own row + their partner's (same couple_session)
CREATE POLICY "users_select_own_couple" ON users
  FOR SELECT USING (
    auth.uid() = id
    OR couple_session_id = get_my_couple_session_id()
  );

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "users_insert_own" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Tasks: task user sees own; reward giver sees partner's
CREATE POLICY "tasks_couple_access" ON tasks
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE couple_session_id = get_my_couple_session_id()
    )
  );

CREATE POLICY "tasks_insert_own" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Daily progress: couple can view
CREATE POLICY "daily_progress_couple" ON daily_progress
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE couple_session_id = get_my_couple_session_id()
    )
  );

CREATE POLICY "daily_progress_upsert_own" ON daily_progress
  FOR ALL USING (auth.uid() = user_id);

-- Streaks: couple can view
CREATE POLICY "streaks_couple" ON streaks
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE couple_session_id = get_my_couple_session_id()
    )
  );

CREATE POLICY "streaks_update_own" ON streaks
  FOR ALL USING (auth.uid() = user_id);

-- Streak reward claims: task user can insert own; couple can view
CREATE POLICY "streak_claims_own_insert" ON streak_reward_claims
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "streak_claims_couple_select" ON streak_reward_claims
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE couple_session_id = get_my_couple_session_id()
    )
  );

-- Task bank: couple members can read and update
CREATE POLICY "task_bank_couple_all" ON task_bank
  FOR ALL USING (
    user_id IN (
      SELECT id FROM users WHERE couple_session_id = get_my_couple_session_id()
    )
  );

-- Rewards: couple sees all active (hidden rewards only visible to reward_giver)
CREATE POLICY "rewards_couple" ON rewards
  FOR SELECT USING (
    couple_session_id = get_my_couple_session_id()
    AND (
      hidden = FALSE
      OR get_my_role() = 'reward_giver'
    )
  );

CREATE POLICY "rewards_giver_manage" ON rewards
  FOR ALL USING (
    get_my_role() = 'reward_giver'
    AND couple_session_id = get_my_couple_session_id()
  );

-- Redemptions: couple can view
CREATE POLICY "redemptions_couple" ON redemptions
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE couple_session_id = get_my_couple_session_id()
    )
  );

CREATE POLICY "redemptions_task_user_insert" ON redemptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "redemptions_giver_update" ON redemptions
  FOR UPDATE USING (get_my_role() = 'reward_giver');

-- Notifications: own only
CREATE POLICY "notifications_own" ON notifications
  FOR ALL USING (auth.uid() = user_id);

-- Analytics: couple can view
CREATE POLICY "analytics_couple" ON analytics
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE couple_session_id = get_my_couple_session_id()
    )
  );

CREATE POLICY "analytics_own" ON analytics
  FOR ALL USING (auth.uid() = user_id);

-- Push subscriptions: own only
CREATE POLICY "push_subs_own" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Couple sessions: any authenticated user can read (needed for invite code lookup + INSERT RETURNING)
CREATE POLICY "couple_sessions_select" ON couple_sessions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "couple_sessions_insert" ON couple_sessions
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create task_bank + streak rows when a user is inserted
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO task_bank (user_id, lifetime_tasks, spent_tasks)
    VALUES (NEW.id, 0, 0)
    ON CONFLICT DO NOTHING;
  INSERT INTO streaks (user_id)
    VALUES (NEW.id)
    ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_created
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-generate invite code for couple_session
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
BEGIN
  RETURN UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
END;
$$ LANGUAGE plpgsql;

ALTER TABLE couple_sessions ALTER COLUMN invite_code SET DEFAULT generate_invite_code();
