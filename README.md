# TNM Bot — Trust No Mob Discord Bot

A Discord bot for the TNM server with moderation commands and a market price display.

---

## Setup

### 1. Install Node.js
Download from https://nodejs.org (v18 or newer recommended)

### 2. Install dependencies
Open a terminal in this folder and run:
```
npm install
```

### 3. Add your bot token
Open `.env` and replace `YOUR_BOT_TOKEN_HERE` with your actual bot token from https://discord.com/developers/applications

```
TOKEN=your_actual_token_here
```

### 4. (Optional) Set your tickets channel in .market
Open `commands/market.js` and replace `TICKETS_CHANNEL_ID` with the real channel ID of your tickets channel.

### 5. Start the bot
```
npm start
```

---

## Commands

All commands use the `.` prefix.

### Moderation
| Command | Usage | Permission Required |
|---------|-------|---------------------|
| `.ban` | `.ban @user [reason]` | Ban Members |
| `.kick` | `.kick @user [reason]` | Kick Members |
| `.mute` | `.mute @user <minutes> [reason]` | Moderate Members |
| `.unmute` | `.unmute @user [reason]` | Moderate Members |
| `.warn` | `.warn @user [reason]` | Moderate Members |
| `.warnings` | `.warnings @user` | Moderate Members |
| `.clear` | `.clear <1-100>` | Manage Messages |
| `.lock` | `.lock [reason]` | Manage Channels |
| `.unlock` | `.unlock` | Manage Channels |
| `.slowmode` | `.slowmode <seconds>` | Manage Channels |

### Market
| Command | Usage | Permission Required |
|---------|-------|---------------------|
| `.market` | `.market` | None |

---

## Bot Permissions Required
Make sure the bot has these permissions in your server:
- Ban Members
- Kick Members
- Moderate Members (Timeout)
- Manage Messages
- Manage Channels
- Send Messages
- Read Message History
- View Channels
