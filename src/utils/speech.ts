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
    this.recognition.continuous = false;
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
      } catch (e) {}
      this.currentAudio = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.currentUtterance = null;
    }
    if (this.onEndCallback) {
      const cb = this.onEndCallback;
      this.onEndCallback = null;
      cb();
    }
  }

  public play(
    text: string,
    audioBase64?: string | null,
    options: {
      rate?: number;
      accent?: string;
      onEnd?: () => void;
      onError?: (err: any) => void;
    } = {}
  ) {
    this.stop();
    this.onEndCallback = options.onEnd || null;

    const rate = options.rate || 1.0;

    // 1. If we have Gemini generated audio base64, play it
    if (audioBase64) {
      try {
        const audioSrc = audioBase64.startsWith('data:')
          ? audioBase64
          : `data:audio/wav;base64,${audioBase64}`;

        const audio = new Audio(audioSrc);
        audio.playbackRate = rate;
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
          console.warn('WAV playback failed, fallback to Web Speech:', e);
          this.playWebSpeech(text, rate, options.accent, options.onEnd);
        };

        audio.play().catch((err) => {
          console.warn('Autoplay blocked or audio failed, fallback to Web Speech:', err);
          this.playWebSpeech(text, rate, options.accent, options.onEnd);
        });

        return;
      } catch (err) {
        console.warn('Error initiating audio element:', err);
      }
    }

    // 2. Fallback to Web Speech API
    this.playWebSpeech(text, rate, options.accent, options.onEnd);
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

    // Select suitable voice
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
