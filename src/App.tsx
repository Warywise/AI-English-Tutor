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
  audioPlayer,
  unlockMobileAudio,
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

  // Input & Speech
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isLoadingReply, setIsLoadingReply] = useState(false);

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
  const recognizerRef = useRef<SpeechRecognizer | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Toggle Voice Input with generous pause patience
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

    setInterimTranscript('');
    recognizerRef.current?.start({
      onStart: () => {
        setIsListening(true);
        // Start silence timer of 4 seconds after opening mic if nothing spoken yet
        silenceTimerRef.current = setTimeout(() => {
          recognizerRef.current?.stop();
          setIsListening(false);
          setInterimTranscript('');
        }, 5000);
      },
      onInterimResult: (interim) => {
        setInterimTranscript(interim);
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        // Keep listening while speaking, allow up to 3.5 seconds of pause between words
        silenceTimerRef.current = setTimeout(() => {
          recognizerRef.current?.stop();
          setIsListening(false);
          setInterimTranscript('');
        }, 3500);
      },
      onFinalResult: (final) => {
        setInterimTranscript('');
        if (final && final.trim()) {
          setInputText((prev) => (prev ? `${prev.trim()} ${final.trim()}` : final.trim()));
        }
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        // Give 3.5 seconds of thinking/pause time before automatically closing the mic
        silenceTimerRef.current = setTimeout(() => {
          recognizerRef.current?.stop();
          setIsListening(false);
          setInterimTranscript('');
        }, 3500);
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

  // Stop current audio cleanly
  const handleStopAudio = () => {
    audioPlayer.stop();
    setCurrentlyPlayingId(null);
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

    audioPlayer.stop();
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

  // Send message to IAlex server API
  const handleSendMessage = async (textToSend?: string) => {
    unlockMobileAudio();
    const text = (textToSend || inputText).trim();
    if (!text || isLoadingReply) return;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (isListening) {
      recognizerRef.current?.stop();
      setIsListening(false);
      setInterimTranscript('');
    }

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      timestamp: Date.now(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputText('');
    setInterimTranscript('');
    setIsLoadingReply(true);

    // Update message stats
    incrementMessageStats();

    // AbortController with 22-second timeout to allow rich contextual memory formulation
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 22000);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          mode,
          messages: newHistory.map((m) => ({ role: m.role, text: m.text })),
          userMessage: text,
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

      if (!res.ok) {
        throw new Error('Falha na resposta da IA');
      }

      const data = await res.json();

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

      setMessages((prev) => [...prev, assistantMsg]);

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

      // Graceful tutor fallback message
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        text: "I heard you! That's a great point. Como você expandiria essa ideia em mais uma frase? Tell me more about it!",
        translationPt: "Eu te ouvi! Ótimo ponto. Como você expandiria essa ideia em mais uma frase? Me conte mais sobre isso!",
        timestamp: Date.now(),
        feedback: {
          grammarScore: 88,
          fluencyScore: 85,
          vocabularyScore: 85,
          overallFeedbackPt: "Muito bom! Para continuar fluindo, tente adicionar mais um detalhe sobre o assunto.",
          corrections: [],
          betterWaysToSay: [],
          pronunciationTips: [],
          vocabularyBoost: [],
        },
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoadingReply(false);
    }
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
              {messages.map((message) => {
                const isAssistant = message.role === 'assistant';
                const isPlayingThis = currentlyPlayingId === message.id;

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
                          : 'bg-indigo-600 text-white rounded-tr-sm shadow-indigo-100'
                      }`}
                    >
                      {/* English Text */}
                      <p className="text-sm md:text-base leading-relaxed font-normal whitespace-pre-wrap">
                        {message.text}
                      </p>

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
                          userText={messages.find((m) => m.role === 'user')?.text || ''}
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
                      {tutorName} está formulando a resposta...
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar Section */}
            <div className="pt-2 sticky bottom-0 bg-slate-100/95 backdrop-blur-sm">
              {/* Audio Wave Indicator when listening */}
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
                <div className="flex items-center gap-2">
                  {/* Mic Record Button */}
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`p-3 rounded-2xl transition-all shadow-sm flex items-center justify-center shrink-0 ${
                      isListening
                        ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse ring-4 ring-rose-200'
                        : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                    }`}
                    title={
                      isListening
                        ? 'Clique para parar de gravar'
                        : 'Clique e fale em inglês no microfone'
                    }
                  >
                    {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>

                  {/* Text Input */}
                  <input
                    type="text"
                    placeholder={
                      isListening
                        ? 'Ouvindo sua fala em inglês...'
                        : mode === 'free_tutor'
                        ? `Fale no microfone ou envie qualquer mensagem para ${tutorName}...`
                        : 'Fale ou digite sua resposta para continuar o cenário...'
                    }
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={isLoadingReply}
                    className="flex-1 bg-transparent px-2 py-1.5 text-sm md:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  />

                  {/* Send Button */}
                  <button
                    type="button"
                    onClick={() => handleSendMessage()}
                    disabled={!inputText.trim() || isLoadingReply}
                    className="p-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white shadow-md shadow-indigo-200 transition-all shrink-0 flex items-center justify-center"
                    title="Enviar mensagem"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>

                {/* Quick helper tip below input */}
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <span>
                    💡 Dica: Pratique pelo microfone para treinar sua pronúncia; o tutor analisa seu ritmo e gramática.
                  </span>
                  <span className="hidden sm:inline">Pressione Enter ↵ para enviar</span>
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
