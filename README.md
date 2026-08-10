# Factr — group-chat fact-checking bot

Drop this into a Discord server and it settles arguments with sources. Say
`!factr <claim>` or `@Factr is it true that <claim>?` and it replies with a
verdict card: ✅ TRUE / ❌ FALSE / ⚠️ MIXED / ❓ UNVERIFIED, who reviewed it,
and a link — the kind of reply people screenshot.

## What's in here

- `index.js` — the Discord bot: listens for the trigger, formats the reply.
- `factcheck.js` — the verdict engine: queries Google's Fact Check Tools API,
  falls back to a web search summary if nothing's on file.
- `package.json` — dependencies (`discord.js`, `dotenv`).
- `.env.example` — copy to `.env` and fill in your keys.

## Setup

1. **Create the Discord bot**
   - Go to the [Discord Developer Portal](https://discord.com/developers/applications) → New Application.
   - Under **Bot**, click "Add Bot", then enable the **Message Content Intent**.
   - Copy the bot token into `.env` as `DISCORD_TOKEN`.
   - Under **OAuth2 → URL Generator**, check `bot`, then permissions `Send Messages` +
     `Read Message History`, and use the generated URL to invite it to your server.

2. **Get a fact-check data source (pick one or both)**
   - **Google Fact Check Tools API** (recommended, free): create a project in
     [Google Cloud Console](https://console.cloud.google.com/), enable the
     "Fact Check Tools API", create an API key, put it in `.env` as
     `GOOGLE_FACTCHECK_API_KEY`. This is what pulls in verdicts from PolitiFact,
     Snopes, Reuters, AFP, and similar outlets.
   - **Tavily** (optional fallback for claims with no formal fact-check yet):
     sign up at [tavily.com](https://tavily.com) for a free API key, put it in
     `.env` as `TAVILY_API_KEY`.

3. **Install and run**
   ```bash
   npm install
   npm start
   ```

## Important: this needs to stay running

Discord bots hold a persistent connection — they only respond while the
process is alive. Running it on your own laptop means it goes offline when
the laptop sleeps. For it to actually work in a live group chat, deploy it
somewhere that stays on: [Railway](https://railway.app), [Render](https://render.com),
a small VPS, or a Raspberry Pi you leave running. All of these can run
`npm start` directly from this folder — no code changes needed.

## Extending it (the growth-map stages)

- **Log every claim + verdict to a database** (Postgres, SQLite, whatever) —
  this is the "contested claims this week" trend data from the growth map.
- **Add a `/leaderboard` command** showing who gets fact-checked (and proven
  wrong) most in the server — this is the mechanic that actually drives
  screenshots and shares.
- **Port the same `factcheck.js` engine to Slack or WhatsApp** (via the
  WhatsApp Business API) using their respective SDKs — the verdict logic is
  already platform-agnostic.
