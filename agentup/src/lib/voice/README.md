# Voice Pipeline — Architecture & Module Guide

The voice pipeline is a 13-module system that enables real-time voice conversations between a human agent and an AI customer. It handles everything from microphone capture to AI response playback.

## Pipeline Flow

```
Mic → AudioWorklet → Audio Preprocessing → Audio Quality Monitor
  → Deepgram STT (WebSocket, streaming)
  → Turn Detection (semantic + VAD + prosodic)
  → Speculative Engine (preemptive LLM generation)
  → GPT-4o (streaming response)
  → Sentence Detector (boundary detection)
  → TTS (Cartesia → OpenAI → Browser, per-sentence)
  → Audio Playback
  → Barge-in Detection (STT-based + energy fallback)
```

## State Machine (7 states)

```
idle → listening → speculating → turn_deciding → processing → speaking → interrupted
```

Each state transition is logged by the SessionLogger for debug/replay.

## Module Reference

### Core Orchestration

| Module | Purpose |
|--------|---------|
| `pipeline.ts` | Main orchestrator. 7-state FSM, turn generation counter, coordinates all modules |
| `voice-config.ts` | All magic numbers in one file with explanations. Every module imports from here |
| `types.ts` | TypeScript type definitions for pipeline states and configs |

### Audio Capture & Quality

| Module | Purpose |
|--------|---------|
| `audio-capture.ts` | Mic capture via AudioWorklet (with ScriptProcessor fallback). Includes HPF + compressor preprocessing |
| `audio-quality-monitor.ts` | Real-time SNR, clipping detection, silence detection. Warns user about poor audio conditions |

### Speech-to-Text

| Module | Purpose |
|--------|---------|
| `stt-stream.ts` | Deepgram WebSocket client. Exponential backoff reconnection, audio buffering during reconnect, speech_final support |
| `stt-proxy-stream.ts` | Alternative STT client that routes through /api/stt-proxy (server-side WebSocket proxy, API key never leaves server) |

### Turn Detection

| Module | Purpose |
|--------|---------|
| `turn-detector.ts` | Semantic turn-end analysis. Regex patterns for completion/continuation/filler/hedging. Config-driven thresholds |

The pipeline combines three signals:
1. **Semantic** (turn-detector.ts): linguistic completeness patterns
2. **VAD** (Deepgram speech_final): high-confidence endpoint detection
3. **Prosodic** (pipeline.ts): word-level confidence from Deepgram — low confidence extends silence threshold

### Latency Optimization

| Module | Purpose |
|--------|---------|
| `speculative-engine.ts` | Fires LLM calls on partial transcripts (debounced 500ms, rate-limited). If final transcript matches (>80% Levenshtein), uses cached response — **0ms LLM latency** |
| `sentence-detector.ts` | Detects sentence boundaries in streaming LLM output. Each sentence is sent to TTS immediately — user hears first sentence before LLM finishes |
| `backpressure.ts` | If LLM takes >2.5s, injects filler audio ("Let me think about that...") to avoid dead air |

### Text-to-Speech

| Module | Purpose |
|--------|---------|
| `tts-stream.ts` | 3-tier TTS: Cartesia Sonic (~130ms) → OpenAI TTS → Browser speechSynthesis. Manages audio queue + barge-in |
| `tts-cache.ts` | LRU cache (50 entries). Voice-context-aware keys. Pre-warms 10 common phrases. Tracks hit/miss metrics |

### Observability

| Module | Purpose |
|--------|---------|
| `latency-tracker.ts` | Per-stage latency: VAD→STT→LLM→TTS. Tracks perceivedE2e, speculation rate, cache hit rate |
| `session-logger.ts` | Full event trace: state changes, transcripts, AI responses, barge-ins, errors. Exportable as JSON for replay/QA |

## Concurrency Model

The pipeline uses a **turn generation counter** to prevent stale async operations from corrupting state:

```typescript
this.turnGeneration++;
const myGeneration = this.turnGeneration;

// ... async operations ...

// Before mutating state, verify this turn is still current:
if (myGeneration !== this.turnGeneration) return; // Stale — discard
```

Barge-in increments the counter, invalidating all in-flight operations for the interrupted turn.

## Barge-In Detection (Dual)

1. **Primary — STT-based**: If Deepgram produces transcripts while TTS is playing, the user is speaking over the AI. This is the most reliable signal.
2. **Fallback — Energy-based**: RMS energy above threshold (0.04) during `speaking` state. Catches cases where STT is too slow.

On barge-in:
- TTS playback stops immediately
- In-flight LLM fetch is aborted via AbortController
- Turn generation counter increments (invalidates stale callbacks)
- Pipeline transitions to `listening`

## Echo Cancellation

- STT is muted while TTS is playing (`muteSTT = true`)
- Unmute is delayed after playback ends (configurable, default 300ms)
- **Adaptive delay**: if barge-in fires within 500ms of playback ending, it's likely echo — delay is increased by 50ms (up to 600ms) for future turns

## Testing

```bash
npm test
```

Tests cover: sentence-detector (10), turn-detector (11), tts-cache (10), speculative-engine (14)
