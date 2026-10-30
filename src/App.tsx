import React, { useState, useEffect, useRef } from 'react';
import {
  Message,
  Scenario,
  CEFRLevel,
  Accent,
  VoiceId,
  VOICE_OPTIONS,
  ConversationMode,
  PlaybackSpeed,
  LearnerProfile,
} from './types';
import { PRESET_SCENARIOS } from './data/scenarios';
import { Header } from './components/Header';
import { FeedbackCard } from './components/FeedbackCard';
import { AudioWave } from './components/AudioWave';
import { PronunciationModal } from './components/PronunciationModal';
import { SessionReportModal } from './components/SessionReportModal';
import { ScenarioSelector } from './components/ScenarioSelector';
import { ProgressVaultModal } from './components/ProgressVaultModal';
import { GoogleDriveSyncModal } from './components/GoogleDriveSyncModal';
import { LearnerProfileModal } from './components/LearnerProfileModal';
import { FreeTutorLobby } from './components/FreeTutorLobby';
import { ScenarioLobby } from './components/ScenarioLobby';
import {
  subscribeToAuth,
  triggerDebouncedAutoSync,
} from './services/googleDriveService';
import {
  isSpeechRecognitionSupported,
  SpeechRecognizer,
  mergeSpeechSegments,
  audioPlayer,
  unlockMobileAudio,
  VoiceRecorder,
  isVoiceRecordingSupported,
} from './utils/speech';
import {
  loadSettings,
  saveSettings,
  loadChatHistory,
  saveChatHistory,
  clearChatHistory,
  loadVocabVault,
  saveVocabItem,
  incrementMessageStats,
  isSessionStarted,
  setSessionStarted,
  loadLearnerProfile,
  saveLearnerProfile,
  addLearnedFact,
} from './utils/storage';
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Compass,
  MessageSquare,
  Globe2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  HelpCircle,
  Lightbulb,
  Brain,
  X,
  Pause,
  Play,
  Trash2,
  Pencil,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

const getFreeTutorStarter = (tutorName: string, topic?: string): Message => ({
  id: `starter-free-${Date.now()}`,
  role: 'assistant',
  text:
    topic && topic !== 'Bate-papo totalmente livre'
      ? `Hey there! I'm ${tutorName}, your personal English tutor. That's a great topic to practice—let's talk about "${topic}"! How has your experience been with this lately? E lembre-se: se tiver qualquer dúvida de vocabulário ou gramática, eu explico rapidinho em português sem travar nossa conversa!`
      : `Hey there! I'm ${tutorName}, your personal English tutor and conversation partner. How's everything going with you today? We can chat about whatever is on your mind! E fique tranquilo: se surgir qualquer dúvida ou se quiser saber como dizer algo, eu explico em português na hora. What would you like to share?`,
  translationPt:
    topic && topic !== 'Bate-papo totalmente livre'
      ? `Olá! Sou ${tutorName}, seu tutor pessoal de inglês. Esse é um ótimo tema para praticar—vamos falar sobre "${topic}"! Como tem sido sua experiência com isso ultimamente? E lembre-se: se tiver qualquer dúvida, eu explico rapidinho em português!`
      : `Olá! Sou ${tutorName}, seu tutor pessoal de inglês e parceiro de conversa. Como estão as coisas com você hoje? Podemos conversar sobre o que você quiser! E fique tranquilo: se surgir qualquer dúvida, eu explico em português na hora. O que você gostaria de contar?`,
  timestamp: Date.now(),
  suggestedReplies: [
    {
      en: `Hey ${tutorName}! I'm having a good day and excited to practice.`,
      pt: `Oi ${tutorName}! Estou tendo um bom dia e animado para praticar.`,
      tone: "Friendly",
    },
    {
      en: "I'd love to tell you a little bit about what I did today.",
      pt: "Eu adoraria te contar um pouco sobre o que fiz hoje.",
      tone: "Casual",
    },
    {
      en: "Could you ask me a question to get things started?",
      pt: "Você poderia me fazer uma pergunta para começarmos?",
      tone: "Inquisitive",
    },
  ],
});

export default function App() {
  // Load persisted settings
  const initialSettings = loadSettings();

  const [mode, setMode] = useState<ConversationMode>('free_tutor');
  const [level, setLevel] = useState<CEFRLevel>(initialSettings.level);
  const [accent, setAccent] = useState<Accent>(initialSettings.accent);
  const [voiceId, setVoiceId] = useState<VoiceId>(initialSettings.voiceId);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(initialSettings.playbackSpeed);
  const [autoPlayAudio, setAutoPlayAudio] = useState<boolean>(initialSettings.autoPlayAudio);
  const [showTranslations, setShowTranslations] = useState<boolean>(initialSettings.showTranslations);

  // Active voice option and tutor name
  const currentVoiceOption =
    VOICE_OPTIONS.find((v) => v.id === voiceId) || VOICE_OPTIONS[0];
  const tutorName = currentVoiceOption.name;

  // Active Scenario
  const [activeScenario, setActiveScenario] = useState<Scenario>(PRESET_SCENARIOS[0]);
  const [showGoals, setShowGoals] = useState<boolean>(true);

  // Started states (Requires explicit "Start" click)
  const [isFreeTutorActive, setIsFreeTutorActive] = useState<boolean>(() => isSessionStarted('free_tutor'));
  const [isScenarioActive, setIsScenarioActive] = useState<boolean>(() => isSessionStarted(`scenario_${PRESET_SCENARIOS[0].id}`));

  // Messages per active context
  const [messages, setMessages] = useState<Message[]>([]);

  // Input & Speech / Voice Recording
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isLoadingReply, setIsLoadingReply] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isTranscribingAudio, setIsTranscribingAudio] = useState(false);
  const [playingUserAudioId, setPlayingUserAudioId] = useState<string | null>(null);
  const [inputBarNotice, setInputBarNotice] = useState<{ title: string; details?: string } | null>(null);

  // Audio Playback state
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);

  // Modals
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveUserEmail, setDriveUserEmail] = useState<string | null>(null);
  const [pronunciationPhrase, setPronunciationPhrase] = useState<string | null>(null);
  const [savedVocabCount, setSavedVocabCount] = useState<number>(0);

  // Learner Profile & Continuous Long-Term Memory
  const [learnerProfile, setLearnerProfile] = useState<LearnerProfile>(() => loadLearnerProfile());
  const [newFactToast, setNewFactToast] = useState<string | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const recognizerRef = useRef<SpeechRecognizer | null>(null);
  const voiceRecorderRef = useRef<VoiceRecorder>(new VoiceRecorder());
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const userAudioElementRef = useRef<HTMLAudioElement | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const baseInputTextRef = useRef<string>('');

  // Current session key for persistence
  const currentSessionKey = mode === 'free_tutor' ? 'free_tutor' : `scenario_${activeScenario.id}`;

  // Subscribe to Google Drive / Firebase Auth status
  useEffect(() => {
    const unsubscribe = subscribeToAuth((u, hasToken) => {
      setDriveConnected(hasToken);
      setDriveUserEmail(u?.email || null);
    });
    return unsubscribe;
  }, []);

  // Persist settings changes
  useEffect(() => {
    saveSettings({
      level,
      accent,
      voiceId,
      playbackSpeed,
      autoPlayAudio,
      showTranslations,
    });
  }, [level, accent, voiceId, playbackSpeed, autoPlayAudio, showTranslations]);

  // Load chat history & vocab count on context switch
  useEffect(() => {
    const saved = loadChatHistory(currentSessionKey);
    if (saved && saved.length > 0) {
      setMessages(saved);
    } else {
      setMessages([]);
    }
    setSavedVocabCount(loadVocabVault().length);
    // Check if started
    if (mode === 'free_tutor') {
      setIsFreeTutorActive(isSessionStarted('free_tutor'));
    } else {
      setIsScenarioActive(isSessionStarted(`scenario_${activeScenario.id}`));
    }
  }, [mode, activeScenario.id]);

  // Save chat history automatically whenever messages change & trigger auto-sync
  useEffect(() => {
    if (messages.length > 0) {
      saveChatHistory(currentSessionKey, messages);
      triggerDebouncedAutoSync();
    }
  }, [messages, currentSessionKey]);

  // Initialize Speech Recognizer
  useEffect(() => {
    if (isSpeechRecognitionSupported()) {
      const lang =
        accent === 'British' ? 'en-GB' : accent === 'Australian' ? 'en-AU' : 'en-US';
      recognizerRef.current = new SpeechRecognizer(lang);
    }
  }, [accent]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if ((mode === 'free_tutor' && isFreeTutorActive) || (mode === 'scenario' && isScenarioActive)) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoadingReply, isFreeTutorActive, isScenarioActive]);

  // Mode Switch without unexpected audio
  const handleModeChange = (newMode: ConversationMode) => {
    audioPlayer.stop();
    setCurrentlyPlayingId(null);
    setMode(newMode);
  };

  // Start Free Tutor Session
  const handleStartFreeTutor = (chosenTopic?: string) => {
    const starter = getFreeTutorStarter(tutorName, chosenTopic);
    setMessages([starter]);
    setIsFreeTutorActive(true);
    setSessionStarted('free_tutor', true);
  };

  // Resume Free Tutor
  const handleResumeFreeTutor = () => {
    const saved = loadChatHistory('free_tutor');
    if (saved && saved.length > 0) {
      setMessages(saved);
    } else {
      handleStartFreeTutor();
    }
    setIsFreeTutorActive(true);
    setSessionStarted('free_tutor', true);
  };

  // Select Scenario
  const handleSelectScenario = (scenario: Scenario) => {
    audioPlayer.stop();
    setCurrentlyPlayingId(null);
    setActiveScenario(scenario);
    setMode('scenario');
    setAccent(scenario.accent);

    const saved = loadChatHistory(`scenario_${scenario.id}`);
    const isStarted = isSessionStarted(`scenario_${scenario.id}`);
    setIsScenarioActive(isStarted && !!saved && saved.length > 0);
  };

  // Start Scenario Session
  const handleStartScenario = () => {
    const starter: Message = {
      id: `starter-${activeScenario.id}-${Date.now()}`,
      role: 'assistant',
      text: activeScenario.starterMessage,
      translationPt: activeScenario.starterTranslationPt,
      timestamp: Date.now(),
      suggestedReplies: [
        {
          en: "Hi! Thanks, I'm glad to be here.",
          pt: "Oi! Obrigado, estou feliz de estar aqui.",
          tone: "Friendly",
        },
        {
          en: "Hello, could you help me with a quick question?",
          pt: "Olá, você poderia me ajudar com uma dúvida rápida?",
          tone: "Inquisitive",
        },
      ],
    };
    setMessages([starter]);
    setIsScenarioActive(true);
    setSessionStarted(`scenario_${activeScenario.id}`, true);
  };

  // Resume Scenario
  const handleResumeScenario = () => {
    const saved = loadChatHistory(`scenario_${activeScenario.id}`);
    if (saved && saved.length > 0) {
      setMessages(saved);
    } else {
      handleStartScenario();
    }
    setIsScenarioActive(true);
    setSessionStarted(`scenario_${activeScenario.id}`, true);
  };

  // Toggle Voice Input with generous pause patience and zero-duplication
  const toggleListening = () => {
    unlockMobileAudio();
    if (!isSpeechRecognitionSupported()) {
      alert(
        'O reconhecimento de voz pelo microfone não está habilitado neste navegador. Você pode digitar sua resposta normalmente na caixa de texto!'
      );
      return;
    }

    if (isListening) {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      recognizerRef.current?.stop();
      setIsListening(false);
      setInterimTranscript('');
      return;
    }

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    // Preserve whatever the user already typed or previous voice snippet
    baseInputTextRef.current = inputText.trim();
    setInterimTranscript('');

    recognizerRef.current?.start({
      onStart: () => {
        setIsListening(true);
        // Start patience timer: close after 6 seconds of complete silence
        silenceTimerRef.current = setTimeout(() => {
          recognizerRef.current?.stop();
          setIsListening(false);
          setInterimTranscript('');
        }, 6000);
      },
      onSessionTranscript: (sessionFinal, sessionInterim) => {
        const base = baseInputTextRef.current;
        const cleanFinal = sessionFinal.trim();
        const cleanInterim = sessionInterim.trim();

        // While speaking, merge final and interim so user sees what is being recognized without duplicate repeats
        const currentSession = cleanFinal
          ? (cleanInterim ? mergeSpeechSegments([cleanFinal, cleanInterim]) : cleanFinal)
          : cleanInterim;

        const fullText = base
          ? (currentSession ? `${base} ${currentSession}` : base)
          : currentSession;

        setInputText(fullText);
        setInterimTranscript(cleanInterim);

        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        // Generous thinking pause: 4.5 seconds before auto-closing
        silenceTimerRef.current = setTimeout(() => {
          recognizerRef.current?.stop();
          setIsListening(false);
          setInterimTranscript('');
        }, 4500);
      },
      onError: (err) => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        setIsListening(false);
        setInterimTranscript('');
        console.warn('Speech error:', err);
      },
      onEnd: () => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        setIsListening(false);
        setInterimTranscript('');
      },
    });
  };

  // Format seconds as M:SS (e.g. 0:05)
  const formatRecordingTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Start active timer for voice recording
  const startRecordingTimer = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
  };

  const stopRecordingTimer = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  // Start WhatsApp-style Voice Recording (with fallback to SpeechRecognition if MediaRecorder is unavailable)
  const handleStartVoiceRecording = async () => {
    unlockMobileAudio();
    handleStopAudio();

    if (isListening) {
      recognizerRef.current?.stop();
      setIsListening(false);
      setInterimTranscript('');
    }

    if (!isVoiceRecordingSupported()) {
      toggleListening();
      return;
    }

    try {
      setInputBarNotice(null);
      await voiceRecorderRef.current.start();
      setIsRecordingAudio(true);
      setIsRecordingPaused(false);
      setRecordingSeconds(0);
      startRecordingTimer();
    } catch (err: any) {
      console.warn('Microphone access error:', err);
      setInputBarNotice({
        title: 'Não foi possível acessar o microfone',
        details: err?.message || 'Verifique se o navegador possui permissão de uso do microfone.',
      });
    }
  };

  // Toggle Pause / Resume during voice recording (zero bytes recorded while paused)
  const handleTogglePauseRecording = () => {
    if (!isRecordingAudio) return;

    if (isRecordingPaused) {
      const resumed = voiceRecorderRef.current.resume();
      if (resumed) {
        setIsRecordingPaused(false);
        startRecordingTimer();
      }
    } else {
      const paused = voiceRecorderRef.current.pause();
      if (paused) {
        setIsRecordingPaused(true);
        stopRecordingTimer();
      }
    }
  };

  // Cancel and discard current voice recording
  const handleCancelVoiceRecording = () => {
    stopRecordingTimer();
    voiceRecorderRef.current.cancel();
    setIsRecordingAudio(false);
    setIsRecordingPaused(false);
    setRecordingSeconds(0);
  };

  // Transcribe recorded audio into the text input box so the user can review/edit before sending
  const handleTranscribeToInput = async () => {
    if (!isRecordingAudio || isTranscribingAudio) return;
    stopRecordingTimer();
    setIsTranscribingAudio(true);
    setInputBarNotice(null);

    try {
      const audioResult = await voiceRecorderRef.current.stop();
      setIsRecordingAudio(false);
      setIsRecordingPaused(false);
      setRecordingSeconds(0);

      const recentContext = messages
        .filter((m) => !m.sendError)
        .slice(-4)
        .map((m) => m.text)
        .join(' | ');
      const profileHint = [
        learnerProfile.occupation,
        learnerProfile.interests,
        learnerProfile.primaryGoal,
      ]
        .filter(Boolean)
        .join(', ');

      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: audioResult.base64,
          mimeType: audioResult.mimeType,
          contextHint: `${profileHint} — ${recentContext}`,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.transcription) {
        setInputText((prev) =>
          prev.trim() ? `${prev.trim()} ${data.transcription.trim()}` : data.transcription.trim()
        );
        setTimeout(() => textInputRef.current?.focus(), 50);
      } else {
        setInputBarNotice({
          title: data.error || 'Não foi possível transcrever o áudio automaticamente',
          details: data.details || 'Você pode digitar sua frase diretamente no campo abaixo.',
        });
        setTimeout(() => textInputRef.current?.focus(), 50);
      }
    } catch (err: any) {
      console.warn('Failed to transcribe audio to input:', err);
      setIsRecordingAudio(false);
      setIsRecordingPaused(false);
      setRecordingSeconds(0);
      setInputBarNotice({
        title: 'Falha ao processar gravação de áudio',
        details: err?.message || 'Tente gravar novamente ou digite sua mensagem abaixo.',
      });
    } finally {
      setIsTranscribingAudio(false);
    }
  };

  // Finish recording (even from paused state) and send directly to /api/chat in 1 single call
  const handleSendVoiceRecording = async () => {
    if (!isRecordingAudio || isLoadingReply) return;
    stopRecordingTimer();
    setInputBarNotice(null);

    try {
      const audioResult = await voiceRecorderRef.current.stop();
      setIsRecordingAudio(false);
      setIsRecordingPaused(false);
      setRecordingSeconds(0);

      await handleSendMessage(undefined, {
        base64: audioResult.base64,
        mimeType: audioResult.mimeType,
        blobUrl: audioResult.blobUrl,
      });
    } catch (err: any) {
      console.warn('Error stopping voice recorder:', err);
      setIsRecordingAudio(false);
      setIsRecordingPaused(false);
      setRecordingSeconds(0);
      setInputBarNotice({
        title: 'Áudio não enviado',
        details: err?.message || 'Não foi possível capturar o áudio do microfone. Tente gravar novamente.',
      });
    }
  };

  // Play or stop the user's own recorded voice from the current session
  const handleTogglePlayUserAudio = (messageId: string, blobUrl?: string) => {
    if (!blobUrl) return;
    unlockMobileAudio();

    if (playingUserAudioId === messageId && userAudioElementRef.current) {
      userAudioElementRef.current.pause();
      userAudioElementRef.current.currentTime = 0;
      setPlayingUserAudioId(null);
      return;
    }

    handleStopAudio();
    if (userAudioElementRef.current) {
      userAudioElementRef.current.pause();
    }

    const audio = new Audio(blobUrl);
    userAudioElementRef.current = audio;
    setPlayingUserAudioId(messageId);

    audio.onended = () => {
      setPlayingUserAudioId(null);
    };
    audio.onerror = () => {
      setPlayingUserAudioId(null);
    };
    audio.play().catch(() => {
      setPlayingUserAudioId(null);
    });
  };

  // Stop current audio cleanly
  const handleStopAudio = () => {
    audioPlayer.stop();
    setCurrentlyPlayingId(null);
    if (userAudioElementRef.current) {
      try {
        userAudioElementRef.current.pause();
        userAudioElementRef.current.currentTime = 0;
      } catch (e) {}
      setPlayingUserAudioId(null);
    }
  };

  // Audio Playback
  const handlePlayAudio = (
    id: string,
    text: string,
    audioBase64?: string | null,
    customSpeed?: number
  ) => {
    unlockMobileAudio();

    // If already playing this message and user clicked play without asking for a different speed, STOP!
    if (currentlyPlayingId === id && (!customSpeed || customSpeed === playbackSpeed)) {
      handleStopAudio();
      return;
    }

    handleStopAudio();
    setCurrentlyPlayingId(id);
    const speed = customSpeed || playbackSpeed;

    audioPlayer.play(text, audioBase64, {
      rate: speed,
      accent,
      voiceId,
      onEnd: () => setCurrentlyPlayingId(null),
      onError: (err) => {
        console.warn('Audio playback error:', err);
        setCurrentlyPlayingId(null);
      },
    });
  };

  // Send message (text OR direct multimodal voice audio) to server API, with full retry support and zero fake fallbacks
  const handleSendMessage = async (
    textToSend?: string,
    audioPayload?: { base64: string; mimeType: string; blobUrl: string },
    retryMessageId?: string
  ) => {
    unlockMobileAudio();
    setInputBarNotice(null);
    const isAudioSend = !!audioPayload?.base64;
    const text = (textToSend !== undefined ? textToSend : inputText).trim();
    if ((!text && !isAudioSend) || isLoadingReply) return;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (isListening) {
      recognizerRef.current?.stop();
      setIsListening(false);
      setInterimTranscript('');
    }

    const targetMsgId = retryMessageId || `user-${Date.now()}`;

    // Build clean conversation history excluding any unresolved failed messages
    const existingIdx = retryMessageId ? messages.findIndex((m) => m.id === retryMessageId) : -1;
    const historySlice = existingIdx >= 0 ? messages.slice(0, existingIdx) : messages;
    const previousHistory = historySlice.filter((m) => !m.sendError);

    if (retryMessageId) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === retryMessageId
            ? {
                ...m,
                text: isAudioSend && !text ? '🎙️ Transcrevendo e analisando seu áudio...' : text || m.text,
                sendError: undefined,
              }
            : m
        )
      );
    } else {
      const userMsg: Message = {
        id: targetMsgId,
        role: 'user',
        text: isAudioSend ? '🎙️ Transcrevendo e analisando seu áudio...' : text,
        isVoiceMessage: isAudioSend,
        userAudioUrl: audioPayload?.blobUrl,
        retryPayload: {
          text: isAudioSend ? undefined : text,
          audioPayload,
        },
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      if (!isAudioSend) {
        setInputText('');
      }
      incrementMessageStats();
    }

    setInterimTranscript('');
    setIsLoadingReply(true);

    // AbortController with 25-second timeout to allow multimodal audio + contextual memory processing
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          mode,
          messages: previousHistory.map((m) => ({ role: m.role, text: m.text })),
          userMessage: text,
          userAudioBase64: audioPayload?.base64 || '',
          userAudioMimeType: audioPayload?.mimeType || '',
          scenario: activeScenario,
          level,
          voiceId,
          tutorName,
          generateAudio: autoPlayAudio,
          playbackRate: playbackSpeed,
          learnerProfile: {
            preferredName: learnerProfile.preferredName,
            occupation: learnerProfile.occupation,
            location: learnerProfile.location,
            primaryGoal: learnerProfile.primaryGoal,
            interests: learnerProfile.interests,
            generalNotes: learnerProfile.generalNotes,
            autoLearnedFacts: learnerProfile.autoLearnedFacts,
            autoExtractEnabled: learnerProfile.autoExtractEnabled,
          },
        }),
      });

      clearTimeout(timeoutId);

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const apiErr: any = new Error(data.error || 'Falha ao obter resposta da IA');
        apiErr.errorTitle = data.error || 'Falha ao enviar mensagem';
        apiErr.errorDetails =
          data.details || 'Ocorreu uma instabilidade na comunicação com a IA. Tente novamente.';
        apiErr.errorCode = data.code;
        apiErr.errorStage = data.stage || (isAudioSend && !text ? 'transcription' : 'chat');
        apiErr.userTranscription = data.userTranscription || '';
        throw apiErr;
      }

      const resolvedUserText =
        isAudioSend && data.userTranscription
          ? data.userTranscription.trim()
          : text;

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: data.replyText,
        translationPt: data.replyTranslationPt,
        audioBase64: data.audioBase64,
        audioMimeType: data.audioMimeType,
        feedback: data.feedback,
        suggestedReplies: data.suggestedReplies,
        timestamp: Date.now(),
      };

      // Update user bubble with the accurate AI transcription (clearing sendError and retryPayload) and append tutor reply
      setMessages((prev) =>
        prev
          .map((m) =>
            m.id === targetMsgId
              ? {
                  ...m,
                  text: resolvedUserText || m.text,
                  sendError: undefined,
                  retryPayload: undefined,
                }
              : m
          )
          .concat(assistantMsg)
      );

      // Automatically register any new facts learned about the user
      if (
        learnerProfile.autoExtractEnabled &&
        Array.isArray(data.newMemoryFacts) &&
        data.newMemoryFacts.length > 0
      ) {
        let updatedProfile = learnerProfile;
        data.newMemoryFacts.forEach((fact: string) => {
          if (fact && typeof fact === 'string' && fact.trim()) {
            updatedProfile = addLearnedFact(fact);
          }
        });
        setLearnerProfile(updatedProfile);
        setNewFactToast(data.newMemoryFacts[0]);
        setTimeout(() => setNewFactToast(null), 5000);
        triggerDebouncedAutoSync();
      }

      // Auto-save new vocabulary into the user's permanent vault
      if (data.feedback?.vocabularyBoost && data.feedback.vocabularyBoost.length > 0) {
        data.feedback.vocabularyBoost.forEach((v: any) => {
          saveVocabItem({
            word: v.word,
            meaningPt: v.meaningPt,
            example: v.example || '',
            scenarioTitle: mode === 'free_tutor' ? 'Conversa Livre' : activeScenario.title,
          });
        });
        setSavedVocabCount(loadVocabVault().length);
        triggerDebouncedAutoSync();
      }

      // Auto-play audio only if user enabled it
      if (autoPlayAudio && data.replyText) {
        handlePlayAudio(
          assistantMsg.id,
          data.replyText,
          data.audioBase64,
          playbackSpeed
        );
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.warn('Chat error or timeout:', err);

      const isTimeout = err?.name === 'AbortError';
      const partialTranscript = (err?.userTranscription || '').trim();
      const preservedText = partialTranscript || (!isAudioSend ? text : '');

      const errorTitle = isTimeout
        ? 'Tempo limite de resposta excedido'
        : err?.errorTitle || err?.message || 'Falha ao enviar mensagem';

      const errorDetails = isTimeout
        ? 'O servidor demorou além do esperado para responder. Você pode tentar novamente sem perder sua mensagem.'
        : err?.errorDetails ||
          (isAudioSend
            ? 'Não foi possível transcrever ou processar o áudio enviado. Tente novamente ou edite como texto.'
            : 'Houve uma falha ao comunicar com o tutor de IA. Clique em Tentar novamente.');

      // Mark the user's message bubble with the explicit error and preserve retryPayload (NO fake tutor reply!)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === targetMsgId
            ? {
                ...m,
                text:
                  preservedText ||
                  (isAudioSend ? '🎙️ Áudio gravado (envio não concluído)' : m.text),
                sendError: {
                  message: errorTitle,
                  details: errorDetails,
                  code: err?.errorCode,
                  stage: err?.errorStage || (isAudioSend && !preservedText ? 'transcription' : 'chat'),
                },
                retryPayload: {
                  text: preservedText || undefined,
                  audioPayload: audioPayload || m.retryPayload?.audioPayload,
                },
              }
            : m
        )
      );
    } finally {
      setIsLoadingReply(false);
    }
  };

  // Retry sending a failed user message in place
  const handleRetryMessage = (message: Message) => {
    if (isLoadingReply) return;
    const retryText =
      message.retryPayload?.text ||
      (!message.isVoiceMessage && message.text ? message.text : undefined);
    const retryAudio = message.retryPayload?.audioPayload;
    handleSendMessage(retryText, retryAudio, message.id);
  };

  // Move a failed message to the text input box so the user can edit or type manually
  const handleEditFailedMessage = async (message: Message) => {
    if (isLoadingReply || isTranscribingAudio) return;

    const existingText =
      message.retryPayload?.text ||
      (!message.isVoiceMessage && message.text ? message.text : '');

    if (existingText) {
      setInputText(existingText);
      setMessages((prev) => prev.filter((m) => m.id !== message.id));
      setInputBarNotice(null);
      setTimeout(() => textInputRef.current?.focus(), 50);
      return;
    }

    const audioPayload = message.retryPayload?.audioPayload;
    if (audioPayload?.base64) {
      setIsTranscribingAudio(true);
      try {
        const recentContext = messages
          .filter((m) => !m.sendError && m.id !== message.id)
          .slice(-4)
          .map((m) => m.text)
          .join(' | ');
        const profileHint = [
          learnerProfile.occupation,
          learnerProfile.interests,
          learnerProfile.primaryGoal,
        ]
          .filter(Boolean)
          .join(', ');

        const res = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64: audioPayload.base64,
            mimeType: audioPayload.mimeType,
            contextHint: `${profileHint} — ${recentContext}`,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.transcription) {
          setInputText(data.transcription.trim());
          setMessages((prev) => prev.filter((m) => m.id !== message.id));
          setInputBarNotice(null);
          setTimeout(() => textInputRef.current?.focus(), 50);
          return;
        }
      } catch {} finally {
        setIsTranscribingAudio(false);
      }
    }

    // If audio was inaudible/empty and could not be transcribed, remove the failed bubble and focus input
    setMessages((prev) => prev.filter((m) => m.id !== message.id));
    setInputBarNotice({
      title: 'Digite ou ajuste sua mensagem abaixo',
      details: 'A transcrição automática não detectou fala clara neste áudio. Digite o que desejava dizer para enviar.',
    });
    setTimeout(() => textInputRef.current?.focus(), 50);
  };

  // Delete a failed message bubble
  const handleDeleteFailedMessage = (messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  };

  // Reset current session
  const handleRestart = () => {
    audioPlayer.stop();
    setCurrentlyPlayingId(null);
    clearChatHistory(currentSessionKey);
    setSessionStarted(currentSessionKey, false);

    if (mode === 'free_tutor') {
      setIsFreeTutorActive(false);
      setMessages([]);
    } else {
      setIsScenarioActive(false);
      setMessages([]);
    }
  };

  const isCurrentModeStarted = mode === 'free_tutor' ? isFreeTutorActive : isScenarioActive;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <Header
        mode={mode}
        onModeChange={handleModeChange}
        level={level}
        onLevelChange={setLevel}
        accent={accent}
        onAccentChange={setAccent}
        voiceId={voiceId}
        onVoiceIdChange={setVoiceId}
        playbackSpeed={playbackSpeed}
        onPlaybackSpeedChange={setPlaybackSpeed}
        autoPlayAudio={autoPlayAudio}
        onToggleAutoPlay={() => setAutoPlayAudio(!autoPlayAudio)}
        onOpenReport={() => setIsReportModalOpen(true)}
        onOpenVault={() => setIsVaultModalOpen(true)}
        onOpenMemory={() => setIsMemoryModalOpen(true)}
        memoryFactsCount={learnerProfile.autoLearnedFacts.length}
        onOpenDriveSync={() => setIsDriveModalOpen(true)}
        isDriveConnected={driveConnected}
        driveUserEmail={driveUserEmail}
        onResetSession={handleRestart}
        messageCount={messages.length}
        savedVocabCount={savedVocabCount}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-2 sm:p-4 md:p-6 flex flex-col justify-between">
        {/* If Mode is NOT started yet, show dedicated Lobby with START button! */}
        {!isCurrentModeStarted ? (
          mode === 'free_tutor' ? (
            <FreeTutorLobby
              tutorName={tutorName}
              onStartSession={handleStartFreeTutor}
              savedMessagesCount={loadChatHistory('free_tutor')?.length || 0}
              onResumeSession={handleResumeFreeTutor}
            />
          ) : (
            <ScenarioLobby
              scenario={activeScenario}
              tutorName={tutorName}
              onStartScenario={handleStartScenario}
              onOpenScenarioSelector={() => setIsScenarioModalOpen(true)}
              hasSavedHistory={(loadChatHistory(`scenario_${activeScenario.id}`)?.length || 0) > 1}
              savedMessagesCount={loadChatHistory(`scenario_${activeScenario.id}`)?.length || 0}
              onResumeScenario={handleResumeScenario}
            />
          )
        ) : (
          /* Active Chat Stream */
          <div className="flex-1 flex flex-col justify-between">
            {/* Unified Context & Controls Bar */}
            <div className="mb-3">
              {mode === 'free_tutor' ? (
                <div className="px-3 py-2.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                      {tutorName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h2 className="text-xs sm:text-sm font-bold text-slate-900 leading-none">
                          Tutor {tutorName}
                        </h2>
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                          Online
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                        Conversa livre • Nível {level}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setShowTranslations(!showTranslations)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        showTranslations
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                      title="Alternar legendas e traduções das respostas"
                    >
                      <Globe2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span className="hidden sm:inline">Tradução PT:</span>
                      <span>{showTranslations ? 'ON' : 'OFF'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <Compass className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-none truncate">
                            {activeScenario.title}
                          </h3>
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold shrink-0">
                            {level}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                          {activeScenario.partnerRole.split(',')[0]} ({tutorName})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {activeScenario.missionGoals && activeScenario.missionGoals.length > 0 && (
                        <button
                          onClick={() => setShowGoals(!showGoals)}
                          className="px-2 py-1 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200 flex items-center gap-1 transition-colors"
                        >
                          <span>Metas</span>
                          {showGoals ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      )}

                      <button
                        onClick={() => setShowTranslations(!showTranslations)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
                          showTranslations
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                        title="Alternar legendas e traduções"
                      >
                        <Globe2 className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{showTranslations ? 'ON' : 'OFF'}</span>
                      </button>

                      <button
                        onClick={() => setIsScenarioModalOpen(true)}
                        className="px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors shadow-xs"
                      >
                        Trocar
                      </button>
                    </div>
                  </div>

                  {showGoals && activeScenario.missionGoals && (
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1.5 text-xs">
                      {activeScenario.missionGoals.map((goal, i) => (
                        <div
                          key={i}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-[11px]"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>{goal}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Message Stream */}
            <div className="flex-1 space-y-5 overflow-y-auto pb-4">
              {messages.map((message, msgIdx) => {
                const isAssistant = message.role === 'assistant';
                const isPlayingThis = currentlyPlayingId === message.id;
                const isPlayingMyVoice = playingUserAudioId === message.id;
                const precedingUserMessage = isAssistant
                  ? messages
                      .slice(0, msgIdx)
                      .reverse()
                      .find((m) => m.role === 'user')?.text || ''
                  : message.text;

                return (
                  <div
                    key={message.id}
                    className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'}`}
                  >
                    {/* Speaker Tag */}
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        {isAssistant
                          ? mode === 'free_tutor'
                            ? `${tutorName} (Tutor Pessoal)`
                            : `${activeScenario.partnerRole.split(',')[0]} (${tutorName})`
                          : 'Você (Learner)'}
                      </span>
                      {!isAssistant && message.isVoiceMessage && (
                        <span className="text-[11px] text-slate-400">
                          · Áudio transcrito com IA
                        </span>
                      )}
                      {isPlayingThis && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <Volume2 className="w-3 h-3 animate-pulse" />
                          Reproduzindo ({playbackSpeed}x)
                        </span>
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`max-w-[92%] sm:max-w-[85%] rounded-3xl p-4 shadow-sm transition-all ${
                        isAssistant
                          ? 'bg-white border border-slate-200/90 text-slate-900 rounded-tl-sm'
                          : message.sendError
                          ? 'bg-rose-950 text-white border-2 border-rose-400/80 rounded-tr-sm shadow-rose-100'
                          : 'bg-indigo-600 text-white rounded-tr-sm shadow-indigo-100'
                      }`}
                    >
                      {/* English Text */}
                      <p className="text-sm md:text-base leading-relaxed font-normal whitespace-pre-wrap">
                        {message.text}
                      </p>

                      {/* Session-only User Voice Replay Bar (if recorded in current session) */}
                      {!isAssistant && message.userAudioUrl && (
                        <div
                          className={`mt-2.5 pt-2 border-t flex items-center justify-between gap-3 ${
                            message.sendError ? 'border-rose-800/70' : 'border-indigo-500/40'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleTogglePlayUserAudio(message.id, message.userAudioUrl)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium transition-colors ${
                              message.sendError
                                ? 'bg-rose-900/90 hover:bg-rose-800 text-rose-100'
                                : 'bg-indigo-700/70 hover:bg-indigo-700 text-indigo-50'
                            }`}
                          >
                            {isPlayingMyVoice ? (
                              <>
                                <Pause className="w-3.5 h-3.5" />
                                <span>Parar gravação</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5" />
                                <span>Ouvir minha gravação</span>
                              </>
                            )}
                          </button>
                          <span
                            className={`text-[10px] ${
                              message.sendError ? 'text-rose-200' : 'text-indigo-200'
                            }`}
                          >
                            {message.sendError ? 'Áudio preservado para reenvio' : 'Salvo como texto leve'}
                          </span>
                        </div>
                      )}

                      {/* Inline Error & Retry Actions (when sending or transcription fails) */}
                      {!isAssistant && message.sendError && (
                        <div className="mt-3 pt-3 border-t border-rose-800/80 space-y-2.5">
                          <div className="flex items-start gap-2 bg-rose-900/60 border border-rose-700/60 rounded-2xl p-2.5">
                            <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                            <div className="text-xs leading-relaxed">
                              <p className="font-semibold text-rose-100">
                                {message.sendError.message}
                              </p>
                              {message.sendError.details && (
                                <p className="text-rose-200/90 mt-0.5">
                                  {message.sendError.details}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleRetryMessage(message)}
                              disabled={isLoadingReply || isTranscribingAudio}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-rose-950 font-semibold text-xs shadow-xs transition-all disabled:opacity-50"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Tentar novamente</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleEditFailedMessage(message)}
                              disabled={isLoadingReply || isTranscribingAudio}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-800/80 hover:bg-rose-800 text-rose-50 font-medium text-xs transition-all disabled:opacity-50"
                            >
                              {isTranscribingAudio ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Pencil className="w-3.5 h-3.5" />
                              )}
                              <span>Editar texto</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteFailedMessage(message.id)}
                              disabled={isLoadingReply}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-rose-900/80 text-rose-200 hover:text-white text-xs transition-all ml-auto"
                              title="Descartar esta mensagem"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Excluir</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Subtitle Translation in Portuguese */}
                      {showTranslations && message.translationPt && (
                        <div
                          className={`mt-2 pt-2 text-xs leading-relaxed border-t ${
                            isAssistant
                              ? 'border-slate-100 text-slate-500 italic'
                              : 'border-indigo-500/50 text-indigo-100 italic'
                          }`}
                        >
                          <span className="font-semibold not-italic mr-1">PT:</span>
                          {message.translationPt}
                        </div>
                      )}

                      {/* Audio & Action Bar (For Assistant Messages) */}
                      {isAssistant && (
                        <div className="mt-3 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            {/* Play / Stop Button */}
                            <button
                              onClick={() => {
                                if (isPlayingThis) {
                                  handleStopAudio();
                                } else {
                                  handlePlayAudio(
                                    message.id,
                                    message.text,
                                    message.audioBase64,
                                    playbackSpeed
                                  );
                                }
                              }}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
                                isPlayingThis
                                  ? 'bg-rose-50 text-rose-600 border border-rose-200'
                                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                              }`}
                            >
                              {isPlayingThis ? (
                                <>
                                  <VolumeX className="w-3.5 h-3.5" />
                                  <span>Parar</span>
                                </>
                              ) : (
                                <>
                                  <Volume2 className="w-3.5 h-3.5" />
                                  <span>Ouvir ({playbackSpeed}x)</span>
                                </>
                              )}
                            </button>

                            {/* Slow 0.75x Button */}
                            <button
                              onClick={() =>
                                handlePlayAudio(
                                  message.id,
                                  message.text,
                                  message.audioBase64,
                                  0.75
                                )
                              }
                              className="px-2 py-1 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 border border-slate-200"
                              title="Ouvir em velocidade lenta (0.75x) para compreender cada fonema"
                            >
                              🐢 0.75x Lento
                            </button>
                          </div>

                          {/* Pronunciation Lab trigger */}
                          <button
                            onClick={() => {
                              setPronunciationPhrase(message.text);
                            }}
                            className="text-[11px] font-medium text-slate-400 hover:text-indigo-600 flex items-center gap-1"
                            title="Ver análise fonética detalhada"
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span>Fonética</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Pedagogical Feedback Card */}
                    {message.feedback && (
                      <div className="w-full max-w-[92%] sm:max-w-[85%]">
                        <FeedbackCard
                          feedback={message.feedback}
                          userText={precedingUserMessage}
                          isConciseMode={mode === 'free_tutor'}
                          onCheckPronunciation={(phrase) => setPronunciationPhrase(phrase)}
                          onPlayWord={(word) => audioPlayer.play(word, null, { rate: 0.9, accent })}
                        />
                      </div>
                    )}

                    {/* Suggested Replies */}
                    {isAssistant && message.suggestedReplies && message.suggestedReplies.length > 0 && (
                      <div className="mt-2.5 max-w-[92%] sm:max-w-[85%] space-y-1.5 animate-in fade-in duration-300">
                        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          <Lightbulb className="w-3 h-3 text-amber-500" />
                          <span>Sugestões para responder:</span>
                        </div>

                        <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                          {message.suggestedReplies.map((reply, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSendMessage(reply.en)}
                              className="p-2.5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 text-left transition-all shadow-xs group"
                            >
                              <div className="flex items-center justify-between gap-2 mb-0.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded">
                                  {reply.tone}
                                </span>
                                <span className="text-[11px] text-slate-400 group-hover:text-indigo-600 font-semibold">
                                  Falar isto ↵
                                </span>
                              </div>
                              <p className="text-xs font-medium text-slate-800">
                                "{reply.en}"
                              </p>
                              <p className="text-[11px] text-slate-400 italic">
                                {reply.pt}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Loading Indicator */}
              {isLoadingReply && (
                <div className="flex items-start gap-2 animate-in fade-in">
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-3">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    <span className="text-xs font-medium text-slate-600">
                      {tutorName} está ouvindo e preparando a resposta...
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar Section */}
            <div className="pt-2 sticky bottom-0 bg-slate-100/95 backdrop-blur-sm">
              {/* Inline Notice Banner (for silent mic or manual text edit prompt) */}
              {inputBarNotice && (
                <div className="mb-2 px-3.5 py-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start justify-between gap-3 shadow-xs animate-in fade-in duration-200">
                  <div className="flex items-start gap-2 text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">{inputBarNotice.title}</p>
                      {inputBarNotice.details && (
                        <p className="text-amber-800/90 mt-0.5">{inputBarNotice.details}</p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInputBarNotice(null)}
                    className="p-1 rounded-lg hover:bg-amber-100 text-amber-700 transition-colors shrink-0"
                    title="Fechar aviso"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Audio Wave Indicator when legacy SpeechRecognition is active */}
              {isListening && (
                <div className="mb-2 flex justify-center">
                  <AudioWave
                    isRecording={true}
                    label={
                      interimTranscript
                        ? `"${interimTranscript}"`
                        : `Ouvindo com calma... Pode pausar para pensar, ou clique no botão para encerrar.`
                    }
                  />
                </div>
              )}

              <div className="p-2 sm:p-3 rounded-3xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50">
                {isRecordingAudio ? (
                  /* WhatsApp-style Voice Recording Bar with Pause / Resume / Edit / Send */
                  <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 py-0.5">
                    {/* Cancel / Trash Button */}
                    <button
                      type="button"
                      onClick={handleCancelVoiceRecording}
                      className="p-2.5 rounded-2xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition-colors shrink-0 flex items-center gap-1.5 text-xs font-semibold"
                      title="Cancelar e descartar gravação"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Cancelar</span>
                    </button>

                    {/* Recording Status + Animated Bars + Active Timer */}
                    <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex-1 min-w-[140px] justify-center">
                      {isRecordingPaused ? (
                        <span className="text-xs font-semibold text-amber-700">
                          Pausado (pensando...)
                        </span>
                      ) : (
                        <div className="flex items-center gap-1 h-4" aria-hidden="true">
                          <span className="w-1 h-2.5 bg-rose-500 rounded-full animate-pulse" />
                          <span className="w-1 h-4 bg-rose-500 rounded-full animate-pulse [animation-delay:150ms]" />
                          <span className="w-1 h-2 bg-rose-500 rounded-full animate-pulse [animation-delay:300ms]" />
                          <span className="w-1 h-3.5 bg-rose-500 rounded-full animate-pulse [animation-delay:75ms]" />
                        </div>
                      )}
                      <span className="text-sm font-mono font-bold tabular-nums text-slate-800">
                        {formatRecordingTime(recordingSeconds)}
                      </span>
                    </div>

                    {/* Pause / Resume Button (WhatsApp style) */}
                    <button
                      type="button"
                      onClick={handleTogglePauseRecording}
                      className={`px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                        isRecordingPaused
                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                      }`}
                      title={
                        isRecordingPaused
                          ? 'Continuar gravando do mesmo ponto'
                          : 'Pausar gravação para pensar na próxima palavra (não grava silêncio)'
                      }
                    >
                      {isRecordingPaused ? (
                        <>
                          <Play className="w-4 h-4" />
                          <span>Continuar</span>
                        </>
                      ) : (
                        <>
                          <Pause className="w-4 h-4" />
                          <span>Pausar</span>
                        </>
                      )}
                    </button>

                    {/* Secondary Option: Transcribe to Input Box to Edit Before Sending */}
                    <button
                      type="button"
                      onClick={handleTranscribeToInput}
                      disabled={isTranscribingAudio}
                      className="px-3 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5"
                      title="Converter áudio em texto na caixa de digitação para revisar antes de enviar"
                    >
                      {isTranscribingAudio ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Pencil className="w-3.5 h-3.5" />
                      )}
                      <span className="hidden md:inline">Editar texto</span>
                    </button>

                    {/* Primary Action: Send Audio Directly */}
                    <button
                      type="button"
                      onClick={handleSendVoiceRecording}
                      disabled={isLoadingReply || isTranscribingAudio}
                      className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-semibold shadow-md shadow-indigo-200 transition-all shrink-0 flex items-center gap-1.5"
                      title="Enviar áudio direto para o tutor (transcreve com IA + avalia pronúncia real)"
                    >
                      <span>Enviar Áudio</span>
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  /* Standard Input Bar: Record Voice Button + Text Input + Send Button */
                  <div className="flex items-center gap-2">
                    {/* Mic Record Audio Button */}
                    <button
                      type="button"
                      onClick={handleStartVoiceRecording}
                      disabled={isLoadingReply || isTranscribingAudio}
                      className={`p-3 rounded-2xl transition-all shadow-sm flex items-center justify-center shrink-0 ${
                        isListening
                          ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse ring-4 ring-rose-200'
                          : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                      }`}
                      title="Gravar mensagem de áudio (com opção de pausar e avaliação real de pronúncia)"
                    >
                      {isTranscribingAudio ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : isListening ? (
                        <MicOff className="w-5 h-5" />
                      ) : (
                        <Mic className="w-5 h-5" />
                      )}
                    </button>

                    {/* Text Input */}
                    <input
                      ref={textInputRef}
                      type="text"
                      placeholder={
                        isTranscribingAudio
                          ? 'Transcrevendo seu áudio com IA...'
                          : mode === 'free_tutor'
                          ? `Clique no 🎙️ para gravar áudio ou digite para ${tutorName}...`
                          : 'Clique no 🎙️ para gravar áudio ou digite sua resposta...'
                      }
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      disabled={isLoadingReply || isTranscribingAudio}
                      className="flex-1 bg-transparent px-2 py-1.5 text-sm md:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    />

                    {/* Send Button */}
                    <button
                      type="button"
                      onClick={() => handleSendMessage()}
                      disabled={!inputText.trim() || isLoadingReply || isTranscribingAudio}
                      className="p-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white shadow-md shadow-indigo-200 transition-all shrink-0 flex items-center justify-center"
                      title="Enviar mensagem de texto"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Quick helper tip below input */}
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <span>
                    {isRecordingAudio
                      ? '🎙️ Gravando sua voz: você pode Pausar para pensar em uma palavra e depois Enviar Áudio direto.'
                      : '💡 Dica: Grave áudio no 🎙️ (com pausa estilo WhatsApp) para transcrição contextual precisa e avaliação real da sua pronúncia.'}
                  </span>
                  <span className="hidden sm:inline">Enter ↵ para enviar</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Scenario Selection Modal */}
      <ScenarioSelector
        isOpen={isScenarioModalOpen}
        onClose={() => setIsScenarioModalOpen(false)}
        currentScenario={activeScenario}
        onSelectScenario={(scenario) => {
          handleSelectScenario(scenario);
          setIsScenarioModalOpen(false);
        }}
        onSelectFreeTutor={() => {
          handleModeChange('free_tutor');
          setIsScenarioModalOpen(false);
        }}
        userLevel={level}
        tutorName={tutorName}
      />

      {/* Pronunciation Lab Modal */}
      <PronunciationModal
        isOpen={!!pronunciationPhrase}
        onClose={() => setPronunciationPhrase(null)}
        phrase={pronunciationPhrase || ''}
      />

      {/* Session Report Modal */}
      <SessionReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        messages={messages}
        scenarioTitle={
          mode === 'free_tutor' ? `Conversa Livre com ${tutorName}` : activeScenario.title
        }
        level={level}
        onRestartScenario={handleRestart}
      />

      {/* Progress & Vocabulary Vault Modal */}
      <ProgressVaultModal
        isOpen={isVaultModalOpen}
        onClose={() => setIsVaultModalOpen(false)}
        onPlayWord={(word) => audioPlayer.play(word, null, { rate: 0.9, accent })}
        onOpenDriveSync={() => setIsDriveModalOpen(true)}
        isDriveConnected={driveConnected}
      />

      {/* Learner Profile & Continuous Long-Term Memory Modal */}
      <LearnerProfileModal
        isOpen={isMemoryModalOpen}
        onClose={() => setIsMemoryModalOpen(false)}
        profile={learnerProfile}
        onSaveProfile={(updated) => {
          saveLearnerProfile(updated);
          setLearnerProfile(updated);
          triggerDebouncedAutoSync();
        }}
        onOpenDriveSync={() => setIsDriveModalOpen(true)}
        isDriveConnected={driveConnected}
      />

      {/* Google Drive Remote Sync & Backup Modal */}
      <GoogleDriveSyncModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        onDataRestored={() => {
          const refreshedSettings = loadSettings();
          setLevel(refreshedSettings.level);
          setAccent(refreshedSettings.accent);
          setVoiceId(refreshedSettings.voiceId);
          setPlaybackSpeed(refreshedSettings.playbackSpeed);
          setAutoPlayAudio(refreshedSettings.autoPlayAudio);
          setShowTranslations(refreshedSettings.showTranslations);
          const saved = loadChatHistory(currentSessionKey);
          setMessages(saved || []);
          setSavedVocabCount(loadVocabVault().length);
          setLearnerProfile(loadLearnerProfile());
          if (mode === 'free_tutor') {
            setIsFreeTutorActive(isSessionStarted('free_tutor'));
          } else {
            setIsScenarioActive(isSessionStarted(`scenario_${activeScenario.id}`));
          }
        }}
      />

      {/* Notification Toast when tutor remembers a new fact */}
      {newFactToast && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-40 bg-purple-950/95 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-xs border border-purple-700/60 backdrop-blur-md animate-in slide-in-from-bottom duration-300 max-w-sm">
          <Brain className="w-4 h-4 text-purple-300 animate-pulse shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-purple-200">Lembrança registrada pelo tutor:</p>
            <p className="text-slate-100 italic font-medium truncate">"{newFactToast}"</p>
          </div>
          <button
            onClick={() => setNewFactToast(null)}
            className="p-1 hover:bg-white/10 rounded-lg text-purple-200 hover:text-white transition-colors"
            title="Fechar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
