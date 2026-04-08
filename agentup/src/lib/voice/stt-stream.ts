// Deepgram streaming STT client via WebSocket
// Sends PCM audio chunks, receives interim and final transcripts
// Includes exponential backoff reconnection and speech_final event support

import { VOICE_CONFIG } from './voice-config';

export interface STTCallbacks {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onSpeechFinal: () => void; // Deepgram VAD endpoint — high-confidence turn end
  onError: (error: string) => void;
}

export interface STTOptions extends STTCallbacks {
  prompt?: string;
}

export class DeepgramSTTStream {
  private ws: WebSocket | null = null;
  private callbacks: STTCallbacks | null = null;
  private prompt: string | null = null;
  private keepAliveInterval: ReturnType<typeof setInterval> | null = null;
  private disconnected = false;

  // Reconnection state
  private apiKey: string | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isReconnecting = false;
  private audioBuffer: ArrayBuffer[] = [];
  private audioBufferBytes = 0; // Track total buffered bytes

  async connect(
    apiKey: string,
    options: STTOptions
  ): Promise<void> {
    this.apiKey = apiKey;
    this.callbacks = options;
    this.prompt = options.prompt || null;
    this.disconnected = false;
    this.reconnectAttempts = 0;

    await this.createConnection();
  }

  private async createConnection(): Promise<void> {
    const baseUrl = `wss://api.deepgram.com/v1/listen?model=nova-2&language=en&smart_format=true&interim_results=true&endpointing=300&vad_events=true&utterance_end_ms=1000&encoding=linear16&sample_rate=16000&channels=1`;
    const url = this.prompt 
        ? `${baseUrl}&prompt=${encodeURIComponent(this.prompt)}`
        : baseUrl;

    return new Promise((resolve, reject) => {
      let settled = false;

      this.ws = new WebSocket(url, ['token', this.apiKey!]);

      this.ws.onopen = () => {
        settled = true;
        this.reconnectAttempts = 0;
        this.isReconnecting = false;

        // Flush any audio buffered during reconnection
        try {
          for (const buf of this.audioBuffer) {
            if (this.ws?.readyState === WebSocket.OPEN) {
              this.ws.send(buf);
            }
          }
        } finally {
          // Always clear buffer, even if send throws
          this.audioBuffer = [];
          this.audioBufferBytes = 0;
        }

        // Send keepalive pings every 8s to prevent timeout
        this.keepAliveInterval = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'KeepAlive' }));
          }
        }, VOICE_CONFIG.STT_KEEPALIVE_INTERVAL_MS);
        resolve();
      };

      this.ws.onmessage = (event) => {
        if (this.disconnected) return; // Ignore ghost messages after disconnect

        try {
          const data = JSON.parse(event.data);

          // Handle speech_final — Deepgram's high-confidence endpoint detection
          // This fires when Deepgram's VAD is confident the speaker has stopped
          if (data.type === 'UtteranceEnd') {
            this.callbacks?.onSpeechFinal?.();
            return;
          }

          if (data.type === 'Results' && data.channel?.alternatives?.[0]) {
            const transcript = data.channel.alternatives[0].transcript;
            if (!transcript) return;

            if (data.is_final) {
              // Check speech_final flag from endpointing
              if (data.speech_final) {
                this.callbacks?.onFinal?.(transcript);
                this.callbacks?.onSpeechFinal?.();
              } else {
                this.callbacks?.onFinal?.(transcript);
              }
            } else {
              this.callbacks?.onInterim?.(transcript);
            }
          }
        } catch {
          // Ignore parse errors
        }
      };

      this.ws.onerror = () => {
        if (!settled) {
          settled = true;
          reject(new Error('Deepgram WebSocket connection failed'));
        } else {
          // Post-connection error — attempt reconnect
          this.attemptReconnect();
        }
      };

      this.ws.onclose = (event) => {
        this.clearKeepAlive();

        if (!settled) {
          settled = true;
          reject(new Error('Deepgram WebSocket closed before connecting'));
        } else if (!this.disconnected) {
          // Unexpected disconnect — attempt reconnection
          this.attemptReconnect();
        }
      };
    });
  }

  // Exponential backoff reconnection
  private attemptReconnect(): void {
    if (this.disconnected || this.isReconnecting) return;
    if (this.reconnectAttempts >= VOICE_CONFIG.STT_MAX_RECONNECT_ATTEMPTS) {
      this.callbacks?.onError?.(
        `Deepgram connection lost after ${VOICE_CONFIG.STT_MAX_RECONNECT_ATTEMPTS} reconnection attempts`
      );
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;

    // Exponential backoff: 500ms, 1s, 2s, 4s, 8s
    const delay = Math.min(
      VOICE_CONFIG.STT_RECONNECT_BASE_DELAY_MS * Math.pow(2, this.reconnectAttempts - 1),
      VOICE_CONFIG.STT_RECONNECT_MAX_DELAY_MS
    );

    console.log(
      `Deepgram reconnecting (attempt ${this.reconnectAttempts}/${VOICE_CONFIG.STT_MAX_RECONNECT_ATTEMPTS}) in ${delay}ms...`
    );

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.createConnection();
        console.log('Deepgram reconnected successfully');
      } catch {
        this.isReconnecting = false;
        this.attemptReconnect(); // Retry
      }
    }, delay);
  }

  sendAudio(chunk: Float32Array): void {
    // Convert Float32 to Int16 PCM
    const pcm = new Int16Array(chunk.length);
    for (let i = 0; i < chunk.length; i++) {
      const s = Math.max(-1, Math.min(1, chunk[i]));
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    if (this.ws?.readyState === WebSocket.OPEN && !this.disconnected) {
      this.ws.send(pcm.buffer);
    } else if (this.isReconnecting) {
      // Buffer audio during reconnection so we don't lose speech
      // Cap at ~64KB (16000 samples/s * 2 bytes * 2s)
      const MAX_BUFFER_BYTES = 65536;
      if (this.audioBufferBytes < MAX_BUFFER_BYTES) {
        this.audioBuffer.push(pcm.buffer);
        this.audioBufferBytes += pcm.buffer.byteLength;
      }
    }
  }

  disconnect(): void {
    this.disconnected = true;
    // Null out callbacks to prevent ghost messages
    this.callbacks = null;

    this.clearKeepAlive();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.audioBuffer = [];
    this.audioBufferBytes = 0;

    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'CloseStream' }));
        } catch {
          // Ignore send errors during close
        }
      }
      this.ws.close();
      this.ws = null;
    }
  }

  private clearKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }
}
