// AudioWorklet-based mic capture with ring buffer
// Captures PCM audio for Deepgram STT
// Falls back to ScriptProcessorNode if AudioWorklet unavailable

export class AudioCapture {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private onAudioChunk: ((chunk: Float32Array) => void) | null = null;
  private useWorklet = false;

  async start(onAudioChunk: (chunk: Float32Array) => void): Promise<void> {
    this.onAudioChunk = onAudioChunk;

    // Request mic with preprocessing constraints
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000,
        channelCount: 1,
      },
    });

    this.audioContext = new AudioContext({ sampleRate: 16000 });

    // Resume AudioContext if browser policy suspended it (requires user gesture)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

    // Audio preprocessing chain
    const highPassFilter = this.audioContext.createBiquadFilter();
    highPassFilter.type = 'highpass';
    highPassFilter.frequency.value = 100;

    const compressor = this.audioContext.createDynamicsCompressor();
    compressor.threshold.value = -50;
    compressor.knee.value = 40;
    compressor.ratio.value = 12;
    compressor.attack.value = 0;
    compressor.release.value = 0.25;

    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 2048;

    // Connect preprocessing chain
    this.sourceNode.connect(highPassFilter);
    highPassFilter.connect(compressor);
    compressor.connect(this.analyserNode);

    // Try AudioWorklet first, fall back to ScriptProcessorNode
    try {
      await this.audioContext.audioWorklet.addModule('/audio-worklet-processor.js');

      this.workletNode = new AudioWorkletNode(this.audioContext, 'audio-capture-processor');
      this.workletNode.port.onmessage = (event) => {
        if (event.data.type === 'audio') {
          this.onAudioChunk?.(event.data.chunk);
        }
      };

      this.analyserNode.connect(this.workletNode);
      this.workletNode.connect(this.audioContext.destination);
      this.useWorklet = true;
    } catch {
      // Fallback: ScriptProcessorNode (deprecated but widely supported)
      this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
      this.scriptProcessor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const chunk = new Float32Array(inputData.length);
        chunk.set(inputData);
        this.onAudioChunk?.(chunk);
      };

      this.analyserNode.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);
      this.useWorklet = false;
    }
  }

  getAnalyserNode(): AnalyserNode | null {
    return this.analyserNode;
  }

  getAudioLevel(): number {
    if (!this.analyserNode) return 0;
    const data = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteTimeDomainData(data);

    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const normalized = (data[i] - 128) / 128;
      sum += normalized * normalized;
    }
    return Math.sqrt(sum / data.length);
  }

  stop(): void {
    // Disconnect nodes
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor.onaudioprocess = null;
      this.scriptProcessor = null;
    }
    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.onAudioChunk = null;
  }
}
