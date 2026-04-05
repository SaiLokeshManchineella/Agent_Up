import { describe, it, expect, vi } from 'vitest';
import { SentenceDetector } from '../lib/voice/sentence-detector';

describe('SentenceDetector', () => {
  it('should detect a simple sentence ending with period', () => {
    const onSentence = vi.fn();
    const detector = new SentenceDetector(onSentence);

    detector.addToken('Hello there. ');
    expect(onSentence).toHaveBeenCalledWith('Hello there.');
  });

  it('should detect sentences ending with exclamation mark', () => {
    const onSentence = vi.fn();
    const detector = new SentenceDetector(onSentence);

    detector.addToken('Stop right now! ');
    expect(onSentence).toHaveBeenCalledWith('Stop right now!');
  });

  it('should detect sentences ending with question mark', () => {
    const onSentence = vi.fn();
    const detector = new SentenceDetector(onSentence);

    detector.addToken('Can you help me? ');
    expect(onSentence).toHaveBeenCalledWith('Can you help me?');
  });

  it('should handle streaming tokens across sentence boundary', () => {
    const onSentence = vi.fn();
    const detector = new SentenceDetector(onSentence);

    detector.addToken('I under');
    detector.addToken('stand your');
    detector.addToken(' frustration.');
    detector.addToken(' Let me');
    expect(onSentence).toHaveBeenCalledTimes(1);
    expect(onSentence).toHaveBeenCalledWith('I understand your frustration.');
  });

  it('should detect multiple sentences in a stream', () => {
    const onSentence = vi.fn();
    const detector = new SentenceDetector(onSentence);

    detector.addToken('First sentence. Second sentence. ');
    expect(onSentence).toHaveBeenCalledTimes(2);
    expect(onSentence).toHaveBeenNthCalledWith(1, 'First sentence.');
    expect(onSentence).toHaveBeenNthCalledWith(2, 'Second sentence.');
  });

  it('should not split on abbreviations like Mr. or Dr.', () => {
    const onSentence = vi.fn();
    const detector = new SentenceDetector(onSentence);

    detector.addToken('Mr. Smith is here. ');
    expect(onSentence).toHaveBeenCalledTimes(1);
    expect(onSentence).toHaveBeenCalledWith('Mr. Smith is here.');
  });

  it('should not split on decimal numbers', () => {
    const onSentence = vi.fn();
    const detector = new SentenceDetector(onSentence);

    detector.addToken('The charge is $3.14 today. ');
    expect(onSentence).toHaveBeenCalledTimes(1);
    expect(onSentence).toHaveBeenCalledWith('The charge is $3.14 today.');
  });

  it('should not split on ellipsis', () => {
    const onSentence = vi.fn();
    const detector = new SentenceDetector(onSentence);

    detector.addToken('Well... I think so. ');
    // The ellipsis should not cause a split, only the final period
    expect(onSentence).toHaveBeenCalledTimes(1);
  });

  it('should flush remaining text', () => {
    const onSentence = vi.fn();
    const detector = new SentenceDetector(onSentence);

    detector.addToken('Incomplete sentence without period');
    expect(onSentence).not.toHaveBeenCalled();

    detector.flush();
    expect(onSentence).toHaveBeenCalledWith(
      'Incomplete sentence without period'
    );
  });

  it('should not flush empty buffer', () => {
    const onSentence = vi.fn();
    const detector = new SentenceDetector(onSentence);

    detector.flush();
    expect(onSentence).not.toHaveBeenCalled();
  });

  it('should reset buffer correctly', () => {
    const onSentence = vi.fn();
    const detector = new SentenceDetector(onSentence);

    detector.addToken('Some text');
    detector.reset();
    detector.flush();
    expect(onSentence).not.toHaveBeenCalled();
  });
});
