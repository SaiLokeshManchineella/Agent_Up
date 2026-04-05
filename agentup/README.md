# AgentUp

AI-powered call centre agent training platform. Practice customer scenarios via chat or voice, get instant AI scoring, and track your performance.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp ../.env.example ../.env
# Edit .env with your API keys (see below)

# Start development server
npm run dev

# Open http://localhost:3000
```

## Required Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | Chat simulation, scoring, fallback TTS |
| `DEEPGRAM_API_KEY` | Yes* | Streaming speech-to-text (* only for voice features) |
| `CARTESIA_API_KEY` | No | Primary TTS (Sonic). Falls back to OpenAI TTS → browser |
| `OPENAI_MODEL` | No | Defaults to `gpt-4o-mini`. Set `gpt-4o` for higher quality |

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm test` | Run 45 unit tests |
| `npm run test:watch` | Watch mode |
| `npm run lint` | ESLint |

## Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Daily Training | Practice 3 customer scenarios per session |
| `/cases` | My Cases | Browse/create training scenarios |
| `/dashboard` | My Dashboard | Score charts, streaks, topic breakdown |

## Architecture

See `../ARCHITECTURE.md` for the full project deep dive. Key highlights:

- **Voice Pipeline**: 13-module system with 7-state FSM, speculative generation, triple-signal turn detection
- **AI Scoring**: 4-dimension scoring (Empathy, Accuracy, Resolution, Professionalism) with calibrated prompts
- **Database**: SQLite + Drizzle ORM with versioned migrations, transactions, and indexes
- **Testing**: 45 unit tests covering sentence detection, turn detection, TTS caching, and speculation

## Tech Stack

Next.js 16 | TypeScript | Tailwind CSS | shadcn/ui | Zustand | SQLite + Drizzle | OpenAI | Deepgram | Cartesia | Vitest

## Deploy

```bash
npm run build
npm start
```

For Vercel deployment, ensure environment variables are set in the Vercel dashboard. Note: SQLite requires a persistent filesystem — use Vercel's serverless functions with an external DB or deploy on a VPS.
