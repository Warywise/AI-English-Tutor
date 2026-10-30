// Speech recognition and audio synthesis utilities

// Browser SpeechRecognition definition
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const win = window as unknown as IWindow;
  return !!(win.SpeechRecognition || win.webkitSpeechRecognition);
}

export interface SpeechRecognitionHandlers {
  onStart?: () => void;
  onInterimResult?: (transcript: string) => void;
  onFinalResult?: (transcript: string) => void;
  onSessionTranscript?: (finalText: string, interimText: string) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

/**
 * Intelligently merges speech transcript segments, handling:
 * 1. Mobile Android Chrome bug where results accumulate full utterance repeatedly
 *    (e.g., ["let's", "let's talk", "let's talk about", "let's talk about something"])
 * 2. Standard desktop Chrome behavior where results are disjoint segments
 *    (e.g., ["let's", "talk", "about", "something"])
 * 3. Partial phrase overlaps at segment boundaries
 */
export function mergeSpeechSegments(segments: string[]): string {
  let merged = '';

  const clean = (s: string) => s.toLowerCase().replace(/[.,!?;:"'—\-]/g, '').replace(/\s+/g, ' ').trim();

  for (const raw of segments) {
    const segment = (raw || '').trim();
    if (!segment) continue;

    if (!merged) {
      merged = segment;
      continue;
    }

    const normMerged = clean(merged);
    const normSegment = clean(segment);

    if (!normSegment) continue;

    // 1. Android cumulative replacement: new segment starts with or is a continuation of merged
    if (normSegment.startsWith(normMerged)) {
      merged = segment;
      continue;
    }

    // 2. Redundant duplicate or substring: new segment is already included inside merged
    if (normMerged.includes(normSegment)) {
      continue;
    }

    // 3. Merged is a superset of the segment
    if (normMerged.startsWith(normSegment)) {
      continue;
    }

    // 4. Overlap check by words at boundary
    const mergedWords = merged.split(/\s+/);
    const segmentWords = segment.split(/\s+/);

    let maxOverlap = 0;
    const maxCheck = Math.min(mergedWords.length, segmentWords.length, 6);

    for (let overlap = maxCheck; overlap >= 1; overlap--) {
      const mergedTail = mergedWords.slice(-overlap).map(clean).join(' ');
      const segmentHead = segmentWords.slice(0, overlap).map(clean).join(' ');

      if (mergedTail && mergedTail === segmentHead) {
        maxOverlap = overlap;
        break;
      }
    }

    if (maxOverlap > 0) {
      const remainingWords = segmentWords.slice(maxOverlap).join(' ');
      if (remainingWords) {
        merged = `${merged} ${remainingWords}`;
      }
    } else {
      // Disjoint segment (standard desktop behavior)
      merged = `${merged} ${segment}`;
    }
  }

  return merged.trim();
}

export class SpeechRecognizer {
  private recognition: any = null;
  private isListening: boolean = false;
  private lang: string = 'en-US';

  constructor(lang: string = 'en-US') {
    this.lang = lang;
  }

  public setLanguage(lang: string) {
    this.lang = lang;
    if (this.recognition) {
      try {
        this.recognition.lang = lang;
      } catch (e) {}
    }
  }

  public start(handlers: SpeechRecognitionHandlers) {
    this.stop();

    if (typeof window === 'undefined') return;
    const win = window as unknown as IWindow;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      handlers.onError?.('Speech Recognition is not supported in this browser.');
      return;
    }

    try {
      // Always create a fresh instance per recording session to avoid "network" error on reusing dead instances in Chrome
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = this.lang;
      recognition.maxAlternatives = 1;
      this.recognition = recognition;

      recognition.onstart = () => {
        this.isListening = true;
        handlers.onStart?.();
      };

      recognition.onresult = (event: any) => {
        const finalChunks: string[] = [];
        const interimChunks: string[] = [];

        // Collect all chunks emitted by speech recognition engine
        for (let i = 0; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res && res[0] && res[0].transcript) {
            const transcript = res[0].transcript.trim();
            if (!transcript) continue;

            if (res.isFinal) {
              finalChunks.push(transcript);
            } else {
              interimChunks.push(transcript);
            }
          }
        }

        const fullFinal = mergeSpeechSegments(finalChunks);
        let currentInterim = mergeSpeechSegments(interimChunks);

        // Deduplicate interim against already-finalized text
        if (fullFinal && currentInterim) {
          const combined = mergeSpeechSegments([fullFinal, currentInterim]);
          if (combined.toLowerCase().startsWith(fullFinal.toLowerCase())) {
            currentInterim = combined.slice(fullFinal.length).trim();
          } else if (fullFinal.toLowerCase().includes(currentInterim.toLowerCase())) {
            currentInterim = '';
          }
        }

        if (handlers.onSessionTranscript) {
          handlers.onSessionTranscript(fullFinal, currentInterim);
        } else {
          if (currentInterim) handlers.onInterimResult?.(currentInterim);
          if (fullFinal) handlers.onFinalResult?.(fullFinal);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error event:', event.error);
        if (event.error === 'no-speech' || event.error === 'aborted') {
          return;
        }
        this.isListening = false;
        handlers.onError?.(event.error);
      };

      recognition.onend = () => {
        this.isListening = false;
        handlers.onEnd?.();
      };

      recognition.start();
    } catch (e: any) {
      this.isListening = false;
      console.warn('Recognition start exception:', e);
      handlers.onError?.(e.message || 'Error starting speech recognition');
    }
  }

  public stop() {
    this.isListening = false;
    if (this.recognition) {
      const rec = this.recognition;
      this.recognition = null;
      try {
        rec.abort();
      } catch (e) {
        try {
          rec.stop();
        } catch (e2) {}
      }
    }
  }

  public getStatus() {
    return this.isListening;
  }
}

// Pre-unlocked audio instance for mobile browsers (iOS Safari / Android Chrome)
let sharedAudioElement: HTMLAudioElement | null = null;
let audioContextUnlocked = false;

/**
 * Prime and unlock audio capabilities on mobile devices during a direct user touch/click gesture.
 * This ensures that subsequent asynchronous playback from server responses is not blocked by browser autoplay policy.
 */
export function unlockMobileAudio() {
  if (typeof window === 'undefined') return;
  if (!sharedAudioElement) {
    sharedAudioElement = new Audio();
  }

  if (!audioContextUnlocked) {
    try {
      // Play a tiny silent data URI to unlock audio on iOS and Android
      sharedAudioElement.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
      const playPromise = sharedAudioElement.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            audioContextUnlocked = true;
          })
          .catch(() => {
            // Browser might still require explicit click on play button
          });
      }
    } catch (e) {
      // ignore
    }
  }
}

// Global audio player manager
class GlobalAudioPlayer {
  private currentAudio: HTMLAudioElement | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private onEndCallback: (() => void) | null = null;
  private playSessionId: number = 0;

  public stop() {
    // Invalidate any in-flight asynchronous TTS requests so they never restart playback
    this.playSessionId++;

    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio.src = '';
      } catch (e) {}
      this.currentAudio = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
      this.currentUtterance = null;
    }
    this.onEndCallback = null;
  }

  public isPlaying(): boolean {
    return !!this.currentAudio && !this.currentAudio.paused;
  }

  public async play(
    text: string,
    audioBase64?: string | null,
    options: {
      rate?: number;
      accent?: string;
      voiceId?: string;
      allowBrowserFallback?: boolean;
      onEnd?: () => void;
      onError?: (err: any) => void;
    } = {}
  ): Promise<void> {
    this.stop();
    const sessionId = this.playSessionId;
    this.onEndCallback = options.onEnd || null;

    const rate = options.rate || 1.0;

    // 1. If we have Gemini generated audio base64, play it with high fidelity
    if (audioBase64) {
      this.playBase64Audio(audioBase64, sessionId, rate, options);
      return;
    }

    // 2. If no audioBase64 was provided but we have text, fetch high-quality TTS from /api/tts
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceId: options.voiceId || 'alex',
          accent: options.accent || 'American',
        }),
      });

      // If user clicked Stop while fetch was running, do not play!
      if (this.playSessionId !== sessionId) return;

      if (res.ok) {
        const data = await res.json();
        if (this.playSessionId !== sessionId) return;

        if (data.audioBase64) {
          this.playBase64Audio(data.audioBase64, sessionId, rate, options);
          return;
        }
      }
    } catch (apiErr) {
      console.warn('Dedicated TTS fetch failed:', apiErr);
    }

    if (this.playSessionId !== sessionId) return;

    // 3. Fallback to Web Speech if server neural audio is unavailable so user always hears speech
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.playWebSpeech(text, rate, options.accent, options.onEnd);
    } else {
      if (this.onEndCallback) {
        const cb = this.onEndCallback;
        this.onEndCallback = null;
        cb();
      }
    }
  }

  private playBase64Audio(
    audioBase64: string,
    sessionId: number,
    rate: number,
    options: { onEnd?: () => void; onError?: (err: any) => void }
  ) {
    if (this.playSessionId !== sessionId) return;

    try {
      const audioSrc = audioBase64.startsWith('data:')
        ? audioBase64
        : `data:audio/wav;base64,${audioBase64}`;

      const audio = sharedAudioElement || new Audio();
      audio.src = audioSrc;
      audio.playbackRate = Math.max(0.5, Math.min(2.0, rate));
      this.currentAudio = audio;

      audio.onended = () => {
        if (this.playSessionId !== sessionId) return;
        this.currentAudio = null;
        if (this.onEndCallback) {
          const cb = this.onEndCallback;
          this.onEndCallback = null;
          cb();
        }
      };

      audio.onerror = (e) => {
        if (this.playSessionId !== sessionId) return;
        console.warn('Neural audio playback failed:', e);
        this.currentAudio = null;
        options.onError?.(e);
        if (this.onEndCallback) {
          const cb = this.onEndCallback;
          this.onEndCallback = null;
          cb();
        }
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          if (this.playSessionId !== sessionId) return;
          console.warn('Mobile autoplay blocked or audio play failed:', err);
          this.currentAudio = null;
          options.onError?.(err);
          if (this.onEndCallback) {
            const cb = this.onEndCallback;
            this.onEndCallback = null;
            cb();
          }
        });
      }
    } catch (err) {
      if (this.playSessionId !== sessionId) return;
      console.warn('Error initiating audio element:', err);
      options.onError?.(err);
    }
  }

  private playWebSpeech(
    text: string,
    rate: number = 1.0,
    accent: string = 'American',
    onEnd?: () => void
  ) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = Math.max(0.7, Math.min(1.5, rate));
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    let targetLang = 'en-US';
    if (accent === 'British') targetLang = 'en-GB';
    if (accent === 'Australian') targetLang = 'en-AU';

    const matchedVoice =
      voices.find((v) => v.lang.startsWith(targetLang)) ||
      voices.find((v) => v.lang.startsWith('en')) ||
      voices[0];

    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onend = () => {
      this.currentUtterance = null;
      if (this.onEndCallback) {
        const cb = this.onEndCallback;
        this.onEndCallback = null;
        cb();
      }
    };

    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      this.currentUtterance = null;
      if (this.onEndCallback) {
        const cb = this.onEndCallback;
        this.onEndCallback = null;
        cb();
      }
    };

    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }
}

export const audioPlayer = new GlobalAudioPlayer();
