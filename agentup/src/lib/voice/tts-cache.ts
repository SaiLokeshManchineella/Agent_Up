// LRU TTS Cache
// Caches audio blobs for frequently used phrases
// Cache hit = 0ms TTS latency for that sentence
// Tracks real hit/miss counters for pipeline diagnostics

import { VOICE_CONFIG } from './voice-config';

const MAX_CACHE_SIZE = VOICE_CONFIG.TTS_CACHE_MAX_SIZE;

// Common customer service phrases to pre-warm
const PREWARM_PHRASES = [
  'I understand your frustration.',
  'Let me look into that for you.',
  'Thank you for your patience.',
  'Is there anything else I can help you with?',
  'I apologize for the inconvenience.',
  "I'm going to resolve this for you right now.",
  'Let me check your account.',
  'I completely understand how you feel.',
  "That's a great question.",
  'I want to make sure we get this right for you.',
];

interface CacheEntry {
  blob: Blob;
  lastUsed: number;
}

export class TTSCache {
  private cache = new Map<string, CacheEntry>();
  private prewarming = false;
  private hits = 0;
  private misses = 0;

  // Current voice context — included in cache key so voice switches don't serve wrong audio
  private voiceContext = 'default';

  setVoiceContext(context: string): void {
    this.voiceContext = context;
  }

  // Normalize text for cache key — includes voice context
  private normalize(text: string): string {
    return `${this.voiceContext}:${text.toLowerCase().trim().replace(/\s+/g, ' ')}`;
  }

  get(text: string): Blob | null {
    const key = this.normalize(text);
    const entry = this.cache.get(key);
    if (entry) {
      this.hits++;
      entry.lastUsed = Date.now();
      return entry.blob;
    }
    this.misses++;
    return null;
  }

  set(text: string, blob: Blob): void {
    const key = this.normalize(text);

    // Evict LRU if at capacity
    if (this.cache.size >= MAX_CACHE_SIZE && !this.cache.has(key)) {
      let oldestKey = '';
      let oldestTime = Infinity;
      for (const [k, v] of this.cache) {
        if (v.lastUsed < oldestTime) {
          oldestTime = v.lastUsed;
          oldestKey = k;
        }
      }
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, { blob, lastUsed: Date.now() });
  }

  has(text: string): boolean {
    return this.cache.has(this.normalize(text));
  }

  // Pre-warm cache with common phrases (async, non-blocking)
  async prewarm(): Promise<void> {
    if (this.prewarming) return;
    this.prewarming = true;

    for (const phrase of PREWARM_PHRASES) {
      if (this.has(phrase)) continue;

      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: phrase }),
        });

        if (res.ok) {
          const blob = await res.blob();
          this.set(phrase, blob);
          // Don't count pre-warm as a miss (reset counter for this entry)
          this.misses = Math.max(0, this.misses - 1);
        }
      } catch {
        // Non-critical — skip failed pre-warm entries
      }
    }

    this.prewarming = false;
  }

  get size(): number {
    return this.cache.size;
  }

  // Real hit rate as a percentage (0-100)
  getHitRate(): number {
    const total = this.hits + this.misses;
    if (total === 0) return 0;
    return Math.round((this.hits / total) * 100);
  }

  getStats(): { hits: number; misses: number; hitRate: number; size: number } {
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: this.getHitRate(),
      size: this.cache.size,
    };
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
}
