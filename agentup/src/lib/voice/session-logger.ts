// Voice Session Logger
// Records all pipeline events for debugging, QA, and replay analysis
//
// Captures:
// - Every state transition with timestamp
// - All transcripts (interim + final) with latency
// - AI responses with generation latency
// - TTS cache hits/misses
// - Speculation attempts and hit/miss
// - Audio quality warnings
// - Barge-in events
// - Error events
//
// Designed for post-session analysis — not real-time streaming

export type SessionEventType =
  | 'state_change'
  | 'interim_transcript'
  | 'final_transcript'
  | 'speech_final'
  | 'ai_response_start'
  | 'ai_response_done'
  | 'tts_sentence'
  | 'tts_cache_hit'
  | 'tts_cache_miss'
  | 'tts_playback_start'
  | 'tts_playback_end'
  | 'speculation_hit'
  | 'speculation_miss'
  | 'barge_in'
  | 'audio_quality_warning'
  | 'latency_report'
  | 'error'
  | 'session_start'
  | 'session_end';

export interface SessionEvent {
  type: SessionEventType;
  timestamp: number; // performance.now() relative to session start
  data: Record<string, unknown>;
}

export class SessionLogger {
  private events: SessionEvent[] = [];
  private startTime = 0;
  private sessionId: string;
  private isActive = false;

  constructor() {
    this.sessionId = '';
  }

  start(sessionId: string, scenario: string, difficulty: string): void {
    this.sessionId = sessionId;
    this.startTime = performance.now();
    this.events = [];
    this.isActive = true;

    this.log('session_start', { sessionId, scenario, difficulty });
  }

  log(type: SessionEventType, data: Record<string, unknown> = {}): void {
    if (!this.isActive) return;

    this.events.push({
      type,
      timestamp: Math.round(performance.now() - this.startTime),
      data,
    });
  }

  // Convenience methods for common events
  stateChange(from: string, to: string): void {
    this.log('state_change', { from, to });
  }

  transcript(text: string, isFinal: boolean, confidence?: number): void {
    this.log(isFinal ? 'final_transcript' : 'interim_transcript', {
      text,
      confidence,
      wordCount: text.split(/\s+/).length,
    });
  }

  aiResponse(text: string, latencyMs: number, wasSpeculative: boolean): void {
    this.log('ai_response_done', {
      text: text.slice(0, 200), // Truncate for log size
      latencyMs,
      wasSpeculative,
      charCount: text.length,
    });
  }

  bargeIn(duringState: string): void {
    this.log('barge_in', { duringState });
  }

  audioQuality(warning: string, snrDb: number): void {
    this.log('audio_quality_warning', { warning, snrDb });
  }

  error(message: string, context?: string): void {
    this.log('error', { message, context });
  }

  end(): SessionLog {
    this.log('session_end', {
      totalEvents: this.events.length,
      durationMs: Math.round(performance.now() - this.startTime),
    });

    this.isActive = false;

    return {
      sessionId: this.sessionId,
      events: [...this.events],
      summary: this.generateSummary(),
    };
  }

  private generateSummary(): SessionSummary {
    const stateChanges = this.events.filter((e) => e.type === 'state_change');
    const finals = this.events.filter((e) => e.type === 'final_transcript');
    const aiResponses = this.events.filter((e) => e.type === 'ai_response_done');
    const bargeIns = this.events.filter((e) => e.type === 'barge_in');
    const errors = this.events.filter((e) => e.type === 'error');
    const specHits = this.events.filter((e) => e.type === 'speculation_hit');
    const specMisses = this.events.filter((e) => e.type === 'speculation_miss');
    const cacheHits = this.events.filter((e) => e.type === 'tts_cache_hit');
    const cacheMisses = this.events.filter((e) => e.type === 'tts_cache_miss');
    const qualityWarnings = this.events.filter((e) => e.type === 'audio_quality_warning');

    const durationMs = this.events.length > 0
      ? (this.events[this.events.length - 1].timestamp)
      : 0;

    return {
      durationMs,
      turnCount: finals.length,
      aiResponseCount: aiResponses.length,
      bargeInCount: bargeIns.length,
      errorCount: errors.length,
      speculationHitRate: specHits.length + specMisses.length > 0
        ? Math.round((specHits.length / (specHits.length + specMisses.length)) * 100)
        : 0,
      ttsCacheHitRate: cacheHits.length + cacheMisses.length > 0
        ? Math.round((cacheHits.length / (cacheHits.length + cacheMisses.length)) * 100)
        : 0,
      audioQualityWarnings: qualityWarnings.length,
      stateTransitions: stateChanges.length,
    };
  }

  // Export the full log as JSON (for debugging/replay)
  toJSON(): string {
    return JSON.stringify({
      sessionId: this.sessionId,
      events: this.events,
      summary: this.generateSummary(),
    }, null, 2);
  }
}

export interface SessionLog {
  sessionId: string;
  events: SessionEvent[];
  summary: SessionSummary;
}

export interface SessionSummary {
  durationMs: number;
  turnCount: number;
  aiResponseCount: number;
  bargeInCount: number;
  errorCount: number;
  speculationHitRate: number;
  ttsCacheHitRate: number;
  audioQualityWarnings: number;
  stateTransitions: number;
}
