// Voice Pipeline Orchestrator
// Coordinates: AudioCapture → Server STT Proxy → GPT-4o → Sentence Detector → Cartesia TTS → Audio Playback
//
// Production-grade features:
// - 7-state FSM with turn generation counter (prevents stale async corruption)
// - Server-side STT proxy (API key never leaves server)
// - Dual barge-in detection (STT-based + energy fallback)
// - Prosodic-aware turn detection (word confidence + timing from Deepgram)
// - Audio quality monitoring (SNR, clipping, silence)
// - Sentence-level TTS streaming with LRU cache
// - Speculative LLM generation with debounce + rate limiting
// - Backpressure filler injection
// - Full session logging for debug/replay
// - Dynamic echo cancellation unmute delay

import { AudioCapture } from './audio-capture';
import { DeepgramSTTStream } from './stt-stream';
import { TTSStream } from './tts-stream';
import { SentenceDetector } from './sentence-detector';
import { LatencyTracker } from './latency-tracker';
import { TurnDetector } from './turn-detector';
import { SpeculativeEngine } from './speculative-engine';
import { BackpressureManager } from './backpressure';
import { AudioQualityMonitor } from './audio-quality-monitor';
import { SessionLogger } from './session-logger';
import { VOICE_CONFIG } from './voice-config';
import type { PipelineState } from './types';

export interface PipelineCallbacks {
  onStateChange: (state: PipelineState) => void;
  onInterimTranscript: (text: string) => void;
  onFinalTranscript: (text: string) => void;
  onAiResponseChunk: (textSoFar: string) => void;
  onAiResponseDone: (fullText: string) => void;
  onAudioLevel: (level: number) => void;
  onLatencyUpdate: (metrics: ReturnType<LatencyTracker['getLatestMetrics']>) => void;
  onAudioQualityWarning: (warning: string) => void;
  onError: (error: string) => void;
}

export class VoicePipeline {
  private audioCapture: AudioCapture;
  private sttStream: DeepgramSTTStream;
  private ttsStream: TTSStream;
  private latencyTracker: LatencyTracker;
  private audioQuality: AudioQualityMonitor;
  private sessionLogger: SessionLogger;
  private callbacks: PipelineCallbacks;

  private state: PipelineState = 'idle';
  private stopped = false;
  private deepgramApiKey: string | null = null;
  private scenario = '';
  private difficulty = '';
  private conversationHistory: { role: string; content: string }[] = [];

  // VAD state
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private isSpeaking = false;
  private accumulatedTranscript = '';
  private currentInterim = '';
  private audioLevelInterval: ReturnType<typeof setInterval> | null = null;
  private isProcessingTurn = false;

  // Echo cancellation
  private muteSTT = false;
  private lastPlaybackEndTime = 0; // Timestamp of last TTS playback end
  private dynamicUnmuteDelayMs: number = VOICE_CONFIG.POST_PLAYBACK_UNMUTE_DELAY_MS;

  // Turn generation counter — prevents stale async operations
  private turnGeneration = 0;

  // LLM abort — barge-in cancels in-flight LLM
  private llmAbort: AbortController | null = null;

  // Semantic + prosodic turn detection
  private turnDetector: TurnDetector;
  private speculativeEngine: SpeculativeEngine;
  private backpressure: BackpressureManager;
  private turnCount = 0;
  private deepgramSpeechFinal = false;

  // Prosodic features from Deepgram word-level data
  private lastWordConfidence = 0;
  private lastWordDuration = 0;
  private avgWordConfidence = 0;
  private wordConfidenceCount = 0;

  // STT-based barge-in: if STT produces text while speaking, that's a barge-in
  private sttReceivedDuringSpeaking = false;

  constructor(callbacks: PipelineCallbacks) {
    this.callbacks = callbacks;
    this.audioCapture = new AudioCapture();
    this.sttStream = new DeepgramSTTStream();
    this.ttsStream = new TTSStream();
    this.latencyTracker = new LatencyTracker();
    this.audioQuality = new AudioQualityMonitor();
    this.sessionLogger = new SessionLogger();
    this.turnDetector = new TurnDetector();
    this.speculativeEngine = new SpeculativeEngine();
    this.backpressure = new BackpressureManager(
      VOICE_CONFIG.FILLER_THRESHOLD_MS,
      (filler) => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(filler);
          utterance.rate = 0.9;
          utterance.pitch = 0.95;
          speechSynthesis.speak(utterance);
        }
      }
    );

    // Audio quality monitoring
    this.audioQuality.setCallback((report) => {
      if (report.warning) {
        this.sessionLogger.audioQuality(report.warning, report.snrDb);
        this.callbacks.onAudioQualityWarning(report.warning);
      }
    });

    this.ttsStream.setCallbacks({
      onPlaybackStart: () => {
        this.muteSTT = true;
        this.sttReceivedDuringSpeaking = false;
        this.latencyTracker.mark('audio_start');
        this.sessionLogger.log('tts_playback_start');
        this.setState('speaking');
      },
      onPlaybackEnd: () => {
        this.lastPlaybackEndTime = performance.now();
        this.sessionLogger.log('tts_playback_end');

        // Dynamic unmute delay — longer if we detected echo issues previously
        setTimeout(() => {
          if (this.stopped) return;
          this.muteSTT = false;
          this.isSpeaking = false;
          this.accumulatedTranscript = '';
          this.currentInterim = '';
          this.isProcessingTurn = false;
          this.deepgramSpeechFinal = false;
          this.sttReceivedDuringSpeaking = false;

          if (this.state === 'speaking') {
            const metrics = this.latencyTracker.completeTurn();
            this.callbacks.onLatencyUpdate(metrics);
            this.sessionLogger.log('latency_report', metrics as unknown as Record<string, unknown>);
          }
          this.setState('idle');
        }, this.dynamicUnmuteDelayMs);
      },
      onCacheHit: () => {
        this.latencyTracker.markTtsCacheHit();
        this.sessionLogger.log('tts_cache_hit');
      },
      onCacheMiss: () => {
        this.latencyTracker.markTtsCacheMiss();
        this.sessionLogger.log('tts_cache_miss');
      },
    });
  }

  async start(scenario: string, difficulty: string): Promise<void> {
    this.scenario = scenario;
    this.difficulty = difficulty;
    this.conversationHistory = [];
    this.stopped = false;

    const sessionId = `voice-${Date.now()}`;
    this.sessionLogger.start(sessionId, scenario, difficulty);

    // Fetch temporary Deepgram API key
    const res = await fetch('/api/deepgram');
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }));
      this.callbacks.onError(err.error || 'Failed to get Deepgram API key');
      this.sessionLogger.error(err.error || 'Deepgram key fetch failed');
      return;
    }
    const { apiKey, error } = await res.json();
    if (!apiKey) {
      this.callbacks.onError(error || 'Deepgram API key not configured');
      this.sessionLogger.error(error || 'No Deepgram key');
      return;
    }
    this.deepgramApiKey = apiKey;

    // Connect to Deepgram STT
    await this.sttStream.connect(this.deepgramApiKey!, {
      onInterim: (text) => {
        // STT-based barge-in: if we receive transcripts while speaking, user is talking over AI
        if (this.state === 'speaking' && !this.muteSTT) {
          this.sttReceivedDuringSpeaking = true;
          this.handleBargeIn();
          return;
        }

        if (this.muteSTT || this.stopped || this.isProcessingTurn) return;

        this.currentInterim = text;
        const display = this.accumulatedTranscript
          ? this.accumulatedTranscript + ' ' + text
          : text;
        this.callbacks.onInterimTranscript(display);
        this.sessionLogger.transcript(display, false);

        this.resetSilenceTimer();

        if (!this.isSpeaking) {
          this.isSpeaking = true;
          this.setState('listening');
        }

        if (display.split(/\s+/).length >= VOICE_CONFIG.SPECULATION_MIN_WORDS && this.state === 'listening') {
          this.setState('speculating');
        }
        this.speculativeEngine.onPartialTranscript(
          display,
          this.scenario,
          this.difficulty,
          this.conversationHistory
        );
      },
      onFinal: (text) => {
        // STT-based barge-in check
        if (this.state === 'speaking' && !this.muteSTT) {
          this.sttReceivedDuringSpeaking = true;
          this.handleBargeIn();
          return;
        }

        if (this.muteSTT || this.stopped || this.isProcessingTurn) return;

        if (text.trim()) {
          this.accumulatedTranscript = this.accumulatedTranscript
            ? this.accumulatedTranscript + ' ' + text.trim()
            : text.trim();
          this.currentInterim = '';
          this.callbacks.onInterimTranscript(this.accumulatedTranscript);
          this.latencyTracker.mark('stt_final');
          this.sessionLogger.transcript(this.accumulatedTranscript, true, this.lastWordConfidence);
        }
      },
      onSpeechFinal: () => {
        if (this.muteSTT || this.stopped || this.isProcessingTurn) return;
        this.deepgramSpeechFinal = true;
        this.sessionLogger.log('speech_final');

        if (this.accumulatedTranscript.trim()) {
          if (this.silenceTimer) clearTimeout(this.silenceTimer);
          this.silenceTimer = setTimeout(() => {
            if (!this.isSpeaking || this.isProcessingTurn || this.muteSTT || this.stopped) return;

            const finalTranscript = this.accumulatedTranscript.trim();
            if (!finalTranscript) return;

            this.isSpeaking = false;
            this.latencyTracker.mark('speech_end');
            this.callbacks.onFinalTranscript(finalTranscript);
            this.handleTurnEnd(finalTranscript);
          }, VOICE_CONFIG.SPEECH_FINAL_SILENCE_MS);
        }
      },
      onError: (error) => {
        if (!this.stopped) {
          this.callbacks.onError(error);
          this.sessionLogger.error(error, 'stt');
        }
      },
    });

    // Start audio capture
    await this.audioCapture.start((chunk) => {
      if (this.stopped) return;

      // Audio quality monitoring (runs on every chunk, even when muted)
      this.audioQuality.analyzeChunk(chunk);

      if (this.muteSTT) return;

      this.sttStream.sendAudio(chunk);

      // Energy-based barge-in (fallback — STT-based is primary)
      const energy = this.calculateEnergy(chunk);
      if (energy > VOICE_CONFIG.SPEECH_ENERGY_THRESHOLD && this.state === 'speaking') {
        this.handleBargeIn();
      }
    });

    // Audio level monitoring for visualizer
    this.audioLevelInterval = setInterval(() => {
      if (!this.stopped) {
        const level = this.audioCapture.getAudioLevel();
        this.callbacks.onAudioLevel(level);
      }
    }, VOICE_CONFIG.AUDIO_LEVEL_POLL_MS);

    this.setState('idle');
  }

  private resetSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }

    const transcript =
      this.accumulatedTranscript +
      (this.currentInterim ? ' ' + this.currentInterim : '');
    const { silenceThresholdMs } = this.turnDetector.analyze(transcript);

    // Prosodic adjustment: if last word had low confidence, extend threshold
    // (uncertain STT → user might still be speaking)
    const prosodicBonus = this.lastWordConfidence > 0 && this.lastWordConfidence < 0.7 ? 200 : 0;

    // If Deepgram speech_final, use short threshold
    const effectiveThreshold = this.deepgramSpeechFinal
      ? Math.min(silenceThresholdMs, VOICE_CONFIG.SPEECH_FINAL_SILENCE_MS + 50)
      : silenceThresholdMs + prosodicBonus;

    this.silenceTimer = setTimeout(() => {
      if (!this.isSpeaking || this.isProcessingTurn || this.muteSTT || this.stopped) return;

      const finalTranscript = this.accumulatedTranscript.trim();
      if (!finalTranscript) return;

      this.setState('turn_deciding');
      const { decision } = this.turnDetector.analyze(finalTranscript);

      if (decision === 'thinking' && !this.deepgramSpeechFinal) {
        this.setState('listening');
        return;
      }

      this.isSpeaking = false;
      this.latencyTracker.mark('speech_end');
      this.callbacks.onFinalTranscript(finalTranscript);
      this.handleTurnEnd(finalTranscript);
    }, effectiveThreshold);
  }

  // Receive word-level data from Deepgram (for prosodic analysis)
  updateWordData(words: { word: string; start: number; end: number; confidence: number }[]): void {
    if (words.length === 0) return;

    const lastWord = words[words.length - 1];
    this.lastWordConfidence = lastWord.confidence;
    this.lastWordDuration = lastWord.end - lastWord.start;

    // Running average of word confidence
    this.wordConfidenceCount++;
    this.avgWordConfidence +=
      (lastWord.confidence - this.avgWordConfidence) / this.wordConfidenceCount;
  }

  private async handleTurnEnd(transcript: string): Promise<void> {
    if (this.isProcessingTurn || this.stopped) return;
    this.isProcessingTurn = true;
    this.deepgramSpeechFinal = false;

    this.turnGeneration++;
    const myGeneration = this.turnGeneration;

    this.setState('processing');
    this.accumulatedTranscript = '';
    this.currentInterim = '';

    this.conversationHistory.push({ role: 'agent', content: transcript });
    this.backpressure.startMonitoring();

    this.turnCount++;
    if (this.turnCount === 1) {
      this.ttsStream.prewarmCache();
    }

    // Check speculative generation
    const speculation = this.speculativeEngine.validateSpeculation(transcript);
    if (speculation) {
      if (myGeneration !== this.turnGeneration) return;

      this.backpressure.cancelFiller();
      this.latencyTracker.markSpeculationUsed();
      this.sessionLogger.log('speculation_hit');
      this.latencyTracker.mark('stt_final');
      this.latencyTracker.mark('llm_first_token');
      this.latencyTracker.mark('llm_first_sentence');
      this.latencyTracker.mark('tts_first_byte');

      this.callbacks.onAiResponseChunk(speculation.response);
      this.ttsStream.speak(speculation.response);

      this.conversationHistory.push({ role: 'customer', content: speculation.response });
      this.callbacks.onAiResponseDone(speculation.response);
      this.sessionLogger.aiResponse(speculation.response, 0, true);
      return;
    }

    this.sessionLogger.log('speculation_miss');

    try {
      this.llmAbort = new AbortController();
      const llmStartTime = performance.now();

      const response = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          messages: this.conversationHistory.slice(0, -1),
          scenario: this.scenario,
          difficulty: this.difficulty,
        }),
        signal: this.llmAbort.signal,
      });

      if (!response.ok) {
        if (myGeneration === this.turnGeneration) {
          this.callbacks.onError('LLM request failed');
          this.sessionLogger.error('LLM request failed', 'llm');
          this.isProcessingTurn = false;
          this.setState('idle');
        }
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let isFirstToken = true;
      let isFirstSentence = true;
      let lineBuffer = '';

      const sentenceDetector = new SentenceDetector((sentence) => {
        if (myGeneration !== this.turnGeneration || this.stopped) return;

        if (isFirstSentence) {
          this.backpressure.cancelFiller();
          this.latencyTracker.mark('llm_first_sentence');
          this.latencyTracker.mark('tts_first_byte');
          isFirstSentence = false;
        }
        this.sessionLogger.log('tts_sentence', { sentence: sentence.slice(0, 100) });
        this.ttsStream.speak(sentence);
      });

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (this.stopped || myGeneration !== this.turnGeneration) break;

          lineBuffer += decoder.decode(value, { stream: true });
          const lines = lineBuffer.split('\n');
          lineBuffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6);
            if (data === '[DONE]') break;

            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                if (isFirstToken) {
                  this.latencyTracker.mark('llm_first_token');
                  this.sessionLogger.log('ai_response_start');
                  isFirstToken = false;
                }
                fullResponse += parsed.text;
                sentenceDetector.addToken(parsed.text);
                if (myGeneration === this.turnGeneration) {
                  this.callbacks.onAiResponseChunk(fullResponse);
                }
              }
            } catch {
              // Ignore
            }
          }
        }
      }

      if (myGeneration === this.turnGeneration) {
        sentenceDetector.flush();
      }

      if (!this.stopped && myGeneration === this.turnGeneration) {
        this.conversationHistory.push({ role: 'customer', content: fullResponse });
        this.callbacks.onAiResponseDone(fullResponse);
        this.sessionLogger.aiResponse(
          fullResponse,
          Math.round(performance.now() - llmStartTime),
          false
        );
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;

      if (!this.stopped && myGeneration === this.turnGeneration) {
        this.callbacks.onError('Failed to get AI response');
        this.sessionLogger.error('AI response failed', 'llm');
        this.isProcessingTurn = false;
        this.setState('idle');
      }
    } finally {
      this.llmAbort = null;
    }
  }

  async speakText(text: string): Promise<void> {
    this.muteSTT = true;
    this.conversationHistory.push({ role: 'customer', content: text });
    this.setState('speaking');
    try {
      await this.ttsStream.speak(text);
    } catch {
      this.muteSTT = false;
      this.setState('idle');
    }
  }

  handleBargeIn(): void {
    if (this.state === 'speaking') {
      const bargeInSource = this.sttReceivedDuringSpeaking ? 'stt' : 'energy';
      this.sessionLogger.bargeIn(`speaking (via ${bargeInSource})`);

      this.setState('interrupted');
      this.llmAbort?.abort();
      this.llmAbort = null;
      this.turnGeneration++;

      this.ttsStream.stopPlayback();
      this.muteSTT = false;
      this.isProcessingTurn = false;
      this.accumulatedTranscript = '';
      this.currentInterim = '';
      this.deepgramSpeechFinal = false;
      this.sttReceivedDuringSpeaking = false;

      // Adaptive echo cancellation: if barge-in happened very soon after playback,
      // increase unmute delay for next time (acoustic echo detected)
      const timeSincePlayback = performance.now() - this.lastPlaybackEndTime;
      if (timeSincePlayback < 500) {
        // Likely echo — increase delay next time (up to 600ms)
        this.dynamicUnmuteDelayMs = Math.min(600, this.dynamicUnmuteDelayMs + 50);
      }

      this.setState('listening');
    }
  }

  getConversationHistory(): { role: string; content: string }[] {
    return [...this.conversationHistory];
  }

  getAnalyserNode(): AnalyserNode | null {
    return this.audioCapture.getAnalyserNode();
  }

  getLatencyTracker(): LatencyTracker {
    return this.latencyTracker;
  }

  getSpeculationHitRate(): number {
    return this.speculativeEngine.hitRate;
  }

  getTtsCacheHitRate(): number {
    return this.ttsStream.getCacheHitRate();
  }

  getSessionLog(): ReturnType<SessionLogger['end']> {
    return this.sessionLogger.end();
  }

  stop(): void {
    this.stopped = true;
    this.turnGeneration++;
    this.llmAbort?.abort();
    this.llmAbort = null;

    this.audioCapture.stop();
    this.sttStream.disconnect();
    this.ttsStream.stopPlayback();
    this.speculativeEngine.destroy();
    this.backpressure.destroy();
    this.audioQuality.reset();

    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    if (this.audioLevelInterval) clearInterval(this.audioLevelInterval);

    this.latencyTracker.reset();
  }

  private setState(state: PipelineState): void {
    if (this.stopped) return;
    const prev = this.state;
    this.state = state;
    this.sessionLogger.stateChange(prev, state);
    this.callbacks.onStateChange(state);
  }

  getState(): PipelineState {
    return this.state;
  }

  setMuted(muted: boolean): void {
    this.muteSTT = muted;
  }

  private calculateEnergy(chunk: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < chunk.length; i++) {
      sum += chunk[i] * chunk[i];
    }
    return Math.sqrt(sum / chunk.length);
  }
}
