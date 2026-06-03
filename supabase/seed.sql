-- ============================================================
-- BondXP — Seed Data
-- Run AFTER schema.sql
-- ============================================================

-- NOTE: rewards are seeded without a couple_session_id.
-- These are template rewards cloned per couple on first login.

INSERT INTO rewards (title, description, category, cost, reward_type, icon, active, hidden, cooldown_hours, sort_order) VALUES

-- ── INTIMACY ─────────────────────────────────────────────────────
('Hugs & Kisses',     'Full hugs and kisses.',                        'Intimacy',   3,   'redemption', '🤗', TRUE, FALSE, 0,   1),
('Tinglies',          '5 minutes of head tinglies / light touches.',  'Intimacy',   10,  'redemption', '✨', TRUE, FALSE, 0,   2),
('Caressing',         '10 minutes of slow, gentle caressing.',        'Intimacy',   7,   'redemption', '👐', TRUE, FALSE, 0,   3),
('Hair Brushing',     'Brushing hair — relaxing and tender.',         'Intimacy',   5,   'redemption', '💆', TRUE, FALSE, 0,   4),

-- ── SEXUAL ───────────────────────────────────────────────────────
('Cock Touches',      '3 intentional touches, no rush.',              'Sexual',     5,   'redemption', '✋', TRUE, FALSE, 12,  10),
('Playing with Boobs','5 touches — soft and unhurried.',              'Sexual',     10,  'redemption', '👙', TRUE, FALSE, 12,  11),
('Nudes',             '3 pictures of your choice.',                   'Sexual',     15,  'redemption', '📸', TRUE, FALSE, 24,  12),

-- ── CUTE ─────────────────────────────────────────────────────────
('Riddles / Quiz',    'A custom riddle or quiz — winner gets a wish.',  'Cute',     10,  'redemption', '🧩', TRUE, FALSE, 0,   20),
('Voice Note',        'A sweet voice note under 1 minute.',           'Cute',       5,   'redemption', '🎤', TRUE, FALSE, 0,   21),
('Crafts',            'A handmade craft of his choice.',               'Cute',      20,  'redemption', '🎨', TRUE, FALSE, 0,   22),

-- ── ACTS OF SERVICE ──────────────────────────────────────────────
('Washing Dishes',    'All dishes washed — only if you cooked.',      'Acts of Service', 50,  'redemption', '🍽️', TRUE, FALSE, 0,  30),
('Cooking a Meal',    'A basic home-cooked meal of his choice.',      'Acts of Service', 20,  'redemption', '👩‍🍳', TRUE, FALSE, 0,  31),

-- ── MONETARY ─────────────────────────────────────────────────────
('Kinder Joy',        'A Kinder Joy, delivered with love.',            'Monetary',  10,  'redemption', '🍫', TRUE, FALSE, 0,   40),
('Clothes',           'One clothing item of his choice.',              'Monetary',  300, 'redemption', '👕', TRUE, FALSE, 168, 41),
('RC Car',            'An RC car of his choice.',                      'Monetary',  400, 'redemption', '🚗', TRUE, FALSE, 168, 42),
('Lego Set',          'A Lego set of his choice.',                     'Monetary',  600, 'redemption', '🧱', TRUE, FALSE, 168, 43),
('Anything Expensive','Any gift within reason — no budget cap.',       'Monetary',  900, 'redemption', '💎', TRUE, FALSE, 720, 44),

-- ── OUTINGS ──────────────────────────────────────────────────────
('Small Surprise Outing',   'A small surprise outing planned by you.',         'Outings', 70,  'redemption', '🚶', TRUE, FALSE, 0,   50),
('Café Date',               'A café or coffee date — fully paid by you.',      'Outings', 140, 'redemption', '☕', TRUE, FALSE, 0,   51),
('Casual Restaurant Date',  'A proper sit-down restaurant date.',              'Outings', 180, 'redemption', '🍽️', TRUE, FALSE, 0,  52),
('Adventure Outing',        'Arcade, amusement park, or similar adventure.',   'Outings', 450, 'redemption', '🎢', TRUE, FALSE, 0,   53),

-- ── SPECIAL ──────────────────────────────────────────────────────
('Cosplay',           'Full cosplay outfit of his choice, worn for him.',   'Special', 150, 'redemption', '🎭', TRUE, FALSE, 168, 60),

-- ── STREAK MILESTONE REWARDS (reward_type = 'streak', cost = day number) ──
('Short Love Note',        'Day 1 streak reward.',   'Streak', 1, 'streak', '💌', TRUE, FALSE, 0, 100),
('Cuddles',                'Day 3 streak reward.',   'Streak', 3, 'streak', '🤗', TRUE, FALSE, 0, 103),
('Massage',                'Day 5 streak reward.',   'Streak', 5, 'streak', '💆', TRUE, FALSE, 0, 105),
('Sleeping Naked',         'Day 7 streak reward.',   'Streak', 7, 'streak', '🌙', TRUE, FALSE, 0, 107),
('HJ / BJ',                'Day 10 streak reward.',  'Streak', 10, 'streak', '💦', TRUE, FALSE, 0, 110),
('Crafts / DIY',           'Day 12 streak reward.',  'Streak', 12, 'streak', '🎨', TRUE, FALSE, 0, 112),
('Timestop',               'Day 15 streak reward.',  'Streak', 15, 'streak', '⏱️', TRUE, FALSE, 0, 115),
('Surprise Small Gift',    'Day 18 streak reward.',  'Streak', 18, 'streak', '🎁', TRUE, FALSE, 0, 118),
('Free-use Session',       'Day 20 streak reward.',  'Streak', 20, 'streak', '🎭', TRUE, FALSE, 0, 120),
('Special Outfit',         'Day 25 streak reward.',  'Streak', 25, 'streak', '👗', TRUE, FALSE, 0, 125),
('Extended Care Session',  'Day 30 streak reward.',  'Streak', 30, 'streak', '💆‍♀️', TRUE, FALSE, 0, 130);
