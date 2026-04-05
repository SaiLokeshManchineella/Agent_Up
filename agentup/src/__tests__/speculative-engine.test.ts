import { describe, it, expect } from 'vitest';
import { SpeculativeEngine } from '../lib/voice/speculative-engine';

// Access private method via prototype for testing
function computeSimilarity(a: string, b: string): number {
  const engine = new SpeculativeEngine();
  // Use the private method via any cast (acceptable for unit tests)
  return (engine as unknown as { computeSimilarity: (a: string, b: string) => number }).computeSimilarity(a, b);
}

describe('SpeculativeEngine — similarity metric', () => {
  it('should return 1.0 for identical strings', () => {
    expect(computeSimilarity('I want to cancel', 'I want to cancel')).toBe(1);
  });

  it('should be case-insensitive', () => {
    expect(
      computeSimilarity('I Want To Cancel', 'i want to cancel')
    ).toBe(1);
  });

  it('should return 0 for completely different strings', () => {
    const sim = computeSimilarity(
      'I want to cancel my subscription',
      'the weather is nice today outside'
    );
    expect(sim).toBeLessThan(0.3);
  });

  it('should penalize word reordering (unlike Jaccard)', () => {
    const sim = computeSimilarity(
      'I want to cancel',
      'cancel to want I'
    );
    // Levenshtein on word level: all 4 words need to be rearranged
    // This should NOT be 1.0 (which Jaccard would give)
    expect(sim).toBeLessThan(1.0);
  });

  it('should give high similarity for minor additions', () => {
    const sim = computeSimilarity(
      'I want to cancel my',
      'I want to cancel my subscription'
    );
    // 5/6 words match in order → high similarity
    expect(sim).toBeGreaterThan(0.8);
  });

  it('should return 0 for empty strings', () => {
    expect(computeSimilarity('', 'hello')).toBe(0);
    expect(computeSimilarity('hello', '')).toBe(0);
  });

  it('should return 0 for very different length strings', () => {
    const sim = computeSimilarity(
      'hi',
      'I have a very long complaint about my billing statement that needs resolution'
    );
    expect(sim).toBe(0); // length diff > 50% → early return
  });
});

describe('SpeculativeEngine — lifecycle', () => {
  it('should return null when no speculation exists', () => {
    const engine = new SpeculativeEngine();
    expect(engine.validateSpeculation('any text')).toBeNull();
  });

  it('should start with 0 hit rate', () => {
    const engine = new SpeculativeEngine();
    expect(engine.hitRate).toBe(0);
  });

  it('should track total count on validation', () => {
    const engine = new SpeculativeEngine();
    engine.validateSpeculation('test 1');
    engine.validateSpeculation('test 2');
    // hitRate = 0/2 = 0
    expect(engine.hitRate).toBe(0);
  });

  it('should reset cleanly', () => {
    const engine = new SpeculativeEngine();
    engine.destroy();
    expect(engine.hitRate).toBe(0);
  });
});
