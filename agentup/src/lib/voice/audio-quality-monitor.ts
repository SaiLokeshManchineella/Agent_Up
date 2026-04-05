// Audio Quality Monitor
// Monitors real-time audio quality metrics and provides user feedback
//
// Metrics tracked:
// - SNR (Signal-to-Noise Ratio): warns if background noise is too high
// - Clipping: detects audio peaks hitting max (distortion)
// - Silence: detects if mic is muted or disconnected
// - Volume level: warns if speaking too quietly or too loudly

export type AudioQualityLevel = 'good' | 'fair' | 'poor';

export interface AudioQualityReport {
  level: AudioQualityLevel;
  snrDb: number;
  clippingRate: number; // 0-1, percentage of samples clipping
  isSilent: boolean;
  volumeDb: number;
  warning: string | null;
}

export class AudioQualityMonitor {
  // Noise floor estimation (exponential moving average)
  private noiseFloor = 0;
  private noiseFloorInitialized = false;
  private readonly NOISE_ALPHA = 0.02; // Slow adaptation for noise floor

  // Clipping detection
  private clippedSamples = 0;
  private totalSamples = 0;
  private readonly CLIP_THRESHOLD = 0.98; // Samples above this are "clipping"

  // Silence detection
  private consecutiveSilentFrames = 0;
  private readonly SILENCE_THRESHOLD = 0.005; // RMS below this = silence
  private readonly SILENCE_FRAMES_FOR_WARNING = 50; // ~2.5s at 50ms intervals

  // Volume tracking
  private recentRMS: number[] = [];
  private readonly RMS_WINDOW = 20; // Track last 20 frames (~1s)

  // Callback
  private onQualityChange: ((report: AudioQualityReport) => void) | null = null;
  private lastWarning: string | null = null;

  setCallback(cb: (report: AudioQualityReport) => void): void {
    this.onQualityChange = cb;
  }

  // Call this with each audio chunk (~50ms intervals)
  analyzeChunk(chunk: Float32Array): AudioQualityReport {
    const rms = this.calculateRMS(chunk);
    const peak = this.calculatePeak(chunk);

    // Update noise floor (only during quiet periods)
    if (rms < 0.02) {
      if (!this.noiseFloorInitialized) {
        this.noiseFloor = rms;
        this.noiseFloorInitialized = true;
      } else {
        this.noiseFloor = this.noiseFloor * (1 - this.NOISE_ALPHA) + rms * this.NOISE_ALPHA;
      }
    }

    // Clipping detection
    let clipped = 0;
    for (let i = 0; i < chunk.length; i++) {
      if (Math.abs(chunk[i]) >= this.CLIP_THRESHOLD) clipped++;
    }
    this.clippedSamples += clipped;
    this.totalSamples += chunk.length;

    const clippingRate = this.totalSamples > 0 ? this.clippedSamples / this.totalSamples : 0;

    // Silence detection
    if (rms < this.SILENCE_THRESHOLD) {
      this.consecutiveSilentFrames++;
    } else {
      this.consecutiveSilentFrames = 0;
    }
    const isSilent = this.consecutiveSilentFrames >= this.SILENCE_FRAMES_FOR_WARNING;

    // Volume tracking
    this.recentRMS.push(rms);
    if (this.recentRMS.length > this.RMS_WINDOW) {
      this.recentRMS.shift();
    }

    // Calculate SNR
    const signalPower = rms > 0 ? rms : 0.0001;
    const noisePower = this.noiseFloor > 0 ? this.noiseFloor : 0.0001;
    const snrDb = 20 * Math.log10(signalPower / noisePower);

    // Volume in dB (relative to full scale)
    const volumeDb = rms > 0 ? 20 * Math.log10(rms) : -100;

    // Determine quality level and warning
    let level: AudioQualityLevel = 'good';
    let warning: string | null = null;

    if (isSilent) {
      level = 'poor';
      warning = 'No audio detected — check your microphone';
    } else if (clippingRate > 0.01) {
      level = 'poor';
      warning = 'Audio is distorted — move away from the microphone';
    } else if (snrDb < 6 && rms > this.SILENCE_THRESHOLD) {
      level = 'poor';
      warning = 'Background noise is too high — move to a quieter area';
    } else if (snrDb < 12 && rms > this.SILENCE_THRESHOLD) {
      level = 'fair';
      warning = 'Background noise detected — audio quality may be affected';
    } else if (volumeDb < -40 && rms > this.SILENCE_THRESHOLD) {
      level = 'fair';
      warning = 'Speaking too quietly — move closer to the microphone';
    }

    const report: AudioQualityReport = {
      level,
      snrDb: Math.round(snrDb * 10) / 10,
      clippingRate: Math.round(clippingRate * 1000) / 1000,
      isSilent,
      volumeDb: Math.round(volumeDb * 10) / 10,
      warning,
    };

    // Only notify on warning changes to avoid spam
    if (warning !== this.lastWarning) {
      this.lastWarning = warning;
      this.onQualityChange?.(report);
    }

    return report;
  }

  private calculateRMS(chunk: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < chunk.length; i++) {
      sum += chunk[i] * chunk[i];
    }
    return Math.sqrt(sum / chunk.length);
  }

  private calculatePeak(chunk: Float32Array): number {
    let peak = 0;
    for (let i = 0; i < chunk.length; i++) {
      const abs = Math.abs(chunk[i]);
      if (abs > peak) peak = abs;
    }
    return peak;
  }

  // Reset counters (call between sessions)
  reset(): void {
    this.clippedSamples = 0;
    this.totalSamples = 0;
    this.consecutiveSilentFrames = 0;
    this.recentRMS = [];
    this.lastWarning = null;
    // Don't reset noiseFloor — it persists across sessions for calibration
  }

  getAverageVolume(): number {
    if (this.recentRMS.length === 0) return 0;
    const avg = this.recentRMS.reduce((a, b) => a + b, 0) / this.recentRMS.length;
    return avg;
  }
}
