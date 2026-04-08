// Server-Proxied STT Stream
// Instead of connecting to Deepgram directly from the browser,
// this client sends audio to /api/stt-proxy and receives transcripts via SSE.
//
// Advantages over direct connection:
// 1. API key never leaves the server
// 2. Server can log/replay audio
// 3. Server handles reconnection
// 4. Includes word-level confidence data for prosodic analysis

import { VOICE_CONFIG } from './voice-config';

export interface ProxySTTCallbacks {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onSpeechFinal: () => void;
  onWordData: (words: WordData[]) => void; // For prosodic analysis
  onError: (error: string) => void;
}

export interface WordData {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

export interface ProxySTTOptions extends ProxySTTCallbacks {
  prompt?: string;
}

export class ProxySTTStream {
  private callbacks: ProxySTTCallbacks | null = null;
  private prompt: string | null = null;
  private sessionId: string | null = null;
  private disconnected = false;
  private audioSendInterval: ReturnType<typeof setInterval> | null = null;
  private audioQueue: string[] = []; // Base64 encoded audio chunks
  private isSending = false;

  async connect(options: ProxySTTOptions): Promise<void> {
    this.callbacks = options;
    this.prompt = options.prompt || null;
    this.disconnected = false;
    this.sessionId = `stt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Start SSE stream for transcripts
    const res = await fetch('/api/stt-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'start', 
        sessionId: this.sessionId,
        prompt: this.prompt // Titan Advanced STT: Pass context to proxy
      }),
    });

    if (!res.ok || !res.body) {
      this.callbacks?.onError?.('Failed to start STT proxy session');
      return;
    }

    // Read SSE stream
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let lineBuffer = '';

    const readLoop = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done || this.disconnected) break;

          lineBuffer += decoder.decode(value, { stream: true });
          const lines = lineBuffer.split('\n');
          lineBuffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(line.slice(6));
              this.handleMessage(data);
            } catch {
              // Ignore parse errors
            }
          }
        }
      } catch (error) {
        if (!this.disconnected) {
          this.callbacks?.onError?.('STT proxy connection lost');
        }
      }
    };

    readLoop();

    // Batch audio sends every 100ms to reduce HTTP overhead
    this.audioSendInterval = setInterval(() => {
      this.flushAudioQueue();
    }, 100);
  }

  private handleMessage(data: {
    type: string;
    transcript?: string;
    is_final?: boolean;
    speech_final?: boolean;
    confidence?: number;
    words?: WordData[];
    message?: string;
  }): void {
    if (this.disconnected) return;

    switch (data.type) {
      case 'transcript':
        if (data.transcript) {
          // Forward word-level data for prosodic analysis
          if (data.words && data.words.length > 0) {
            this.callbacks?.onWordData?.(data.words);
          }

          if (data.is_final) {
            this.callbacks?.onFinal?.(data.transcript);
            if (data.speech_final) {
              this.callbacks?.onSpeechFinal?.();
            }
          } else {
            this.callbacks?.onInterim?.(data.transcript);
          }
        }
        break;

      case 'utterance_end':
        this.callbacks?.onSpeechFinal?.();
        break;

      case 'error':
        this.callbacks?.onError?.(data.message || 'STT error');
        break;

      case 'closed':
        if (!this.disconnected) {
          this.callbacks?.onError?.('STT session closed');
        }
        break;
    }
  }

  sendAudio(chunk: Float32Array): void {
    if (this.disconnected || !this.sessionId) return;

    // Convert Float32 to Int16 PCM
    const pcm = new Int16Array(chunk.length);
    for (let i = 0; i < chunk.length; i++) {
      const s = Math.max(-1, Math.min(1, chunk[i]));
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    // Convert to base64 for JSON transport
    const bytes = new Uint8Array(pcm.buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    this.audioQueue.push(btoa(binary));
  }

  private async flushAudioQueue(): Promise<void> {
    if (this.isSending || this.audioQueue.length === 0 || !this.sessionId || this.disconnected) return;

    this.isSending = true;

    // Concatenate all queued chunks
    const chunks = this.audioQueue.splice(0);
    const combined = chunks.join('');

    try {
      await fetch('/api/stt-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'audio',
          sessionId: this.sessionId,
          audio: combined,
        }),
      });
    } catch {
      // Non-critical — audio chunk lost, STT will handle gaps
    } finally {
      this.isSending = false;
    }
  }

  disconnect(): void {
    this.disconnected = true;
    this.callbacks = null;

    if (this.audioSendInterval) {
      clearInterval(this.audioSendInterval);
      this.audioSendInterval = null;
    }

    this.audioQueue = [];

    if (this.sessionId) {
      // Fire-and-forget cleanup
      fetch('/api/stt-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop', sessionId: this.sessionId }),
      }).catch(() => {});
      this.sessionId = null;
    }
  }
}
