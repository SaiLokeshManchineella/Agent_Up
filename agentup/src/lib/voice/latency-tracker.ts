// Per-stage latency measurement for voice pipeline
// Tracks: speech_end → STT → LLM first token → TTS first byte → audio playback
// Also computes perceived E2E (what the user actually feels) and TTS cache hit rate

export interface TurnMetrics {
  vadToStt: number;
  sttToLlmFirstToken: number;
  llmToTtsFirstByte: number;
  totalE2e: number;
  perceivedE2e: number; // Time from user stopping to hearing first audio
  speculationUsed: boolean;
  ttsCacheHit: boolean;
}

export class LatencyTracker {
  private timestamps: Map<string, number> = new Map();
  private metrics: TurnMetrics[] = [];
  private currentTurnFlags = {
    speculationUsed: false,
    ttsCacheHit: false,
  };

  // TTS cache stats — injected from TTSCache
  private ttsCacheHits = 0;
  private ttsCacheMisses = 0;

  mark(stage: string): void {
    this.timestamps.set(stage, performance.now());
  }

  // Flag that this turn used a speculative response
  markSpeculationUsed(): void {
    this.currentTurnFlags.speculationUsed = true;
  }

  // Flag that TTS cache was hit for this turn's first sentence
  markTtsCacheHit(): void {
    this.currentTurnFlags.ttsCacheHit = true;
    this.ttsCacheHits++;
  }

  markTtsCacheMiss(): void {
    this.ttsCacheMisses++;
  }

  getDelta(from: string, to: string): number {
    const start = this.timestamps.get(from);
    const end = this.timestamps.get(to);
    if (!start || !end) return 0;
    return Math.round(end - start);
  }

  completeTurn(): TurnMetrics {
    // Perceived E2E = time from speech end to first audio playback
    // This is what the user "feels" — different from total E2E if speculation is used
    const perceivedE2e = this.getDelta('speech_end', 'audio_start');

    const metrics: TurnMetrics = {
      vadToStt: this.getDelta('speech_end', 'stt_final'),
      sttToLlmFirstToken: this.getDelta('stt_final', 'llm_first_token'),
      llmToTtsFirstByte: this.getDelta('llm_first_sentence', 'tts_first_byte'),
      totalE2e: this.getDelta('speech_end', 'audio_start'),
      perceivedE2e,
      speculationUsed: this.currentTurnFlags.speculationUsed,
      ttsCacheHit: this.currentTurnFlags.ttsCacheHit,
    };

    this.metrics.push(metrics);
    this.timestamps.clear();
    this.currentTurnFlags = { speculationUsed: false, ttsCacheHit: false };
    return metrics;
  }

  getAverageE2e(): number {
    if (this.metrics.length === 0) return 0;
    const sum = this.metrics.reduce((s, m) => s + m.totalE2e, 0);
    return Math.round(sum / this.metrics.length);
  }

  getAveragePerceivedE2e(): number {
    if (this.metrics.length === 0) return 0;
    const sum = this.metrics.reduce((s, m) => s + m.perceivedE2e, 0);
    return Math.round(sum / this.metrics.length);
  }

  getP95E2e(): number {
    if (this.metrics.length === 0) return 0;
    const sorted = [...this.metrics.map((m) => m.totalE2e)].sort(
      (a, b) => a - b
    );
    const idx = Math.floor(sorted.length * 0.95);
    return sorted[Math.min(idx, sorted.length - 1)];
  }

  getTtsCacheHitRate(): number {
    const total = this.ttsCacheHits + this.ttsCacheMisses;
    if (total === 0) return 0;
    return Math.round((this.ttsCacheHits / total) * 100);
  }

  getSpeculationRate(): number {
    if (this.metrics.length === 0) return 0;
    const specCount = this.metrics.filter((m) => m.speculationUsed).length;
    return Math.round((specCount / this.metrics.length) * 100);
  }

  getLatestMetrics(): TurnMetrics | null {
    return this.metrics[this.metrics.length - 1] || null;
  }

  reset(): void {
    this.timestamps.clear();
    this.metrics = [];
    this.ttsCacheHits = 0;
    this.ttsCacheMisses = 0;
    this.currentTurnFlags = { speculationUsed: false, ttsCacheHit: false };
  }
}
