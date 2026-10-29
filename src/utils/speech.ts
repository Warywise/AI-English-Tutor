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
  onError?: (error: string) => void;
  onEnd?: () => void;
}

export class SpeechRecognizer {
  private recognition: any = null;
  private isListening: boolean = false;
  private lang: string = 'en-US';

  constructor(lang: string = 'en-US') {
    this.lang = lang;
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;
    const win = window as unknown as IWindow;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;

    this.recognition = new SpeechRecognitionClass();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.lang;
    this.recognition.maxAlternatives = 1;
  }

  public setLanguage(lang: string) {
    this.lang = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  public start(handlers: SpeechRecognitionHandlers) {
    if (!this.recognition) {
      this.init();
    }
    if (!this.recognition) {
      handlers.onError?.('Speech Recognition is not supported in this browser.');
      return;
    }

    try {
      this.recognition.onstart = () => {
        this.isListening = true;
        handlers.onStart?.();
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (interimTranscript) {
          handlers.onInterimResult?.(interimTranscript);
        }
        if (finalTranscript) {
          handlers.onFinalResult?.(finalTranscript);
        }
      };

      this.recognition.onerror = (event: any) => {
        this.isListening = false;
        console.warn('Speech recognition error:', event.error);
        handlers.onError?.(event.error);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        handlers.onEnd?.();
      };

      this.recognition.start();
    } catch (e: any) {
      this.isListening = false;
      console.warn('Recognition start exception:', e);
      handlers.onError?.(e.message || 'Error starting speech recognition');
    }
  }

  public stop() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
    }
    this.isListening = false;
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

  public stop() {
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
    if (this.onEndCallback) {
      const cb = this.onEndCallback;
      this.onEndCallback = null;
      cb();
    }
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
    this.onEndCallback = options.onEnd || null;

    const rate = options.rate || 1.0;

    // 1. If we have Gemini generated audio base64, play it with high fidelity
    if (audioBase64) {
      try {
        const audioSrc = audioBase64.startsWith('data:')
          ? audioBase64
          : `data:audio/wav;base64,${audioBase64}`;

        const audio = sharedAudioElement || new Audio();
        audio.src = audioSrc;
        audio.playbackRate = Math.max(0.5, Math.min(2.0, rate));
        this.currentAudio = audio;

        audio.onended = () => {
          this.currentAudio = null;
          if (this.onEndCallback) {
            const cb = this.onEndCallback;
            this.onEndCallback = null;
            cb();
          }
        };

        audio.onerror = (e) => {
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

        return;
      } catch (err) {
        console.warn('Error initiating audio element:', err);
        options.onError?.(err);
        return;
      }
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

      if (res.ok) {
        const data = await res.json();
        if (data.audioBase64) {
          return this.play(text, data.audioBase64, options);
        }
      }
    } catch (apiErr) {
      console.warn('Dedicated TTS fetch failed:', apiErr);
    }

    // 3. Fallback to Web Speech ONLY if explicitly allowed by user settings (never forced on mobile)
    if (options.allowBrowserFallback) {
      this.playWebSpeech(text, rate, options.accent, options.onEnd);
    } else {
      if (this.onEndCallback) {
        const cb = this.onEndCallback;
        this.onEndCallback = null;
        cb();
      }
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
