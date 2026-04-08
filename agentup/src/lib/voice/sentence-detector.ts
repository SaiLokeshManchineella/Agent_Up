// Sentence boundary detector for chunked TTS streaming
// Buffers streaming LLM tokens and flushes complete sentences to TTS
// Uses iterative scanning (not recursion) to avoid stack overflow on long buffers

// Common abbreviations that end with periods but aren't sentence boundaries
const ABBREVIATIONS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'st',
  'ave', 'blvd', 'dept', 'est', 'fig', 'inc', 'ltd',
  'vs', 'etc', 'approx', 'appt', 'apt', 'govt',
  'i.e', 'e.g', 'u.s', 'u.k',
]);

export class SentenceDetector {
  private buffer = '';
  private onSentence: ((sentence: string) => void) | null = null;

  constructor(onSentence: (sentence: string) => void) {
    this.onSentence = onSentence;
  }

  // Feed tokens from streaming LLM
  addToken(token: string): void {
    this.buffer += token;
    this.tryFlush();
  }

  // Force flush remaining buffer (end of response)
  flush(): void {
    const text = this.buffer.trim();
    if (text) {
      const cleanText = text.replace(/\*[^*]*\*/g, '').trim();
      if (cleanText) {
        this.onSentence?.(cleanText);
      }
    }
    this.buffer = '';
  }

  private tryFlush(): void {
    // Iterative scan — process all sentence boundaries in the buffer
    while (true) {
      const boundary = this.findBoundary(this.buffer);
      if (boundary === -1) break;

      const sentence = this.buffer.substring(0, boundary + 1).trim();
      if (sentence.length > 0) {
        const cleanSentence = sentence.replace(/\*[^*]*\*/g, '').trim();
        if (cleanSentence) {
          this.onSentence?.(cleanSentence);
        }
      }
      this.buffer = this.buffer.substring(boundary + 1).trimStart();
    }
  }

  // Find the index of the first sentence boundary in text, or -1
  private findBoundary(text: string): number {
    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (char === '.' || char === '!' || char === '?') {
        const nextChar = text[i + 1];

        // Must be followed by space, end of text, or quote
        if (nextChar && nextChar !== ' ' && nextChar !== '"' && nextChar !== "'") {
          continue;
        }

        // Check for abbreviations
        if (char === '.') {
          const beforeDot = text.substring(0, i).split(/\s/).pop()?.toLowerCase() || '';
          if (ABBREVIATIONS.has(beforeDot.replace('.', ''))) {
            continue;
          }

          // Check for decimal numbers (e.g., 3.14)
          if (i > 0 && /\d/.test(text[i - 1]) && nextChar && /\d/.test(nextChar)) {
            continue;
          }

          // Check for ellipsis
          if (text[i + 1] === '.' || (i > 0 && text[i - 1] === '.')) {
            continue;
          }
        }

        return i;
      }
    }
    return -1;
  }

  reset(): void {
    this.buffer = '';
  }
}
