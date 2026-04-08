// TTS client: Cartesia/OpenAI primary + browser speechSynthesis fallback
// Supports sentence-level streaming, queue management, barge-in, and caching

import { TTSCache } from './tts-cache';

export class TTSStream {
  private ttsCache: TTSCache;
  private currentAudio: HTMLAudioElement | null = null;
  private audioQueue: string[] = [];
  private isPlaying = false;
  private onPlaybackStart: (() => void) | null = null;
  private onPlaybackEnd: (() => void) | null = null;
  private onCacheHit: (() => void) | null = null;
  private onCacheMiss: (() => void) | null = null;
  private useBrowserFallback = false;
  private browserTTSQueue: string[] = [];
  private isBrowserSpeaking = false;
  private browserVoice: SpeechSynthesisVoice | null = null;
  private fetchQueuePromise: Promise<void> = Promise.resolve();

  constructor() {
    this.ttsCache = new TTSCache();

    // Pre-load browser voices — prefer natural-sounding ones
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = speechSynthesis.getVoices();
        // Priority order: Microsoft Online (Neural) > Google > Microsoft Desktop > any English
        this.browserVoice =
          voices.find(
            (v) =>
              v.name.includes('Microsoft') &&
              v.name.includes('Online') &&
              v.lang.startsWith('en')
          ) ||
          voices.find(
            (v) => v.name.includes('Natural') && v.lang.startsWith('en')
          ) ||
          voices.find((v) => v.name.includes('Google UK English Male')) ||
          voices.find((v) => v.name.includes('Google US English')) ||
          voices.find((v) => v.name.includes('Microsoft Mark')) ||
          voices.find((v) => v.name.includes('Microsoft David')) ||
          voices.find((v) => v.name.includes('Microsoft Guy Online')) ||
          voices.find((v) => v.name.includes('Microsoft Ryan Online')) ||
          voices.find(
            (v) => v.lang.startsWith('en-') && !v.localService
          ) || // Prefer cloud voices
          voices.find((v) => v.lang.startsWith('en')) ||
          voices[0] ||
          null;

        if (this.browserVoice) {
          console.log('Selected TTS voice:', this.browserVoice.name);
        }
      };
      loadVoices();
      speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  setCallbacks(callbacks: {
    onPlaybackStart: () => void;
    onPlaybackEnd: () => void;
    onCacheHit?: () => void;
    onCacheMiss?: () => void;
  }) {
    this.onPlaybackStart = callbacks.onPlaybackStart;
    this.onPlaybackEnd = callbacks.onPlaybackEnd;
    this.onCacheHit = callbacks.onCacheHit || null;
    this.onCacheMiss = callbacks.onCacheMiss || null;
  }

  async speak(text: string): Promise<void> {
    if (!text.trim()) return;
    
    // Sequentialize fetches natively to avoid race condition where short sentence 2 
    // downloads faster than long sentence 1 and plays out of order
    const executionPromise = this.fetchQueuePromise.then(() => this.processAudioFetch(text));
    this.fetchQueuePromise = executionPromise.catch(() => {}); // prevent chain breakage
    await executionPromise;
  }

  private async processAudioFetch(text: string): Promise<void> {
    // Check cache first — 0ms latency on hit
    const cached = this.ttsCache.get(text);
    if (cached) {
      this.onCacheHit?.();
      const url = URL.createObjectURL(cached);
      this.audioQueue.push(url);
      if (!this.isPlaying) this.playNextAudio();
      return;
    }

    this.onCacheMiss?.();

    // If API TTS is broken, use browser fallback
    if (this.useBrowserFallback) {
      this.queueBrowserTTS(text);
      return;
    }

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        console.warn(
          'TTS API failed (' + response.status + '), using browser speech'
        );
        this.useBrowserFallback = true;
        this.queueBrowserTTS(text);
        return;
      }

      const blob = await response.blob();

      // Cache for future use
      this.ttsCache.set(text, blob);

      const url = URL.createObjectURL(blob);
      this.audioQueue.push(url);

      if (!this.isPlaying) {
        this.playNextAudio();
      }
    } catch (error) {
      console.warn('TTS network error, using browser speech:', error);
      this.useBrowserFallback = true;
      this.queueBrowserTTS(text);
    }
  }

  // Pre-warm TTS cache with common phrases (call after first turn)
  async prewarmCache(): Promise<void> {
    this.ttsCache.prewarm();
  }

  // Expose cache hit rate for latency tracking
  getCacheHitRate(): number {
    return this.ttsCache.getHitRate();
  }

  getCacheStats() {
    return this.ttsCache.getStats();
  }

  // ==================== BROWSER TTS ====================

  private queueBrowserTTS(text: string): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    this.browserTTSQueue.push(text);

    if (!this.isBrowserSpeaking) {
      this.playNextBrowserTTS();
    }
  }

  private playNextBrowserTTS(): void {
    if (this.browserTTSQueue.length === 0) {
      this.isBrowserSpeaking = false;
      this.isPlaying = false;
      this.onPlaybackEnd?.();
      return;
    }

    this.isBrowserSpeaking = true;
    this.isPlaying = true;
    const text = this.browserTTSQueue.shift()!;

    // Cancel any ongoing speech first
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95; // Slightly slower = more natural
    utterance.pitch = 0.95; // Slightly deeper = less robotic
    utterance.volume = 1.0;

    if (this.browserVoice) {
      utterance.voice = this.browserVoice;
    }

    utterance.onstart = () => {
      this.onPlaybackStart?.();
    };

    utterance.onend = () => {
      this.playNextBrowserTTS();
    };

    utterance.onerror = () => {
      this.playNextBrowserTTS();
    };

    speechSynthesis.speak(utterance);
  }

  // ==================== API TTS AUDIO ====================

  private playbackStarted = false; // Only fire onPlaybackStart once per response

  private playNextAudio(): void {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      this.playbackStarted = false;
      this.onPlaybackEnd?.();
      return;
    }

    this.isPlaying = true;
    const url = this.audioQueue.shift()!;

    this.currentAudio = new Audio(url);

    this.currentAudio.onplay = () => {
      // Only fire onPlaybackStart for the FIRST audio clip in a sequence
      if (!this.playbackStarted) {
        this.playbackStarted = true;
        this.onPlaybackStart?.();
      }
    };

    this.currentAudio.onended = () => {
      URL.revokeObjectURL(url);
      this.playNextAudio();
    };

    this.currentAudio.onerror = () => {
      URL.revokeObjectURL(url);
      this.playNextAudio();
    };

    this.currentAudio.play().catch(() => {
      URL.revokeObjectURL(url);
      this.playNextAudio();
    });
  }

  // ==================== BARGE-IN ====================

  stopPlayback(): void {
    // Stop API TTS audio
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.src = '';
      this.currentAudio = null;
    }
    for (const url of this.audioQueue) {
      URL.revokeObjectURL(url);
    }
    this.audioQueue = [];

    // Stop browser TTS
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    this.browserTTSQueue = [];
    this.isBrowserSpeaking = false;

    this.isPlaying = false;
    this.playbackStarted = false;

    // Notify pipeline that playback was stopped (so it can unmute STT)
    this.onPlaybackEnd?.();
  }

  get playing(): boolean {
    return this.isPlaying;
  }
}
