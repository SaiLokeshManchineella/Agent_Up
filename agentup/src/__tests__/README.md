# Testing Guide

## Framework

**Vitest** — fast, TypeScript-native, compatible with Next.js.

## Running Tests

```bash
npm test           # Run all 45 tests once
npm run test:watch  # Watch mode (re-runs on file changes)
```

## Test Files

### `sentence-detector.test.ts` (10 tests)

Tests the sentence boundary detector used for TTS chunking.

| Test | What It Verifies |
|------|-----------------|
| Period detection | "Hello there." → detected |
| Exclamation detection | "Stop right now!" → detected |
| Question detection | "Can you help me?" → detected |
| Streaming tokens | Tokens across boundary are handled correctly |
| Multiple sentences | "First. Second." → two callbacks |
| Abbreviation handling | "Mr. Smith is here." → NOT split on "Mr." |
| Decimal numbers | "$3.14 today." → NOT split on "3.14" |
| Ellipsis handling | "Well... I think so." → handled correctly |
| Flush remaining | Incomplete text without punctuation is flushed |
| Reset | Buffer clears correctly |

### `turn-detector.test.ts` (11 tests)

Tests the semantic turn detection module.

| Test | What It Verifies |
|------|-----------------|
| Sentence punctuation | "...bill." → complete, short threshold |
| "Thank you" | → complete |
| "Goodbye" | → complete |
| "That's all" | → complete |
| Trailing "and" | → continuing, long threshold |
| Trailing "because" | → continuing |
| "I'd like to" | → continuing |
| "um" at end | → thinking, very long threshold |
| "you know" at end | → thinking |
| Short text | "Hi" → continuing (too few words) |
| Long text without pattern | → complete with length bonus |

### `tts-cache.test.ts` (10 tests)

Tests the LRU TTS cache with hit/miss tracking.

| Test | What It Verifies |
|------|-----------------|
| Cache miss | Returns null for unknown text |
| Store + retrieve | Blob stored and retrieved correctly |
| Key normalization | Case-insensitive, trimmed, spaces collapsed |
| Space collapsing | "hello   there" → matches "hello there" |
| Hit/miss counters | Correct counts and hit rate percentage |
| Empty hit rate | 0% when no operations |
| Size tracking | Reports correct entry count |
| LRU eviction | Oldest entry evicted at capacity (50) |
| Access refreshes LRU | Accessed entries survive eviction |
| Clear | Resets everything including counters |

### `speculative-engine.test.ts` (14 tests)

Tests the speculative LLM generation engine.

| Test | What It Verifies |
|------|-----------------|
| Identical strings | Similarity = 1.0 |
| Case-insensitive | "I Want" = "i want" → 1.0 |
| Different strings | Low similarity (<0.3) |
| Word order matters | "cancel to want I" ≠ "I want to cancel" (unlike Jaccard!) |
| Minor additions | "I want to cancel my" ≈ "...my subscription" → >0.8 |
| Empty strings | → 0 |
| Very different lengths | → 0 (early return optimization) |
| No speculation exists | validateSpeculation → null |
| Initial hit rate | 0% |
| Total count tracking | Increments on each validation |
| Clean reset | destroy() clears everything |

## Adding New Tests

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('ModuleName', () => {
  it('should do the thing', () => {
    // Arrange
    const module = new MyModule();

    // Act
    const result = module.doThing();

    // Assert
    expect(result).toBe(expected);
  });
});
```

Tests are co-located in `src/__tests__/`. The Vitest config (`vitest.config.ts`) sets up `@/` path aliases matching `tsconfig.json`.
