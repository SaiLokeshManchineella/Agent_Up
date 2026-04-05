import { describe, it, expect } from 'vitest';
import { TurnDetector } from '../lib/voice/turn-detector';

describe('TurnDetector', () => {
  const detector = new TurnDetector();

  describe('completion patterns', () => {
    it('should detect sentence-ending punctuation as complete', () => {
      const result = detector.analyze('I need help with my bill.');
      expect(result.decision).toBe('complete');
      expect(result.silenceThresholdMs).toBeLessThanOrEqual(350);
    });

    it('should detect "thank you" as complete', () => {
      const result = detector.analyze('Okay thank you');
      expect(result.decision).toBe('complete');
    });

    it('should detect "goodbye" as complete', () => {
      const result = detector.analyze('Alright goodbye');
      expect(result.decision).toBe('complete');
    });

    it('should detect "that\'s all" as complete', () => {
      const result = detector.analyze("Yes that's all");
      expect(result.decision).toBe('complete');
    });
  });

  describe('continuation patterns', () => {
    it('should detect trailing conjunctions as continuing', () => {
      const result = detector.analyze('I was charged incorrectly and');
      expect(result.decision).toBe('continuing');
      expect(result.silenceThresholdMs).toBeGreaterThanOrEqual(800);
    });

    it('should detect "because" as continuing', () => {
      const result = detector.analyze('I want to cancel because');
      expect(result.decision).toBe('continuing');
    });

    it('should detect "I want to" as continuing', () => {
      const result = detector.analyze("The thing is I'd like to");
      expect(result.decision).toBe('continuing');
    });
  });

  describe('filler/thinking patterns', () => {
    it('should detect "um" as thinking', () => {
      const result = detector.analyze('Well the thing is um');
      expect(result.decision).toBe('thinking');
      expect(result.silenceThresholdMs).toBeGreaterThanOrEqual(1200);
    });

    it('should detect "you know" as thinking', () => {
      const result = detector.analyze('I was trying to you know');
      expect(result.decision).toBe('thinking');
    });
  });

  describe('short utterances', () => {
    it('should return continuing for too-short text', () => {
      const result = detector.analyze('Hi');
      expect(result.decision).toBe('continuing');
      expect(result.silenceThresholdMs).toBe(500); // base threshold
    });
  });

  describe('no-pattern match', () => {
    it('should default to complete for longer text without patterns', () => {
      const result = detector.analyze(
        'I was charged forty nine dollars on my statement last month'
      );
      expect(result.decision).toBe('complete');
    });

    it('should have a shorter threshold for long utterances', () => {
      const result = detector.analyze(
        'I was charged forty nine dollars on my statement last month and I really need some help'
      );
      // > 10 words → length bonus reduces threshold
      expect(result.silenceThresholdMs).toBeLessThanOrEqual(400);
    });
  });

  describe('custom config', () => {
    it('should accept custom thresholds', () => {
      const custom = new TurnDetector({
        completeSilenceMs: 200,
        thinkingSilenceMs: 2000,
      });

      const complete = custom.analyze('Thank you.');
      expect(complete.silenceThresholdMs).toBe(200);

      const thinking = custom.analyze('Well the thing um');
      expect(thinking.silenceThresholdMs).toBe(2000);
    });
  });
});
