# AgentUp — Complete Architecture Guide

## 1. What Is AgentUp?

AgentUp is an AI-powered web app that trains call centre agents through realistic customer simulations. Agents practice handling difficult customers via **chat** or **voice call**, receive **AI-generated scoring** across 4 dimensions, and track their improvement over a **performance dashboard**.

Built as a hiring exercise for IAG Services — AI Full Stack Engineer position.

---

## 2. Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 16 (App Router) | SSR + API routes in one project |
| Language | TypeScript (strict) | Type safety across full stack |
| Styling | Tailwind CSS + shadcn/ui | Utility-first + accessible components |
| State | Zustand | Minimal, no boilerplate |
| Database | SQLite + Drizzle ORM | Zero-config, file-based, fast |
| AI Chat | OpenAI GPT-4o-mini/4o | Customer simulation + scoring |
| Speech-to-Text | Deepgram Nova-2 | Streaming WebSocket STT |
| Text-to-Speech | Cartesia Sonic → OpenAI TTS → Browser | 3-tier fallback chain |
| Charts | Recharts | React-native charting |
| Animations | Framer Motion | Page transitions |
| Testing | Vitest | Fast, TypeScript-native |

---

## 3. Project Structure

```
AgentUp/
├── .env                          # API keys (NEVER committed)
├── .env.example                  # Template for env vars
├── .gitignore                    # Root gitignore
├── ARCHITECTURE.md               # THIS FILE — full project guide
├── CLAUDE.md                     # AI assistant instructions
│
└── agentup/                      # Next.js application
    ├── package.json
    ├── next.config.ts
    ├── tsconfig.json
    ├── vitest.config.ts
    ├── public/
    │   └── audio-worklet-processor.js  # AudioWorklet for mic capture
    │
    └── src/
        ├── __tests__/            # Unit tests (45 tests)
        │   ├── sentence-detector.test.ts
        │   ├── turn-detector.test.ts
        │   ├── tts-cache.test.ts
        │   └── speculative-engine.test.ts
        │
        ├── app/                  # Next.js App Router pages + API
        │   ├── layout.tsx        # Root layout (Navbar + PageTransition)
        │   ├── page.tsx          # / — Daily Training (home)
        │   ├── error.tsx         # Global error boundary
        │   ├── cases/
        │   │   └── page.tsx      # /cases — My Cases
        │   ├── dashboard/
        │   │   └── page.tsx      # /dashboard — My Dashboard
        │   └── api/
        │       ├── chat/         # POST — AI customer chat (streaming SSE)
        │       ├── voice/        # POST — AI customer voice response (streaming SSE)
        │       ├── score/        # POST — Score a conversation (JSON)
        │       ├── cases/        # GET/POST — CRUD for training cases
        │       ├── sessions/     # GET/POST — Session data + dashboard stats
        │       ├── tts/          # POST — Text-to-speech (Cartesia → OpenAI fallback)
        │       ├── deepgram/     # GET — Deepgram API key (temp key or proxied)
        │       └── stt-proxy/    # POST — Server-side Deepgram WebSocket proxy
        │
        ├── components/
        │   ├── ui/               # shadcn/ui primitives (Button, Card, Input, etc.)
        │   ├── layout/           # Navbar, PageTransition
        │   ├── training/         # Session flow components
        │   │   ├── SessionManager.tsx   # Orchestrates the training flow
        │   │   ├── CaseIntro.tsx        # Shows case scenario before simulation
        │   │   ├── ChatSimulation.tsx   # Chat-based practice
        │   │   ├── CallSimulation.tsx   # Voice-based practice
        │   │   ├── ScoreCard.tsx        # Per-case score breakdown
        │   │   └── SessionSummary.tsx   # End-of-session summary
        │   ├── cases/            # Case library components
        │   │   ├── CaseList.tsx
        │   │   ├── CaseCard.tsx
        │   │   ├── CaseFilters.tsx
        │   │   └── CaseForm.tsx         # Create new case dialog
        │   ├── dashboard/        # Dashboard widgets
        │   │   ├── StatsCards.tsx
        │   │   ├── ScoreLineChart.tsx
        │   │   ├── TopicBreakdown.tsx
        │   │   ├── ChannelComparison.tsx
        │   │   └── SessionHistory.tsx
        │   └── voice/            # Voice call UI
        │       ├── CallInterface.tsx    # Full call screen
        │       ├── AudioVisualizer.tsx  # Waveform canvas
        │       ├── TranscriptOverlay.tsx
        │       └── LatencyIndicator.tsx
        │
        ├── lib/
        │   ├── ai/
        │   │   ├── openai.ts     # OpenAI client + model config
        │   │   └── prompts.ts    # Customer + scoring prompts (versioned)
        │   ├── db/
        │   │   ├── schema.ts     # Drizzle table definitions
        │   │   ├── index.ts      # DB connection + migrations
        │   │   └── seed.ts       # Default case seeding
        │   ├── store/
        │   │   ├── training-store.ts  # Training session state (Zustand)
        │   │   └── case-store.ts      # Case library state (Zustand)
        │   ├── voice/            # ★ Voice pipeline (13 modules)
        │   │   ├── voice-config.ts         # All constants in one place
        │   │   ├── pipeline.ts             # Main orchestrator (7-state FSM)
        │   │   ├── audio-capture.ts        # Mic capture (AudioWorklet)
        │   │   ├── audio-quality-monitor.ts # SNR, clipping, silence detection
        │   │   ├── stt-stream.ts           # Deepgram WebSocket client
        │   │   ├── stt-proxy-stream.ts     # Server-proxied STT client
        │   │   ├── tts-stream.ts           # TTS with 3-tier fallback
        │   │   ├── tts-cache.ts            # LRU cache with hit/miss metrics
        │   │   ├── turn-detector.ts        # Semantic + prosodic turn detection
        │   │   ├── speculative-engine.ts   # Preemptive LLM generation
        │   │   ├── sentence-detector.ts    # Sentence boundary detection
        │   │   ├── backpressure.ts         # Filler audio injection
        │   │   ├── latency-tracker.ts      # Per-stage latency metrics
        │   │   ├── session-logger.ts       # Debug/replay event logger
        │   │   └── types.ts               # Pipeline type definitions
        │   └── utils.ts          # cn() helper for Tailwind
        │
        ├── data/
        │   └── default-cases.ts  # 5 built-in training scenarios
        │
        └── types/
            └── index.ts          # All TypeScript interfaces
```

---

## 4. Application Flow

### 4.1 Daily Training (Home Page)

```
User clicks "Start Training Session"
  → Fetch all cases from /api/cases
  → Smart selection: pick 3 cases (1 chat + 1 call + 1 both)
    - Avoids recently completed cases
    - Prefers topics where user scored lowest
  → For each case:
    1. CaseIntro — show scenario + opening message
    2. Simulation — chat or voice (user chooses for "both" cases)
    3. ScoreCard — AI scores across 4 dimensions
  → SessionSummary — average score + streak count
  → Save to database via POST /api/sessions (transactional)
```

### 4.2 Training Phases (State Machine)

```
idle → intro → simulation → scoring → summary
                    ↑            |
                    └── nextCase ┘ (repeat for 3 cases)
```

### 4.3 Chat Simulation Flow

```
Customer opening message (from case data)
  → Agent types reply
  → POST /api/chat (streaming SSE)
  → AI responds as customer (stays in character)
  → Repeat for up to 5 turns
  → POST /api/score → ScoreCard
```

### 4.4 Voice Call Flow

```
Customer opening message (spoken via TTS)
  → Agent speaks via microphone
  → AudioWorklet captures PCM audio
  → Deepgram STT (streaming transcription)
  → Turn detection (semantic + VAD + prosodic)
  → POST /api/voice (streaming SSE)
  → Sentence detector → TTS (per-sentence)
  → Repeat for up to 5 turns
  → POST /api/score → ScoreCard
```

---

## 5. Voice Pipeline Architecture (Deep Dive)

This is the most complex part of the application. See `src/lib/voice/README.md` for the full deep dive.

### Pipeline State Machine (7 states)

```
┌──────┐    speech     ┌───────────┐   6+ words   ┌─────────────┐
│ idle │──────────────→│ listening │─────────────→│ speculating │
└──────┘               └───────────┘              └─────────────┘
   ↑                        │                           │
   │                   silence timer                    │
   │                        ↓                           │
   │                ┌───────────────┐                   │
   │                │ turn_deciding │←──────────────────┘
   │                └───────────────┘
   │                        │
   │                   turn complete
   │                        ↓
   │                ┌────────────┐    LLM done    ┌──────────┐
   │                │ processing │───────────────→│ speaking │
   │                └────────────┘                └──────────┘
   │                                                   │
   │   playback done                          barge-in │
   │←──────────────────────────────────────────────────┘
   │                                                   │
   │                                            ┌─────────────┐
   │←───────────────────────────────────────────│ interrupted │
                                                └─────────────┘
```

### Key Innovation: Speculative Generation

While the user is still speaking, the pipeline starts generating an LLM response based on partial transcripts. If the final transcript is similar enough (>80% word-level Levenshtein similarity), the cached response is used — **skipping the LLM call entirely**.

```
User speaking: "I want to cancel my..."
  → Speculation fires (debounced 500ms)
  → LLM generates response for "I want to cancel my"
User finishes: "I want to cancel my subscription"
  → Levenshtein similarity: 0.83 → HIT
  → Use cached response (0ms LLM latency)
```

### Key Innovation: Triple-Signal Turn Detection

```
Signal 1: Semantic analysis (regex patterns)
  - "thank you" → complete (350ms silence threshold)
  - "and" at end → continuing (800ms threshold)
  - "um" at end → thinking (1200ms threshold)

Signal 2: Deepgram speech_final / UtteranceEnd
  - VAD-level confidence that speaker stopped
  - Triggers turn end with 250ms delay

Signal 3: Prosodic features
  - Word confidence < 0.7 → extend threshold by 200ms
  - Uncertain STT = user might still be speaking
```

---

## 6. AI Behavior & Scoring

### Customer Simulation Prompt
- AI plays a realistic customer based on the scenario
- Difficulty affects tone:
  - **Beginner**: Polite, patient, accepts solutions after 1-2 tries
  - **Intermediate**: Frustrated, pushes back once
  - **Advanced**: Angry, adversarial, demands supervisors
- Channel affects language style (chat = typed, call = spoken)

### Scoring (4 dimensions × 25 points = 100)

| Criterion | Weight | What it measures |
|-----------|--------|-----------------|
| Empathy & Tone | 25% | Did agent acknowledge feelings? |
| Accuracy | 25% | Was information correct? |
| Resolution | 25% | Was a concrete next step given? |
| Professionalism | 25% | Was language clear and controlled? |

Scoring prompt is **versioned** (`v2.0`) — version is stored with each score for reproducibility.

Scoring is **calibrated by difficulty**:
- Beginner: strict (no excuse for poor handling of a polite customer)
- Advanced: lenient (credit for any successful de-escalation)

---

## 7. Database Schema

```sql
cases                    sessions                session_cases
├── id (PK)              ├── id (PK)             ├── id (PK)
├── title                ├── date                ├── session_id (FK → sessions)
├── scenario             ├── total_score         ├── case_id (FK → cases)
├── opening_message      ├── cases_completed     ├── channel
├── channel              └── created_at          ├── score (0-100)
├── topic                                        ├── empathy_score (0-25)
├── difficulty                                   ├── accuracy_score (0-25)
├── is_default                                   ├── resolution_score (0-25)
└── created_at                                   ├── professionalism_score (0-25)
                                                 ├── feedback
                                                 ├── strength
                                                 ├── improvement
                                                 ├── conversation_log (JSON)
                                                 ├── turn_count
                                                 ├── avg_latency_ms
                                                 ├── prompt_version
                                                 └── completed_at
```

- **Schema versioning** via `_schema_version` table
- **Indexes** on session_id, case_id, date, completed_at
- **FK constraints**: session_cases → sessions (CASCADE), session_cases → cases (RESTRICT)
- **Transactions**: session + all cases saved atomically

---

## 8. API Routes Reference

| Route | Method | Purpose | Auth |
|-------|--------|---------|------|
| `/api/cases` | GET | List all cases (seeds defaults on first call) | None |
| `/api/cases` | POST | Create a new case (validates + dedup check) | None |
| `/api/chat` | POST | AI customer response for chat (streaming SSE) | None |
| `/api/voice` | POST | AI customer response for voice (streaming SSE) | None |
| `/api/score` | POST | Score a conversation (returns JSON with 4 dimensions) | None |
| `/api/sessions` | GET | Dashboard data (daily-scores, topic-scores, channel-scores, stats, history) | None |
| `/api/sessions` | POST | Save a completed session (transactional, returns streak) | None |
| `/api/tts` | POST | Text-to-speech (Cartesia → OpenAI fallback) | None |
| `/api/deepgram` | GET | Get Deepgram API key (temp key or proxied) | None |
| `/api/stt-proxy` | POST | Server-side Deepgram WebSocket proxy | None |

All routes have: input validation, try/catch, error responses with meaningful messages.

---

## 9. Security Model

| Concern | Approach |
|---------|----------|
| API keys | `.env` only, excluded via `.gitignore`, never in client bundle |
| Deepgram key | Temp scoped keys (30s TTL) when possible, server-proxied otherwise |
| Prompt injection | Scenario/conversation in triple-quoted delimiters + explicit guard instruction |
| Input validation | Type, length, enum checks on all API routes |
| Database | Parameterized queries (Drizzle ORM), FK constraints, transactions |
| CORS | Default Next.js same-origin policy |

---

## 10. Testing

```bash
npm test          # Run all 45 tests
npm run test:watch  # Watch mode
```

| Test File | Module | Tests | What's Tested |
|-----------|--------|-------|---------------|
| sentence-detector.test.ts | SentenceDetector | 10 | Boundary detection, abbreviations, decimals, ellipsis, streaming, flush |
| turn-detector.test.ts | TurnDetector | 11 | Completion, continuation, fillers, thresholds, custom config |
| tts-cache.test.ts | TTSCache | 10 | LRU eviction, normalization, hit/miss tracking, clear |
| speculative-engine.test.ts | SpeculativeEngine | 14 | Levenshtein similarity, order sensitivity, lifecycle |

---

## 11. Running the Project

```bash
# 1. Install dependencies
cd agentup
npm install

# 2. Set up environment variables
cp ../.env.example ../.env
# Edit .env with your API keys

# 3. Run development server
npm run dev
# Open http://localhost:3000

# 4. Run tests
npm test

# 5. Production build
npm run build
npm start
```

### Required API Keys
- `OPENAI_API_KEY` — required (chat, scoring, fallback TTS)
- `DEEPGRAM_API_KEY` — required for voice features (streaming STT)
- `CARTESIA_API_KEY` — optional (primary TTS, falls back to OpenAI → browser)
- `OPENAI_MODEL` — optional (defaults to gpt-4o-mini)

---

## 12. Design Decisions & Trade-offs

| Decision | Why | Trade-off |
|----------|-----|-----------|
| SQLite over PostgreSQL | Zero-config, no Docker, fast for single-user MVP | Not suitable for multi-user production |
| Client-side STT connection | Lower latency than server proxy for real-time audio | API key reaches browser (mitigated by temp keys) |
| Speculative generation | Dramatically reduces perceived latency | Wastes some API calls on misses (~20% hit rate) |
| Sentence-level TTS | User hears first sentence before LLM finishes | Slightly less natural than full-response TTS |
| Browser speechSynthesis fallback | Works offline, zero API cost | Lower voice quality than Cartesia/OpenAI |
| Zustand over Redux | Less boilerplate, simpler mental model | Less middleware/devtools ecosystem |
| Drizzle over Prisma | Thinner, SQL-like API, better for SQLite | Smaller community |

---

## 13. What Makes This Stand Out

1. **Speculative LLM Generation** — preemptive response generation with Levenshtein validation
2. **Triple-Signal Turn Detection** — semantic + VAD + prosodic (word confidence)
3. **Production-Grade Voice Pipeline** — 7-state FSM, turn generation counter, barge-in with LLM abort
4. **Sentence-Boundary TTS Chunking** — abbreviation-aware, iterative scanning
5. **Audio Quality Monitoring** — SNR, clipping, silence detection with user feedback
6. **Session Logger** — full event trace for debug/replay
7. **Scoring Prompt Engineering** — calibrated by difficulty, forces specific quoted feedback
8. **Dynamic Echo Cancellation** — adaptive unmute delay based on detected echo
