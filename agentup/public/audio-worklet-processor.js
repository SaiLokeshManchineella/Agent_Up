// AudioWorkletProcessor for mic capture
// Runs in a separate audio thread — zero GC pressure on main thread
// Captures PCM 16-bit, 16kHz mono with ring buffer

class AudioCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.writeIndex = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channelData = input[0];

    for (let i = 0; i < channelData.length; i++) {
      this.buffer[this.writeIndex] = channelData[i];
      this.writeIndex++;

      // When buffer is full, post it to main thread
      if (this.writeIndex >= this.bufferSize) {
        // Copy buffer to avoid mutation
        const chunk = new Float32Array(this.buffer);
        this.port.postMessage({ type: 'audio', chunk }, [chunk.buffer]);

        // Reset ring buffer
        this.buffer = new Float32Array(this.bufferSize);
        this.writeIndex = 0;
      }
    }

    return true;
  }
}

registerProcessor('audio-capture-processor', AudioCaptureProcessor);
