// Semantic Turn Detector
// Combines VAD silence detection with linguistic completeness analysis
// Adapts silence threshold based on what the user is saying
//
// Signal priority (highest to lowest):
// 1. Deepgram speech_final (handled in pipeline.ts) — VAD-level confidence
// 2. Completion patterns (punctuation, "thank you", "goodbye") — fast trigger
// 3. Filler patterns ("um", "uh") — extend wait, user is thinking
// 4. Continuation patterns ("and", "but", "because") — user isn't done
// 5. Default: use base threshold, with bonus for long utterances

import { VOICE_CONFIG } from './voice-config';

// Words/patterns that indicate the speaker hasn't finished
const CONTINUATION_PATTERNS = [
  /\b(and|but|so|because|or|also|then|however|although|though|yet|plus|furthermore)\s*$/i,
  /\b(I want to|I need to|I'd like to|can you|could you|would you|let me)\s*$/i,
  /\b(the thing is|the problem is|what happened was|basically)\s*$/i,
  /\b(next|after that|and then|before that)\s*$/i,
  /\b(I think|I believe|I reckon|in my opinion)\s*$/i,
];

// Filler words that indicate thinking, not turn completion
// Note: only matches fillers at the END of transcript (trailing position)
const FILLER_PATTERNS = [
  /\b(um|uh|hmm|erm|like|you know|I mean|well|so)\s*$/i,
];

// Filler anywhere in text — secondary signal for hedging
const HEDGING_PATTERNS = [
  /\b(kinda|sort of|kind of|maybe|perhaps|I guess)\b/i,
];

// Patterns that suggest the utterance is complete
const COMPLETION_PATTERNS = [
  /[.!?]\s*$/, // Ends with sentence-ending punctuation
  /\b(thank you|thanks|okay|alright|got it|that's all|goodbye|bye)\s*$/i,
  /\b(please help|can you help|I need help)\s*$/i,
  /\.{3,}\s*$/, // Trailing ellipsis — speaker trailed off, treat as complete
];

export type TurnDecision = 'complete' | 'continuing' | 'thinking';

export interface TurnDetectorConfig {
  baseSilenceMs: number;
  completeSilenceMs: number;
  continuingSilenceMs: number;
  thinkingSilenceMs: number;
  minWordsForAnalysis: number;
  longUtteranceBonusMs: number;
}

export class TurnDetector {
  private config: TurnDetectorConfig;

  constructor(config?: Partial<TurnDetectorConfig>) {
    this.config = {
      baseSilenceMs: VOICE_CONFIG.BASE_SILENCE_MS,
      completeSilenceMs: VOICE_CONFIG.COMPLETE_SILENCE_MS,
      continuingSilenceMs: VOICE_CONFIG.CONTINUING_SILENCE_MS,
      thinkingSilenceMs: VOICE_CONFIG.THINKING_SILENCE_MS,
      minWordsForAnalysis: VOICE_CONFIG.MIN_WORDS_FOR_ANALYSIS,
      longUtteranceBonusMs: VOICE_CONFIG.LONG_UTTERANCE_BONUS_MS,
      ...config,
    };
  }

  // Analyze transcript and return turn decision + adaptive silence threshold
  analyze(transcript: string): {
    decision: TurnDecision;
    silenceThresholdMs: number;
  } {
    const trimmed = transcript.trim();
    const wordCount = trimmed.split(/\s+/).length;

    // Too few words to analyze meaningfully
    if (wordCount < this.config.minWordsForAnalysis) {
      return { decision: 'continuing', silenceThresholdMs: this.config.baseSilenceMs };
    }

    // Check for completion signals (highest priority)
    for (const pattern of COMPLETION_PATTERNS) {
      if (pattern.test(trimmed)) {
        return { decision: 'complete', silenceThresholdMs: this.config.completeSilenceMs };
      }
    }

    // Check for filler words at end (user is thinking)
    for (const pattern of FILLER_PATTERNS) {
      if (pattern.test(trimmed)) {
        return { decision: 'thinking', silenceThresholdMs: this.config.thinkingSilenceMs };
      }
    }

    // Check for continuation patterns (user isn't done)
    for (const pattern of CONTINUATION_PATTERNS) {
      if (pattern.test(trimmed)) {
        return { decision: 'continuing', silenceThresholdMs: this.config.continuingSilenceMs };
      }
    }

    // Check for hedging language anywhere — secondary thinking signal
    // Only apply if utterance is short (< 8 words) — hedging in long sentences is normal
    if (wordCount < 8) {
      for (const pattern of HEDGING_PATTERNS) {
        if (pattern.test(trimmed)) {
          return { decision: 'continuing', silenceThresholdMs: this.config.continuingSilenceMs };
        }
      }
    }

    // No clear signal — use base threshold
    // Longer utterances are more likely to be complete
    const lengthBonus = wordCount > 10 ? -this.config.longUtteranceBonusMs : 0;
    return {
      decision: 'complete',
      silenceThresholdMs: Math.max(300, this.config.baseSilenceMs + lengthBonus),
    };
  }
}
