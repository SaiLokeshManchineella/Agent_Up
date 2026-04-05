import { describe, it, expect } from 'vitest';
import { TTSCache } from '../lib/voice/tts-cache';

describe('TTSCache', () => {
  it('should return null for cache miss', () => {
    const cache = new TTSCache();
    expect(cache.get('nonexistent')).toBeNull();
  });

  it('should store and retrieve a blob', () => {
    const cache = new TTSCache();
    const blob = new Blob(['test audio'], { type: 'audio/mpeg' });

    cache.set('Hello there.', blob);
    expect(cache.get('Hello there.')).toBe(blob);
  });

  it('should normalize keys (case-insensitive, trimmed)', () => {
    const cache = new TTSCache();
    const blob = new Blob(['test'], { type: 'audio/mpeg' });

    cache.set('  Hello There.  ', blob);
    expect(cache.get('hello there.')).toBe(blob);
    expect(cache.get('HELLO THERE.')).toBe(blob);
    expect(cache.get('Hello There.')).toBe(blob);
  });

  it('should collapse multiple spaces in key', () => {
    const cache = new TTSCache();
    const blob = new Blob(['test'], { type: 'audio/mpeg' });

    cache.set('hello   there', blob);
    expect(cache.get('hello there')).toBe(blob);
  });

  it('should track hit/miss counters correctly', () => {
    const cache = new TTSCache();
    const blob = new Blob(['test'], { type: 'audio/mpeg' });

    cache.set('hello', blob);
    cache.get('hello'); // hit
    cache.get('hello'); // hit
    cache.get('world'); // miss

    const stats = cache.getStats();
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBe(67); // 2/3 = 66.67 → rounds to 67
  });

  it('should return 0% hit rate when empty', () => {
    const cache = new TTSCache();
    expect(cache.getHitRate()).toBe(0);
  });

  it('should report correct size', () => {
    const cache = new TTSCache();
    expect(cache.size).toBe(0);

    cache.set('one', new Blob(['1']));
    cache.set('two', new Blob(['2']));
    expect(cache.size).toBe(2);
  });

  it('should evict LRU entry when at capacity', () => {
    const cache = new TTSCache();

    // Fill cache beyond capacity (MAX_CACHE_SIZE = 50)
    for (let i = 0; i < 51; i++) {
      cache.set(`phrase-${i}`, new Blob([`audio-${i}`]));
    }

    // Size should be capped at 50
    expect(cache.size).toBe(50);

    // First entry should have been evicted (LRU)
    expect(cache.has('phrase-0')).toBe(false);

    // Last entry should exist
    expect(cache.has('phrase-50')).toBe(true);
  });

  it('should update lastUsed on access to prevent LRU eviction', async () => {
    const cache = new TTSCache();

    // Add 2 entries with a gap so timestamps differ
    cache.set('old-phrase', new Blob(['old']));
    // Small delay to ensure different timestamp
    await new Promise((r) => setTimeout(r, 5));
    cache.set('new-phrase', new Blob(['new']));

    // Fill remaining 48 slots
    for (let i = 0; i < 48; i++) {
      cache.set(`filler-${i}`, new Blob([`f-${i}`]));
    }
    expect(cache.size).toBe(50);

    // Access old-phrase to refresh its lastUsed
    await new Promise((r) => setTimeout(r, 5));
    cache.get('old-phrase');

    // Add one more — should evict new-phrase (now oldest lastUsed), NOT old-phrase
    cache.set('overflow', new Blob(['overflow']));

    expect(cache.has('old-phrase')).toBe(true); // refreshed, should survive
    expect(cache.has('new-phrase')).toBe(false); // should be evicted as LRU
  });

  it('should clear all entries and reset counters', () => {
    const cache = new TTSCache();
    cache.set('hello', new Blob(['test']));
    cache.get('hello');
    cache.get('miss');

    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.getHitRate()).toBe(0);
    expect(cache.getStats().hits).toBe(0);
    expect(cache.getStats().misses).toBe(0);
  });
});
