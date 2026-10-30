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

export interface RecordedAudioResult {
  base64: string;
  mimeType: string;
  blobUrl: string;
  durationMs: number;
}

export function isVoiceRecordingSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    typeof window.MediaRecorder !== 'undefined'
  );
}

/**
 * Native MediaRecorder wrapper with WhatsApp-style Pause & Resume support.
 * While paused, zero bytes of audio are recorded and the timer is frozen.
 */
export class VoiceRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private mimeType: string = 'audio/webm';
  private activeStartTime: number = 0;
  private accumulatedMs: number = 0;

  private detectSupportedMimeType(): string {
    if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) {
      return '';
    }
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/aac',
    ];
    for (const type of candidates) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  }

  public async start(): Promise<void> {
    this.cancel();

    if (!isVoiceRecordingSupported()) {
      throw new Error('Gravação de áudio não suportada neste navegador.');
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch {
      // Fallback to basic audio constraints if advanced constraints fail on specific devices
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }

    const detectedMime = this.detectSupportedMimeType();
    this.mimeType = detectedMime || 'audio/webm';
    this.chunks = [];
    this.accumulatedMs = 0;
    this.activeStartTime = Date.now();

    let recorder: MediaRecorder;
    try {
      const options: MediaRecorderOptions = { audioBitsPerSecond: 32000 };
      if (detectedMime) options.mimeType = detectedMime;
      recorder = new MediaRecorder(this.stream, options);
    } catch {
      try {
        recorder = detectedMime
          ? new MediaRecorder(this.stream, { mimeType: detectedMime })
          : new MediaRecorder(this.stream);
      } catch {
        recorder = new MediaRecorder(this.stream);
      }
    }

    this.mediaRecorder = recorder;

    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };

    try {
      // Collect data chunks every 250ms so pause/stop always has up-to-date buffers
      recorder.start(250);
    } catch {
      recorder.start();
    }
  }

  public pause(): boolean {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      try {
        try {
          this.mediaRecorder.requestData();
        } catch {}
        this.mediaRecorder.pause();
        if (this.activeStartTime > 0) {
          this.accumulatedMs += Date.now() - this.activeStartTime;
          this.activeStartTime = 0;
        }
        return true;
      } catch (err) {
        console.warn('Failed to pause MediaRecorder:', err);
      }
    }
    return false;
  }

  public resume(): boolean {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      try {
        this.mediaRecorder.resume();
        this.activeStartTime = Date.now();
        return true;
      } catch (err) {
        console.warn('Failed to resume MediaRecorder:', err);
      }
    }
    return false;
  }

  public getState(): 'inactive' | 'recording' | 'paused' {
    return this.mediaRecorder ? this.mediaRecorder.state : 'inactive';
  }

  public stop(): Promise<RecordedAudioResult> {
    return new Promise((resolve, reject) => {
      const recorder = this.mediaRecorder;
      if (!recorder || recorder.state === 'inactive') {
        this.releaseStream();
        reject(new Error('Nenhuma gravação ativa no momento.'));
        return;
      }

      if (recorder.state === 'recording' && this.activeStartTime > 0) {
        this.accumulatedMs += Date.now() - this.activeStartTime;
        this.activeStartTime = 0;
      }

      const finalDurationMs = Math.max(500, this.accumulatedMs);
      let settled = false;

      const finalizeRecording = async () => {
        if (settled) return;
        settled = true;
        try {
          const rawMime = recorder.mimeType || this.mimeType || 'audio/webm';
          const cleanMimeType = rawMime.split(';')[0].trim() || 'audio/webm';
          const rawBlob = new Blob(this.chunks, { type: cleanMimeType });
          this.chunks = [];
          this.mediaRecorder = null;
          this.releaseStream();

          if (rawBlob.size === 0) {
            reject(new Error('O áudio gravado está vazio. Verifique a permissão do microfone.'));
            return;
          }

          // Convert browser WebM/MP4 chunks into universal 16kHz 16-bit mono WAV for Gemini API
          let finalBlob = rawBlob;
          let finalMimeType = cleanMimeType;

          try {
            const wavResult = await this.convertBlobToWav16k(rawBlob);
            if (wavResult.peakAmplitude < 0.002) {
              reject(
                new Error(
                  'Nenhum som captado pelo microfone (gravação em silêncio). Verifique se o microfone correto está selecionado.'
                )
              );
              return;
            }
            finalBlob = wavResult.wavBlob;
            finalMimeType = 'audio/wav';
          } catch (wavErr: any) {
            // If wavErr is our explicit silence error, rethrow it
            if (wavErr?.message?.includes('Nenhum som captado')) {
              reject(wavErr);
              return;
            }
            console.warn('Fallback para container de áudio original:', wavErr);
          }

          const base64 = await this.blobToBase64(finalBlob);
          const blobUrl = URL.createObjectURL(finalBlob);

          resolve({
            base64,
            mimeType: finalMimeType,
            blobUrl,
            durationMs: finalDurationMs,
          });
        } catch (err) {
          this.releaseStream();
          reject(err);
        }
      };

      const safetyTimer = setTimeout(() => {
        if (!settled && this.chunks.length > 0) {
          finalizeRecording();
        } else if (!settled) {
          settled = true;
          this.releaseStream();
          reject(new Error('Tempo limite ao finalizar gravação de áudio.'));
        }
      }, 2500);

      recorder.onstop = () => {
        clearTimeout(safetyTimer);
        finalizeRecording();
      };

      recorder.onerror = (err) => {
        clearTimeout(safetyTimer);
        if (this.chunks.length > 0) {
          finalizeRecording();
        } else if (!settled) {
          settled = true;
          this.releaseStream();
          reject(err);
        }
      };

      try {
        // If paused on mobile browsers, resume briefly and flush data before stopping
        if (recorder.state === 'paused') {
          try {
            recorder.resume();
          } catch {}
        }
        try {
          recorder.requestData();
        } catch {}
        recorder.stop();
      } catch (err) {
        clearTimeout(safetyTimer);
        if (this.chunks.length > 0) {
          finalizeRecording();
        } else if (!settled) {
          settled = true;
          this.releaseStream();
          reject(err);
        }
      }
    });
  }

  /**
   * Decodes browser MediaRecorder blob (WebM/Opus, MP4/AAC, Ogg) and encodes a clean
   * 16kHz, 16-bit mono RIFF WAV blob with automatic soft-voice gain normalization.
   */
  private async convertBlobToWav16k(
    blob: Blob
  ): Promise<{ wavBlob: Blob; peakAmplitude: number }> {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error('AudioContext não disponível');
    }

    const arrayBuffer = await blob.arrayBuffer();
    const audioCtx = new AudioContextClass();
    try {
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
      const targetSampleRate = 16000;
      const numChannels = audioBuffer.numberOfChannels;
      const sourceLength = audioBuffer.length;
      const sourceRate = audioBuffer.sampleRate;

      // Mix down to mono
      const monoSource = new Float32Array(sourceLength);
      for (let ch = 0; ch < numChannels; ch++) {
        const channelData = audioBuffer.getChannelData(ch);
        for (let i = 0; i < sourceLength; i++) {
          monoSource[i] += channelData[i] / numChannels;
        }
      }

      // Resample to 16kHz via linear interpolation
      const targetLength = Math.max(1, Math.round((sourceLength * targetSampleRate) / sourceRate));
      const resampled = new Float32Array(targetLength);
      const ratio = sourceLength / targetLength;
      let peakAmplitude = 0;

      for (let i = 0; i < targetLength; i++) {
        const srcIdx = i * ratio;
        const idx0 = Math.floor(srcIdx);
        const idx1 = Math.min(sourceLength - 1, idx0 + 1);
        const frac = srcIdx - idx0;
        const sample = monoSource[idx0] * (1 - frac) + monoSource[idx1] * frac;
        resampled[i] = sample;
        const abs = Math.abs(sample);
        if (abs > peakAmplitude) {
          peakAmplitude = abs;
        }
      }

      // Apply gentle normalization if voice is quiet (so Gemini hears every phoneme clearly)
      const gain = peakAmplitude > 0.005 && peakAmplitude < 0.7 ? Math.min(3.5, 0.85 / peakAmplitude) : 1.0;

      // Encode 44-byte RIFF WAV header + 16-bit PCM samples
      const bytesPerSample = 2;
      const dataByteLength = targetLength * bytesPerSample;
      const buffer = new ArrayBuffer(44 + dataByteLength);
      const view = new DataView(buffer);

      const writeAscii = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) {
          view.setUint8(offset + i, str.charCodeAt(i));
        }
      };

      writeAscii(0, 'RIFF');
      view.setUint32(4, 36 + dataByteLength, true);
      writeAscii(8, 'WAVE');
      writeAscii(12, 'fmt ');
      view.setUint32(16, 16, true); // PCM chunk size
      view.setUint16(20, 1, true); // PCM format = 1
      view.setUint16(22, 1, true); // Mono = 1 channel
      view.setUint32(24, targetSampleRate, true);
      view.setUint32(28, targetSampleRate * bytesPerSample, true); // Byte rate
      view.setUint16(32, bytesPerSample, true); // Block align
      view.setUint16(34, 16, true); // 16 bits per sample
      writeAscii(36, 'data');
      view.setUint32(40, dataByteLength, true);

      let offset = 44;
      for (let i = 0; i < targetLength; i++) {
        const clamped = Math.max(-1, Math.min(1, resampled[i] * gain));
        const int16 = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
        view.setInt16(offset, int16, true);
        offset += 2;
      }

      return {
        wavBlob: new Blob([buffer], { type: 'audio/wav' }),
        peakAmplitude,
      };
    } finally {
      try {
        await audioCtx.close();
      } catch {}
    }
  }

  public cancel(): void {
    this.chunks = [];
    this.accumulatedMs = 0;
    this.activeStartTime = 0;
    if (this.mediaRecorder) {
      const rec = this.mediaRecorder;
      this.mediaRecorder = null;
      rec.ondataavailable = null;
      rec.onstop = null;
      rec.onerror = null;
      if (rec.state !== 'inactive') {
        try {
          rec.stop();
        } catch (e) {}
      }
    }
    this.releaseStream();
  }

  private releaseStream(): void {
    if (this.stream) {
      try {
        this.stream.getTracks().forEach((track) => track.stop());
      } catch (e) {}
      this.stream = null;
    }
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (!result) {
          reject(new Error('Falha ao converter áudio em Base64'));
          return;
        }
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

