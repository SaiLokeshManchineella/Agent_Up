// Centralized voice pipeline configuration
// All magic numbers in one place with explanations

export const VOICE_CONFIG = {
  // ==================== Audio Capture ====================
  /** High-pass filter cutoff (Hz) — removes low-frequency rumble/hum */
  HPF_CUTOFF_HZ: 100,
  /** Audio chunk buffer size for AudioWorklet (samples) */
  WORKLET_BUFFER_SIZE: 4096,

  // ==================== VAD / Energy Detection ====================
  /** RMS energy threshold to detect speech — tuned above typical ambient noise */
  SPEECH_ENERGY_THRESHOLD: 0.04,
  /** Audio level polling interval for visualizer (ms) */
  AUDIO_LEVEL_POLL_MS: 50,

  // ==================== Turn Detection ====================
  /** Default silence threshold before considering turn complete (ms) */
  BASE_SILENCE_MS: 500,
  /** Silence threshold when sentence looks linguistically complete (ms) */
  COMPLETE_SILENCE_MS: 350,
  /** Silence threshold when user appears mid-thought (ms) */
  CONTINUING_SILENCE_MS: 800,
  /** Silence threshold when filler words detected — user is thinking (ms) */
  THINKING_SILENCE_MS: 1200,
  /** Minimum word count before semantic analysis kicks in */
  MIN_WORDS_FOR_ANALYSIS: 2,
  /** Silence threshold when Deepgram speech_final fires (ms) — short because VAD is confident */
  SPEECH_FINAL_SILENCE_MS: 250,
  /** Bonus reduction in threshold for long utterances (>10 words) */
  LONG_UTTERANCE_BONUS_MS: 100,

  // ==================== Speculative Engine ====================
  /** Minimum words in partial transcript before speculation starts */
  SPECULATION_MIN_WORDS: 6,
  /** Debounce delay before firing speculative LLM call (ms) */
  SPECULATION_DEBOUNCE_MS: 500,
  /** Similarity threshold (0-1) — above this, use cached speculation */
  SPECULATION_SIMILARITY_THRESHOLD: 0.80,

  // ==================== TTS ====================
  /** Max TTS cache entries (count, not bytes) */
  TTS_CACHE_MAX_SIZE: 50,
  /** Max text length for a single TTS request (chars) */
  TTS_MAX_TEXT_LENGTH: 1000,

  // ==================== Backpressure ====================
  /** Time before injecting filler audio if LLM is slow (ms) */
  FILLER_THRESHOLD_MS: 2500,

  // ==================== Pipeline ====================
  /** Delay after TTS playback ends before unmuting STT (ms) — avoids echo */
  POST_PLAYBACK_UNMUTE_DELAY_MS: 300,

  // ==================== STT Reconnection ====================
  /** Max reconnection attempts before giving up */
  STT_MAX_RECONNECT_ATTEMPTS: 5,
  /** Initial reconnect delay (ms) — doubles each attempt */
  STT_RECONNECT_BASE_DELAY_MS: 500,
  /** Max reconnect delay cap (ms) */
  STT_RECONNECT_MAX_DELAY_MS: 8000,
  /** Max audio chunks buffered during reconnection */
  STT_RECONNECT_MAX_BUFFER_CHUNKS: 8,
  /** WebSocket keepalive interval (ms) */
  STT_KEEPALIVE_INTERVAL_MS: 8000,
} as const;
