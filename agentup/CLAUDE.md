# CLAUDE.md

## Project: AgentUp
AI-powered call centre agent training web app. Agents practice customer scenarios via chat or voice, get AI scoring, and track performance.

## Tech Stack
- Next.js 16 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Zustand (state), Recharts (charts), Framer Motion (animations)
- SQLite + Drizzle ORM (file-based DB at ./agentup.db, versioned migrations)
- OpenAI GPT-4o-mini/4o (chat AI + scoring)
- Deepgram Nova-2 (streaming STT — server-side WebSocket proxy, never client-direct)
- Cartesia Sonic (primary TTS) → OpenAI TTS (fallback) → Browser speechSynthesis (final fallback)
- Vitest (unit tests — 45 tests)

## Commands
- `npm run dev` — start dev server
- `npm run build` — production build
- `npm test` — run unit tests
- `npm run test:watch` — watch mode

## Env vars
- OPENAI_API_KEY — chat, scoring, fallback TTS
- DEEPGRAM_API_KEY — streaming STT (stays server-side, NEVER exposed to client)
- CARTESIA_API_KEY — primary TTS (Sonic)
- OPENAI_MODEL — defaults to gpt-4o-mini

## Voice Pipeline Architecture

```
Browser Mic → AudioWorklet (+ ScriptProcessor fallback, AudioContext.resume())
  → Audio Preprocessing (HPF 100Hz + DynamicsCompressor AGC)
  → Audio Quality Monitor (SNR, clipping, silence detection — warns user)
  → Server-side STT Proxy (/api/stt-proxy → Deepgram WebSocket)
    ├── Word-level confidence + timing (for prosodic turn detection)
    ├── speech_final / UtteranceEnd events (VAD endpoint)
    └── Exponential backoff reconnection with audio buffering
  → Triple-Signal Turn Detection:
    ├── Semantic: linguistic completeness (completion/continuation/filler/hedging regex)
    ├── Prosodic: word confidence < 0.7 → extend silence threshold
    └── VAD: Deepgram speech_final (high-confidence, 250ms trigger)
  → Speculative Engine (debounced 500ms, rate-limited, word-level Levenshtein)
  → GPT-4o Streaming (AbortController — barge-in cancels in-flight)
  → Sentence Boundary Detector (iterative, abbreviation/decimal/ellipsis-aware)
  → TTS Cascade: Cartesia Sonic → OpenAI TTS → Browser speechSynthesis
    ├── Voice-context-aware LRU cache (hit/miss metrics, pre-warmed)
    └── Per-sentence chunking for minimum time-to-first-audio
  → Backpressure Manager (filler injection at 2.5s threshold)
  → Dual Barge-In Detection:
    ├── Primary: STT-based (Deepgram produces text during playback → barge-in)
    └── Fallback: Energy threshold (RMS > 0.04 during speaking state)
  → Dynamic Echo Cancellation (adaptive unmute delay, increases on echo detection)
  → Session Logger (full event trace for debug/replay)
  → Latency Tracker (per-stage: VAD→STT→LLM→TTS, perceivedE2e, p95)
```

Pipeline state machine: idle → listening → speculating → turn_deciding → processing → speaking → interrupted

Concurrency model: monotonic `turnGeneration` counter invalidates stale async operations.

## Key Architecture
- `/src/lib/voice/` — full voice pipeline (13 modules):
  - voice-config.ts — centralized constants with documentation
  - pipeline.ts — 7-state FSM orchestrator with turn generation counter
  - audio-capture.ts — AudioWorklet + ScriptProcessor fallback + AudioContext resume
  - audio-quality-monitor.ts — SNR, clipping, silence, volume monitoring
  - stt-stream.ts — Deepgram WebSocket with exponential backoff reconnection
  - stt-proxy-stream.ts — Server-proxied STT client (for /api/stt-proxy)
  - tts-stream.ts — Cartesia/OpenAI/browser TTS with voice-context caching
  - tts-cache.ts — LRU cache with voice context keys + real hit/miss metrics
  - turn-detector.ts — semantic + prosodic analysis with config-driven thresholds
  - speculative-engine.ts — debounced preemptive LLM with word-level Levenshtein
  - sentence-detector.ts — iterative boundary detection
  - backpressure.ts — filler audio injection
  - latency-tracker.ts — per-stage metrics with perceivedE2e
  - session-logger.ts — full event logging for debug/replay/QA
- `/src/lib/ai/` — versioned prompts (v2.0) with injection guards
- `/src/lib/db/` — Drizzle schema with versioned migrations, CASCADE, indexes, transactions
- `/src/lib/store/` — Zustand stores with error state
- `/src/app/api/` — 8 API routes with validation, error handling, transactions
  - stt-proxy/ — server-side Deepgram WebSocket proxy (key never leaves server)
- `/src/__tests__/` — 45 unit tests

## Security
- Deepgram: temporary scoped keys (30s TTL) or server-side proxy — main key NEVER in client
- Prompt injection: scenario/conversation in triple-quoted delimiters + explicit guard instruction
- Input validation: type, length, enum on all API routes
- Database: FK with CASCADE/RESTRICT, transactions, parameterized queries
- .env excluded via .gitignore
