# BondXP — Security & Data Privacy Guide (ELI5)

Welcome to the security guide for **BondXP**! This document explains how we keep your private relationship data, habits, and intimate rewards safe and secure. 

---

## 🔒 1. How is my data kept private? (The "Invisible Guard")

BondXP is built on **Supabase**, which uses a security engine called **Row-Level Security (RLS)**. 
Think of RLS as an invisible guard standing at the entrance to the database. Every time a request is made, the guard checks two things:
1. **Who are you?** (Are you logged in with a valid account?)
2. **What are you trying to see?** (Does this data belong to you or your partner?)

If a stranger attempts to read your tasks, rewards, or history, the guard immediately blocks them and returns an empty result—even if they know your email address or account ID.

---

## 🔗 2. How does pairing work? (Secret Handshake)

When you set up BondXP, you are paired using a **Secret Invite Code** (e.g., `A1B2C3D4`). 
- When one partner creates a new space, a unique `couple_sessions` record is generated in the database.
- When the other partner signs in and inputs that specific code, they are linked to the same `couple_session_id`.
- The database rules (RLS policies) are written so that users can **only** read and write data that is tagged with their shared `couple_session_id`.
- Because the invite codes are long and randomly generated, a third party cannot guess your code or "accidently" join your private space.

---

## 🔑 3. What is the Supabase "Anon Key" and is it safe?

You might see a public key in the project config (e.g., `NEXT_PUBLIC_SUPABASE_ANON_KEY`). 
* **Is it a secret?** No. The anon key is safe to be visible in the browser code.
* **Why?** The anon key only proves to Supabase that the request is coming from your app. It does **not** bypass the security guard (RLS). Even with the anon key, anyone trying to access data must still log in with a valid user account, and the RLS guard will still enforce that they can only see their own couple session.
* **What should be kept secret?** The Supabase **Service Role Key** (admin key) must *never* be placed in client-side code, as it bypasses all security guards. BondXP does not use this key in the frontend.

---

## 🔄 4. How to rotate keys if compromised

If you suspect your keys (like the Anon Key or database passwords) have been leaked:
1. Go to your **Supabase Dashboard** -> **Project Settings** -> **API**.
2. Scroll to the **JWT Settings** section and click **Generate a new JWT Secret**.
3. This will immediately invalidate all active user sessions and require rotating the client API keys.
4. Update your production `.env` variables with the new keys and redeploy.

---

## 👥 5. Expanding to more users (e.g., Poly / Multi-user groups)

Currently, BondXP is optimized as a private **dual-user** app (1 Task User + 1 Reward Giver). If you want to expand it to support 3+ users (e.g. polyamorous relationships, family circles, or multiple task trackers):
1. **Database Role Config**: Modify the `users.role` check constraint in `supabase/schema.sql` to support multiple roles, or let a couple session have multiple users with the same role.
2. **RLS Policies**: The existing policies are already designed around `couple_session_id`. This means if you add a third user to the same `couple_session_id`, they will automatically be able to see and interact with the group’s tasks and rewards.
3. **UI Adjustments**: Update the dashboards and store components to loop through multiple users' balances and display names rather than assuming a single partner relationship.

---

## 📋 6. Production Deployment Checklist

Before deploying BondXP live, ensure:
- [ ] RLS is enabled on all 12 tables (run `supabase/schema.sql`).
- [ ] Direct database access is disabled (only SSL connections allowed).
- [ ] Environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) are set inside your production hosting environment (e.g. Vercel, Netlify).
- [ ] A unique NTFY topic is chosen by the task user to keep notifications private.
