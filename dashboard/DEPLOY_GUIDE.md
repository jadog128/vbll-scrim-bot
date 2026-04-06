# 🚀 VRDL Scrim Dashboard — Free Deployment Guide

> [!IMPORTANT]
> This dashboard is **100% free** to host. It uses Next.js on Vercel (free tier) and your existing Turso database. No credit card required.

---

## What You're Building

```
[Discord Bot]  ──┐
                  ├──► [Turso DB] ◄──► [Next.js Dashboard on Vercel]
[Players]      ──┘                            ↑
                                    yourapp.vercel.app
```

Both the bot and the website share the **same Turso database**. Changes made on the website are instantly visible in Discord, and vice versa.

---

## Step 1 — Create a Discord OAuth2 Application

> [!NOTE]
> This is **separate** from your Scrim Bot app — it's just used for "Sign in with Discord" on the website.

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications)
2. Click **New Application** → name it (e.g. "VRDL Dashboard")
3. Go to **OAuth2** tab (left sidebar)
4. Copy the **Client ID** and **Client Secret** — save these for later
5. Under **Redirects**, click **Add Redirect**, and add:
   ```
   http://localhost:3000/api/auth/callback/discord
   ```
   *(You'll add your Vercel URL here later too)*
6. **Do NOT** add a bot to this application — it's OAuth only

---

## Step 2 — Set Up Your `.env.local` File

In the `dashboard/` folder, copy the example file:

```bash
copy .env.local.example .env.local
```

Then fill in your values:

| Variable | Where to find it |
|---|---|
| `TURSO_URL` | Your `.env.scrim` file (`SCRIM_TURSO_URL`) |
| `TURSO_TOKEN` | Your `.env.scrim` file (`SCRIM_TURSO_TOKEN`) |
| `DISCORD_CLIENT_ID` | OAuth2 app → Client ID |
| `DISCORD_CLIENT_SECRET` | OAuth2 app → Client Secret |
| `DISCORD_GUILD_ID` | Right-click your server → Copy Server ID |
| `NEXTAUTH_SECRET` | Run this in a terminal: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NEXTAUTH_URL` | `http://localhost:3000` for local dev |

---

## Step 3 — Test Locally

```bash
cd dashboard
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

- Public pages (Leaderboard, Shop, Upcoming) work for everyone
- Click **Sign In** → logs in with Discord
- Staff members with the **VRDL | Scrim Management** role see the admin tabs

---

## Step 4 — Push to GitHub

> [!TIP]
> Vercel deploys automatically every time you push to GitHub — no manual uploads needed.

```bash
# In the dashboard folder:
git init
git add .
git commit -m "Initial dashboard"
```

Then:
1. Go to [github.com/new](https://github.com/new)
2. Create a **new private repository** (e.g. `vrdl-scrim-dashboard`)
3. Follow the "push an existing repository" instructions GitHub shows you

---

## Step 5 — Deploy to Vercel (Free)

1. Go to [vercel.com](https://vercel.com) → Sign up with GitHub (free)
2. Click **Add New → Project**
3. Import your `vrdl-scrim-dashboard` repository
4. Vercel auto-detects Next.js — click **Deploy**
5. Once deployed, go to **Settings → Environment Variables** and add all the same variables from your `.env.local`:

| Name | Value |
|---|---|
| `TURSO_URL` | your turso URL |
| `TURSO_TOKEN` | your turso token |
| `DISCORD_CLIENT_ID` | your client ID |
| `DISCORD_CLIENT_SECRET` | your client secret |
| `DISCORD_GUILD_ID` | your server ID |
| `NEXTAUTH_SECRET` | same secret you generated |
| `NEXTAUTH_URL` | `https://your-project.vercel.app` |

6. Click **Redeploy** after adding env vars

> [!WARNING]
> Make sure `NEXTAUTH_URL` exactly matches your Vercel URL (no trailing slash).

---

## Step 6 — Add Your Vercel URL to Discord OAuth

1. Go back to your Discord OAuth2 app
2. Under **Redirects**, add:
   ```
   https://your-project.vercel.app/api/auth/callback/discord
   ```
3. Click **Save Changes**

---

## Pages Overview

| URL | Access | Description |
|---|---|---|
| `/` | Public | Home / navigation hub |
| `/leaderboard` | Public | Top 25 players by scrim points |
| `/shop` | Public | All active shop items |
| `/upcoming` | Public | Upcoming scrim events |
| `/login` | Public | Discord sign-in page |
| `/admin/claims` | Staff only | Approve / reject point claim requests |
| `/admin/redemptions` | Staff only | View all shop redemptions with filters |
| `/admin/shop` | Staff only | Add items, restock, remove items |

> [!NOTE]
> "Staff only" pages automatically redirect non-management users to the home page.

---

## Free Tier Limits

| Service | Free Tier | Likely Usage |
|---|---|---|
| **Vercel** | 100GB bandwidth / month, unlimited deploys | Far under limit |
| **Turso** | 9GB storage, 1B row reads/month | Far under limit |
| **Discord OAuth** | Unlimited | Free forever |

---

## Keeping It Updated

Whenever you change the dashboard code:

```bash
git add .
git commit -m "describe your change"
git push
```

Vercel automatically redeploys in ~30 seconds. ✅

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "Unauthorized" on admin pages | Make sure your Discord account has the Scrim Management role |
| Proof images not loading | Check that `next.config.ts` has the Discord CDN domains listed |
| Sign-in redirect error | Double-check the redirect URL is added to your Discord OAuth2 app |
| `NEXTAUTH_SECRET` error | Make sure the secret is set in both local `.env.local` AND Vercel env vars |
| Database not connecting | Copy `SCRIM_TURSO_URL` and `SCRIM_TURSO_TOKEN` from `.env.scrim` exactly |
