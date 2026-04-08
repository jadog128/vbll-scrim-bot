# VBLL Batch Bot - Porting Guide

This folder contains a standalone version of the VBLL Batch Bot.

## 🚀 Setup Instructions

1.  **Install Dependencies**:
    Open a terminal in this folder and run:
    ```bash
    npm install
    ```

2.  **Configure Environment**:
    Open the `.env` file and fill in your new credentials:
    -   `BATCH_DISCORD_TOKEN`: Your new bot's token.
    -   `BATCH_CLIENT_ID`: Your new bot's Application ID.
    -   `TURSO_URL`: The URL of your Turso database.
    -   `TURSO_TOKEN`: The auth token for your Turso database.

3.  **Update Server-Specific IDs**:
    Open `batch.js` and look for the following lines to update for your new server:
    -   **Line 89**: `const ADMIN_ROLE_ID` — Change this to your new server's Admin Role ID.
    -   **Line 91**: `if (member.id === '...')` — Change this to your own Discord User ID to ensure you have owner access.

4.  **Register Commands**:
    Run the following command once to set up the slash commands in your new Discord server:
    ```bash
    npm run deploy
    ```

5.  **Start the Bot**:
    ```bash
    npm start
    ```

## 📋 Features
- **Two-Stage Verification**: Users submit via buttons/DMs, Staff verify in a pre-review channel, then it moves to the main queue.
- **Auto-Notifications**: Users get DMs when their status changes.
- **Admin Commands**: `/batch_add`, `/batch_remove`, `/batch_check`.
