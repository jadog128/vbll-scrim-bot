# ⭐ VRDL Scrim Bot — Setup Guide

## Step 1 — Create a new Discord Bot

1. Go to https://discord.com/developers/applications
2. Click **New Application** → name it (e.g. "VRDL Scrim Bot")
3. Go to **Bot** tab → **Add Bot** → **Reset Token** → copy the token
4. Enable **Message Content Intent** under Privileged Gateway Intents
5. Go to **OAuth2 → URL Generator**:
   - Scopes: ✅ `bot`  ✅ `applications.commands`
   - Permissions: ✅ `Send Messages` ✅ `Embed Links` ✅ `Use Slash Commands` ✅ `Read Message History`
6. Open the generated URL and invite the bot to your server

---

## Step 2 — Configure your .env.scrim file

Copy `.env.scrim.example` to `.env.scrim` and fill in:

```
SCRIM_DISCORD_TOKEN=   ← your new scrim bot token
SCRIM_CLIENT_ID=       ← General Information → Application ID
SCRIM_GUILD_ID=        ← right-click your server → Copy Server ID
SCRIM_TURSO_URL=       ← your Turso DB URL (can reuse the existing one)
SCRIM_TURSO_TOKEN=     ← your Turso auth token
```

> **Note:** You can reuse your existing Turso database — the scrim bot uses
> completely separate tables (`scrim_points`, `scrim_shop`, etc.) so nothing
> will clash with the VRDL main bot.

---

## Step 3 — Install & Run

```bash
# Make sure you already ran: npm install  (discord.js + @libsql/client)

# Register slash commands (run once, or after adding new commands)
node scrim_deploy.js

# Start the scrim bot
node scrim.js
```

---

## Step 4 — First-time Setup (in Discord)

Run these commands in your server (requires Scrim Management role or Admin):

| Command | What to do |
|---|---|
| `/set-review-channel` | Run in the channel where claim requests should appear |
| `/set-redemption-channel` | Run in the channel where shop redemptions should appear |
| `/set-log-channel` | Run in the channel for point add/remove audit logs |
| `/add-item` | Add your first shop items |

---

## Commands Reference

### 👤 Player Commands

| Command | Description |
|---|---|
| `/claim-points <amount> <proof> <description>` | Submit a points request with a screenshot. Sent to management for approval. |
| `/points [@player]` | Check your points balance and rank (or another player's) |
| `/shop` | View all items available in the scrim shop |
| `/redeem <item_id>` | Spend your points on a shop item |
| `/leaderboard` | Top 15 scrim points leaderboard |

### 🔧 Management Commands
*(Requires **VRDL | Scrim Management** role ID `1482483477319516200` or higher)*

| Command | Description |
|---|---|
| `/add-points @player <amount> [reason]` | Manually add points to a player (they get a DM) |
| `/remove-points @player <amount> [reason]` | Remove points from a player |
| `/add-item <name> <cost> <description> [stock]` | Add a new item to the shop |
| `/remove-item <item_id>` | Remove an item from the shop |
| `/set-review-channel` | Set where claim requests are posted |
| `/set-redemption-channel` | Set where redemption requests are posted |
| `/set-log-channel` | Set where point logs are posted |

---

## How the Claim Flow Works

```
Player runs /claim-points  →  Request posted in review channel
                           →  Management clicks ✅ Approve or ❌ Reject
                           →  Player gets a DM with the result
                           →  Points added automatically on approval
```

## How the Shop Flow Works

```
Player runs /redeem  →  Points deducted immediately
                     →  Redemption posted in redemption channel
                     →  Management clicks ✅ Fulfil or ❌ Reject & Refund
                     →  Player gets a DM (points refunded if rejected)
```

---

## Running Both Bots Together

To run the VRDL main bot AND scrim bot at the same time, open two terminals:

```bash
# Terminal 1 — Main VRDL bot
node index.js

# Terminal 2 — Scrim bot
node scrim.js
```

Or use a process manager like PM2:
```bash
npm install -g pm2
pm2 start index.js --name "vrdl-main"
pm2 start scrim.js --name "vrdl-scrim"
pm2 save
pm2 startup
```
