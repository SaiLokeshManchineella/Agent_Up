// Pipeline Backpressure & Graceful Degradation
// Handles slow API responses with filler audio injection
// Monitors pipeline health and degrades gracefully

// Pre-recorded filler phrases (played via browser TTS when pipeline is slow)
const FILLER_PHRASES = [
  'Hmm, let me think about that...',
  'One moment please...',
  'Let me check on that for you...',
  'Bear with me just a moment...',
];

export class BackpressureManager {
  private fillerTimeout: ReturnType<typeof setTimeout> | null = null;
  private onPlayFiller: ((text: string) => void) | null = null;
  private fillerThresholdMs: number;
  private isFillerPlaying = false;

  constructor(
    fillerThresholdMs = 2500,
    onPlayFiller?: (text: string) => void
  ) {
    this.fillerThresholdMs = fillerThresholdMs;
    this.onPlayFiller = onPlayFiller || null;
  }

  setCallback(onPlayFiller: (text: string) => void): void {
    this.onPlayFiller = onPlayFiller;
  }

  // Called when processing starts (user finished speaking, waiting for AI)
  startMonitoring(): void {
    this.cancelFiller();

    this.fillerTimeout = setTimeout(() => {
      if (!this.isFillerPlaying) {
        this.isFillerPlaying = true;
        const phrase = FILLER_PHRASES[Math.floor(Math.random() * FILLER_PHRASES.length)];
        this.onPlayFiller?.(phrase);
      }
    }, this.fillerThresholdMs);
  }

  // Called when AI response starts arriving — cancel filler
  cancelFiller(): void {
    if (this.fillerTimeout) {
      clearTimeout(this.fillerTimeout);
      this.fillerTimeout = null;
    }
    this.isFillerPlaying = false;
  }

  destroy(): void {
    this.cancelFiller();
    this.onPlayFiller = null;
  }
}
