# BondXP — Usage & Deployment Guide

This guide explains how to test, use, and deploy **BondXP** live using Supabase, GitHub, and Vercel.

---

## 🛠️ 1. Local Development & Workflow

### Prerequisites
1. **Node.js**: Ensure Node.js (v18+) is installed.
2. **Supabase Project**: You need an active Supabase project.

### Quick Start
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
   *Note: Next.js dev scripts run with `--webpack` to support the PWA plugin (`next-pwa` requires webpack compilation).*
3. Open `http://localhost:3000` in your browser.

---

## 👥 2. How the Dual-User (Giver / User) System Works

BondXP uses a **paired role system** mapped via invite codes.

```mermaid
graph TD
    A[Partner A - Initiator] -->|Logs in & Picks Role| B(Create Session)
    B -->|Generates Invite Code| C[Invite Code: e.g. FE39A82X]
    D[Partner B - Joiner] -->|Logs in & Enteres Code| E(Join Session)
    E -->|Successfully Paired| F[Shared Relationship Space]
```

### Roles
1. **Task User (Productivity Partner)**:
   * Logs completed tasks using presets or custom titles.
   * Secures a daily streak by completing 10 tasks before midnight.
   * Earns XP (banked available tasks).
   * Claims streak milestone rewards (Day 1, 3, 5, 7, 10, etc.) on qualification days.
   * Redeems store rewards, creating pending redemptions.
2. **Reward Giver (Affection Partner)**:
   * Reviews the pending redemptions queue to **Approve**, **Schedule**, or **Reject** (which refunds task XP back to the Task User).
   * Gifts bonus tasks (XP) to reward unexpected support or romance.
   * Manages the reward catalog (adds custom items, hides/shows categories).

### Local testing (User & Giver together)
To test both dashboards side-by-side on your local machine:
1. Open one standard browser window (e.g. Chrome) and log in. Pair/choose **Task User**.
2. Open an **Incognito window** or a different browser (e.g. Edge, Firefox) and log in with a different email. Enter the creator's invite code and select **Reward Giver**.
3. Now you can log tasks in Chrome, see the XP grow, request a redemption, and immediately approve/reject it in the Giver screen in Edge!

---

## ⚙️ 3. Managing Rewards (Adding, Reordering, Enable/Disable)

All reward management is controlled by the **Reward Giver** from the **Rewards** page (`/rewards` path):

1. **Adding a Reward**:
   * Click **Add Reward** at the top right.
   * Select a category, add a title, description, cost (in completed tasks), icon (emoji), and cooldown hours.
2. **Enabling / Deactivating**:
   * Click the **Toggle Switch** (toggle right icon) on any reward card.
   * Deactivated rewards display with a dotted border and are disabled in the Task User's store.
3. **Visibility Toggles (Hide / Show)**:
   * Click the **Eye / EyeOff** icon.
   * If hidden, the item is completely invisible in the Task User's store (perfect for planning surprise rewards!).
4. **Custom Reordering**:
   * Use the **Up and Down Arrows** on the right side of the card.
   * Reordering updates the `sort_order` in the database immediately, syncing the store view.
5. **Deleting**:
   * Click the red **Trash Can** icon to permanently delete the reward from the catalog.

---

## 🚀 4. Production Deployment: GitHub & Vercel

Since this repo will be hosted on GitHub, **never commit your `.env.local` file**. The `.gitignore` is already configured to exclude it.

### Step 1: Push Code to GitHub
1. Create a private repository on GitHub (private is recommended since relationship configurations can be intimate).
2. Push your local files to GitHub:
   ```bash
   git remote add origin https://github.com/your-username/bondxp.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Supabase Schema Deployment
Ensure you've run the SQL scripts in your Supabase SQL editor:
1. Run [schema.sql](file:///c:/Sagar/Projects/AntiGravityProjects/BondXP/supabase/schema.sql) first to set up the tables and RLS security.
2. Run [seed.sql](file:///c:/Sagar/Projects/AntiGravityProjects/BondXP/supabase/seed.sql) to add the initial catalog.

### Step 3: Deploy to Vercel
1. Log into your [Vercel Dashboard](https://vercel.com).
2. Click **Add New** -> **Project**.
3. Import your `BondXP` repository from GitHub.
4. Expand **Environment Variables** and copy the values from your local `.env.local` file:

| Vercel Key | Exact Source Location | Description / Format |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | **Supabase Dashboard** -> **Project Settings** -> **API** -> **Project URL** | The URL of your Supabase project (already in your local `.env.local` line 1). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Supabase Dashboard** -> **Project Settings** -> **API** -> **Project API Keys** (`anon public`) | The public key for client access (already in your local `.env.local` line 2). |
| `SUPABASE_SERVICE_ROLE_KEY` | **Supabase Dashboard** -> **Project Settings** -> **API** -> **Project API Keys** (`service_role secret`) | Secret administrative bypass key. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | **Your local `.env.local` file** (Line 6) | Public VAPID key we generated for PWA push messaging. |
| `VAPID_PRIVATE_KEY` | **Your local `.env.local` file** (Line 7) | Secret VAPID key we generated for PWA push messaging. |
| `VAPID_EMAIL` | **Your custom value** | Formatted as `mailto:your-email@domain.com` (tells push servers who sent it). |
| `NEXT_PUBLIC_APP_URL` | **Vercel Deployment Dashboard** | The final live URL of your deployed Vercel app (e.g., `https://bondxp.vercel.app`). |

5. Click **Deploy**. Vercel will build the Next.js app and take it live!

---

## 🔔 5. Setting Up Push Notifications (NTFY)

To enable instant push notifications without dealing with browser service worker permissions:
1. Install the **NTFY App** on your phone ([Google Play](https://play.google.com/store/apps/details?id=io.heckel.ntfy) or [iOS App Store](https://apps.apple.com/us/app/ntfy-push-notifications/id1625396347)).
2. Go to **Settings** (`/settings`) on BondXP.
3. In the **Push Notifications (NTFY)** card, enter a unique, private topic name (e.g. `bondxp-ourspace-84931`). Click **Save**.
4. In the mobile NTFY app, tap **Subscribe to topic** and enter that exact topic name.
5. You'll now receive instant notifications on your phone whenever your partner logs a task, requests a wish, or claims a milestone!

---

## 📧 6. Customizing Supabase Email Templates & Redirect URLs

To fix bleak emails and avoid being redirected to `localhost:3000` instead of your live Vercel app:

### 🔗 Part A: Fixing Redirect URLs
By default, Supabase sends confirmation links pointing to your local environment. To update this:
1. Go to the **Supabase Dashboard** -> **Authentication** -> **Redirect URLs** (under URL Configuration).
2. Change the **Site URL** field from `http://localhost:3000` to your live app URL: `https://bond-xp.vercel.app`.
3. In the **Redirect URLs** list below it, add `http://localhost:3000/**` so that you can still log in locally during testing.

### 🎨 Part B: Beautifying Email Templates
Copy and paste these stylized HTML templates into your **Supabase Dashboard** -> **Authentication** -> **Email Templates**:

#### 1. Signup / Confirmation Template
Change the body to:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { background-color: #121212; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; color: #ffffff; }
    .wrapper { padding: 40px 20px; text-align: center; background-color: #121212; }
    .container { max-width: 480px; margin: 0 auto; background-color: #1e1e1e; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 24px; padding: 40px 30px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5); }
    .heart { font-size: 48px; margin: 0 0 20px 0; }
    h1 { font-size: 22px; font-weight: 800; color: #ffffff; margin: 0 0 10px 0; }
    p { font-size: 14px; line-height: 1.6; color: rgba(255, 255, 255, 0.6); margin: 0 0 30px 0; }
    .btn { display: inline-block; background-color: #ff4d8d; color: #ffffff !important; text-decoration: none; font-size: 14px; font-weight: 750; padding: 14px 32px; border-radius: 16px; box-shadow: 0 4px 15px rgba(255, 77, 141, 0.3); }
    .footer { font-size: 11px; color: rgba(255, 255, 255, 0.3); margin-top: 30px; border-top: 1px solid rgba(255, 255, 255, 0.05); padding-top: 20px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="heart">💖</div>
      <h1>Welcome to BondXP</h1>
      <p>Your private, relationship-powered productivity reward space is ready. Open the button to access your app.</p>
      <a href="{{ .ConfirmationURL }}" class="btn">Enter Space</a>
      <div class="footer">
        Sent for BondXP.
      </div>
    </div>
  </div>
</body>
</html>
```

#### 2. Magic Link Template
Change the body to:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { background-color: #121212; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; color: #ffffff; }
    .wrapper { padding: 40px 20px; text-align: center; background-color: #121212; }
    .container { max-width: 480px; margin: 0 auto; background-color: #1e1e1e; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 24px; padding: 40px 30px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5); }
    .spark { font-size: 48px; margin: 0 0 20px 0; }
    h1 { font-size: 22px; font-weight: 800; color: #ffffff; margin: 0 0 10px 0; }
    p { font-size: 14px; line-height: 1.6; color: rgba(255, 255, 255, 0.6); margin: 0 0 30px 0; }
    .btn { display: inline-block; background-color: #ff4d8d; color: #ffffff !important; text-decoration: none; font-size: 14px; font-weight: 750; padding: 14px 32px; border-radius: 16px; box-shadow: 0 4px 15px rgba(255, 77, 141, 0.3); }
    .footer { font-size: 11px; color: rgba(255, 255, 255, 0.3); margin-top: 30px; border-top: 1px solid rgba(255, 255, 255, 0.05); padding-top: 20px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="spark">✨</div>
      <h1>Log In to BondXP</h1>
      <p>Open the button to join your partner in the app.</p>
      <a href="{{ .ConfirmationURL }}" class="btn">Log In</a>
      <div class="footer">
        Sent for BondXP.
      </div>
    </div>
  </div>
</body>
</html>
```
