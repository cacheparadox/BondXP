<p align="center">
  <img src="public/assets/logo.png" alt="BondXP Logo" width="180" />
</p>

# BondXP

A private, dual-user Progressive Web Application (PWA) designed for couples to turn daily habit-tracking and productivity into an affectionate, gamified shared experience. 

---

## 📖 Project Overview

**BondXP** establishes a unique productivity loop within a relationship. The app is split into two specialized roles:
1. **Task User**: Logs daily tasks (using presets or custom entries) to build streaks, gain XP, and grow a **Task Bank** balance. When milestones are met, the Task User can claim milestone rewards.
2. **Reward Giver**: Manages the custom reward store, reviews pending redemption requests (approving, scheduling, or rejecting them), and awards bonus task XP for special surprises.

By completing daily routines, the couple builds mutual appreciation, unlocks customizable real-world rewards, and strengthens their bond.

---

## ✨ Features

### ⚡ Task & Streak Engine
* **Dashboard PRESets**: Quick-add chips for daily routines (Gym, Work, Study, Coding, Reading, Water, Cleaning).
* **Floating XP Animation**: Beautiful micro-animations float up (`+1 TASK 📝`) when logging tasks.
* **Milestone Claim Engine**: Meet daily task goals (10 tasks) to qualify for streak milestones. The Task User can claim milestone rewards on milestone days (1, 3, 5, 7, 10, 12, 15, 18, 20, 25, 30 days) directly from the dashboard.
* **Midnight Reset**: Automatical streak reset at midnight if the daily task goal isn't met.

### 💖 Cute Corner (Shared Memory Stream)
* A private, co-shared dashboard for affection.
* Drop sweet notes, schedule surprises, and upload photos directly to Supabase Storage.
* Sends real-time **NTFY alerts** to your partner featuring the note text and love emojis.

### 🎁 Reward Store & Redemption Queue
* **Role-Based Store**: Givers can create, edit, delete, toggle active states, hide sensitive rewards, and drag-and-drop to reorder items.
* **Lock States & Cooldowns**: Enforces task-cost affordability and specific hour cooldowns before rewards can be re-claimed.
* **Redemption Approval**: Givers review requested redemptions in a queue to **Approve**, **Reject** (points are refunded), or **Schedule** them.

### 🎨 Personal Theme Customizer
* Dynamically adjust the app's primary accent color, background theme, and font pairings (Outfit, Poppins, Inter, Quicksand) with a real-time preview panel. Custom configurations are saved per couple session.

### 🔔 Robust Dual-Channel Notifications
* **Web Push (VAPID)**: Native browser push alerts for Android, Chrome, and desktop PWA installs.
* **NTFY Integration**: Instant private pushes with zero vendor lock-in. Features UTF-8 base64 title encoding to ensure emojis display flawlessly without causing server-side fetch exceptions.
* **GitHub Event Logging**: Dynamically logs system events (task completions, requests, approvals) to a remote GitHub repository's `events/` folder for third-party integrations.

---

## 🛠️ Tech Stack

* **Frontend**: Next.js 15 (App Router), React, TailwindCSS v3, Framer Motion (Animations), Recharts (Heatmaps & Analytics).
* **Backend**: Supabase (PostgreSQL, Auth, Row-Level Security, Database Triggers, and Storage Buckets).
* **PWA & SW**: Service workers optimized for offline caching and installations.
* **External APIs**: NTFY (Pushes), GitHub REST API (JSON logging).

---

## 🚀 Getting Started

### 1. Database Setup (Supabase)
Run the initialization scripts in your Supabase project's SQL Editor:
1. Execute [schema.sql](file:///c:/Sagar/Projects/AntiGravityProjects/BondXP/supabase/schema.sql) to set up tables, constraints, Row-Level Security (RLS) policies, and automatically register user triggers.
2. Execute [seed.sql](file:///c:/Sagar/Projects/AntiGravityProjects/BondXP/supabase/seed.sql) to seed default reward categories and streak milestone options.

### 2. Environment Configuration
Create a `.env.local` file in the root of the project with the following configuration:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key

# Web Push VAPID Keys
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key

# GitHub Push Event Integration (Optional)
GITHUB_TOKEN=your-personal-access-token-with-repo-scope
GITHUB_REPO=owner/repo
```

### 3. Installation
Install the project dependencies and launch the local development server:

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view your local deployment.

---

## 🔒 Security & Privacy

BondXP implements strict **Row-Level Security (RLS)** in PostgreSQL from day one:
* Users can only see their own profile and their paired partner's profile.
* All task entries, active streaks, task banks, and redemptions are locked to users within the same couple session.
* Intimate details uploaded to the "Cute Corner" are stored in a private Supabase bucket and are completely inaccessible to external users.
