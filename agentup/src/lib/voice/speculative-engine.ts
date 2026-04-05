// Speculative/Preemptive Generation Engine
// Starts LLM generation while user is still speaking, using partial transcripts
// If the final transcript is similar enough, uses the cached response (skips LLM call)
// If diverged, discards and generates fresh
//
// Key optimizations over naive approach:
// 1. Debounced — waits 500ms after last interim before speculating
// 2. Rate-limited — max 1 speculation in flight at a time
// 3. Uses Levenshtein-based normalized edit distance (order-sensitive) instead of Jaccard
// 4. Server-side abort via AbortController prevents wasted LLM tokens

export interface SpeculationResult {
  response: string;
  wasSpeculative: boolean;
}

import { VOICE_CONFIG } from './voice-config';

export class SpeculativeEngine {
  private currentAbort: AbortController | null = null;
  private speculativeResponse: string | null = null;
  private lastPartialUsed: string = '';
  private hitCount = 0;
  private totalCount = 0;
  private minWordsToSpeculate = VOICE_CONFIG.SPECULATION_MIN_WORDS;
  private similarityThreshold = VOICE_CONFIG.SPECULATION_SIMILARITY_THRESHOLD;

  // Debounce state
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private debounceMs = VOICE_CONFIG.SPECULATION_DEBOUNCE_MS;
  private isSpeculating = false; // Rate limiter: only 1 in flight

  // Called on interim transcripts — debounces, then starts speculative LLM generation
  onPartialTranscript(
    partial: string,
    scenario: string,
    difficulty: string,
    conversationHistory: { role: string; content: string }[]
  ): void {
    const words = partial.trim().split(/\s+/);

    // Don't speculate on too few words — not enough context
    if (words.length < this.minWordsToSpeculate) return;

    // Don't re-speculate if the partial hasn't changed meaningfully
    if (
      this.lastPartialUsed &&
      this.computeSimilarity(this.lastPartialUsed, partial) > 0.95
    ) {
      return;
    }

    // Clear previous debounce
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Debounce: wait 500ms after last interim before firing speculation
    this.debounceTimer = setTimeout(() => {
      this.executeSpeculation(partial, scenario, difficulty, conversationHistory);
    }, this.debounceMs);
  }

  private async executeSpeculation(
    partial: string,
    scenario: string,
    difficulty: string,
    conversationHistory: { role: string; content: string }[]
  ): Promise<void> {
    // Rate limit: skip if another speculation is already in flight
    if (this.isSpeculating) return;

    this.isSpeculating = true;

    // Abort previous speculation (if any completed response is stale)
    this.currentAbort?.abort();
    this.currentAbort = new AbortController();
    this.lastPartialUsed = partial;

    try {
      const response = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: partial,
          messages: conversationHistory,
          scenario,
          difficulty,
        }),
        signal: this.currentAbort.signal,
      });

      if (!response.ok) {
        this.isSpeculating = false;
        return;
      }

      // Collect full response (don't stream — speculation should be fast and complete)
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let lineBuffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          lineBuffer += decoder.decode(value, { stream: true });
          const lines = lineBuffer.split('\n');
          lineBuffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) fullText += parsed.text;
            } catch {
              // Ignore parse errors from incomplete JSON
            }
          }
        }
      }

      // Only cache if we weren't aborted
      if (!this.currentAbort?.signal.aborted) {
        this.speculativeResponse = fullText;
      }
    } catch {
      // Aborted or network error — ignore
    } finally {
      this.isSpeculating = false;
    }
  }

  // Called when turn detection confirms user is done
  // Returns the speculative response if it's close enough, otherwise null
  validateSpeculation(finalTranscript: string): SpeculationResult | null {
    this.totalCount++;

    // Cancel any pending debounced speculation
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (!this.speculativeResponse || !this.lastPartialUsed) {
      return null;
    }

    const similarity = this.computeSimilarity(
      this.lastPartialUsed,
      finalTranscript
    );

    // Cancel any ongoing speculation
    this.currentAbort?.abort();

    if (similarity >= this.similarityThreshold) {
      // Speculation hit — use cached response
      this.hitCount++;
      const result: SpeculationResult = {
        response: this.speculativeResponse,
        wasSpeculative: true,
      };
      this.reset();
      return result;
    }

    // Speculation miss — caller should generate fresh
    this.reset();
    return null;
  }

  // Compute normalized edit distance (Levenshtein) for order-sensitive similarity
  // Returns 0..1 where 1 = identical
  private computeSimilarity(a: string, b: string): number {
    const s1 = a.toLowerCase().trim();
    const s2 = b.toLowerCase().trim();

    if (s1 === s2) return 1;
    if (!s1.length || !s2.length) return 0;

    // Word-level Levenshtein — more meaningful than char-level for speech
    const wordsA = s1.split(/\s+/);
    const wordsB = s2.split(/\s+/);

    const m = wordsA.length;
    const n = wordsB.length;

    // Optimize: if length difference is too large, skip computation
    if (Math.abs(m - n) / Math.max(m, n) > 0.5) return 0;

    // Dynamic programming — word-level edit distance
    const dp: number[][] = Array.from({ length: m + 1 }, () =>
      new Array(n + 1).fill(0)
    );

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (wordsA[i - 1] === wordsB[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(
            dp[i - 1][j],     // deletion
            dp[i][j - 1],     // insertion
            dp[i - 1][j - 1]  // substitution
          );
        }
      }
    }

    const editDistance = dp[m][n];
    const maxLen = Math.max(m, n);
    return 1 - editDistance / maxLen;
  }

  get hitRate(): number {
    return this.totalCount === 0
      ? 0
      : Math.round((this.hitCount / this.totalCount) * 100);
  }

  reset(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.currentAbort?.abort();
    this.currentAbort = null;
    this.speculativeResponse = null;
    this.lastPartialUsed = '';
  }

  destroy(): void {
    this.reset();
    this.hitCount = 0;
    this.totalCount = 0;
    this.isSpeculating = false;
  }
}
