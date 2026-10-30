export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type Accent = 'American' | 'British' | 'Australian';

export type VoiceId = 'kore' | 'zephyra' | 'alex' | 'david' | 'puck';

export interface VoiceOption {
  id: VoiceId;
  name: string;
  genderLabel: string;
  description: string;
  geminiVoice: 'Kore' | 'Zephyr' | 'Fenrir' | 'Charon' | 'Puck';
}

export const VOICE_OPTIONS: VoiceOption[] = [
  {
    id: 'kore',
    name: 'Kore',
    genderLabel: 'Feminina',
    description: 'Clara, amigável e acolhedora',
    geminiVoice: 'Kore',
  },
  {
    id: 'zephyra',
    name: 'Zephyra',
    genderLabel: 'Feminina',
    description: 'Suave, expressiva e dinâmica',
    geminiVoice: 'Zephyr',
  },
  {
    id: 'alex',
    name: 'Alex',
    genderLabel: 'Masculina',
    description: 'Confiante, natural e encorajadora',
    geminiVoice: 'Fenrir',
  },
  {
    id: 'david',
    name: 'David',
    genderLabel: 'Masculina',
    description: 'Calma, madura e articulada',
    geminiVoice: 'Charon',
  },
  {
    id: 'puck',
    name: 'Puck',
    genderLabel: 'Masculina',
    description: 'Jovem, animada e descontraída',
    geminiVoice: 'Puck',
  },
];

export type ConversationMode = 'scenario' | 'free_tutor';

export type PlaybackSpeed = 0.75 | 0.9 | 1.0 | 1.25;

export interface GrammarCorrection {
  original: string;
  corrected: string;
  explanationPt: string;
}

export interface BetterWayToSay {
  version: string;
  style: 'casual' | 'natural' | 'formal';
  explanationPt: string;
}

export interface PronunciationTip {
  word: string;
  ipa: string;
  tipPt: string;
}

export interface VocabularyItem {
  word: string;
  meaningPt: string;
  example: string;
}

export interface SavedVocabItem {
  word: string;
  meaningPt: string;
  example: string;
  scenarioTitle: string;
  savedAt: number;
}

export interface UserProgressStats {
  totalMessagesSent: number;
  completedScenarios: string[];
  averageScore: number;
  streakDays: number;
  lastActiveDate: string;
}

export interface TurnFeedback {
  grammarScore: number;
  fluencyScore: number;
  vocabularyScore: number;
  overallFeedbackPt?: string;
  corrections: GrammarCorrection[];
  betterWaysToSay: BetterWayToSay[];
  pronunciationTips: PronunciationTip[];
  vocabularyBoost: VocabularyItem[];
}

export interface SuggestedReply {
  en: string;
  pt: string;
  tone: string;
}

export interface MessageSendError {
  message: string;
  details?: string;
  code?: string;
  stage?: 'transcription' | 'chat';
}

export interface MessageRetryPayload {
  text?: string;
  audioPayload?: {
    base64: string;
    mimeType: string;
    blobUrl: string;
  };
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  translationPt?: string;
  isVoiceMessage?: boolean;
  userAudioUrl?: string;
  audioBase64?: string | null;
  audioMimeType?: string;
  feedback?: TurnFeedback;
  suggestedReplies?: SuggestedReply[];
  sendError?: MessageSendError;
  retryPayload?: MessageRetryPayload;
  timestamp: number;
}

export interface Scenario {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  category: 'daily' | 'work' | 'travel' | 'social' | 'custom';
  partnerRole: string;
  userRole: string;
  context: string;
  accent: Accent;
  recommendedLevel: CEFRLevel;
  starterMessage: string;
  starterTranslationPt: string;
  iconName: string;
  missionGoals: string[];
}

export interface SessionReport {
  overallScore: number;
  grammarScore: number;
  fluencyScore: number;
  vocabularyScore: number;
  summaryPt: string;
  topStrengths: string[];
  areasToImprove: string[];
  topVocabularyLearned: Array<{
    word: string;
    meaningPt: string;
    usage: string;
  }>;
  keyGrammarFixes: Array<{
    before: string;
    after: string;
    ruleExplanationPt: string;
  }>;
  suggestedNextChallenge: string;
}

export interface PhoneticAnalysis {
  phrase: string;
  ipa: string;
  syllableStress: string;
  portuguesePitfalls: string[];
  mouthPlacementTips: string[];
  audioComparison: string;
  practiceDrill: string;
}

export interface LearnedFact {
  id: string;
  fact: string;
  createdAt: number;
}

export interface LearnerProfile {
  preferredName: string;
  occupation: string;
  location: string;
  primaryGoal: string;
  interests: string;
  generalNotes: string;
  autoLearnedFacts: LearnedFact[];
  autoExtractEnabled: boolean;
}

export interface SpeakFluentBackupPayload {
  version: string;
  exportedAt: string;
  userEmail?: string;
  userDisplayName?: string;
  settings: {
    level: CEFRLevel;
    accent: Accent;
    voiceId: VoiceId;
    playbackSpeed: PlaybackSpeed;
    autoPlayAudio: boolean;
    showTranslations: boolean;
  };
  stats: UserProgressStats;
  vocabVault: SavedVocabItem[];
  chatHistories: Record<string, Message[]>;
  startedModes: Record<string, boolean>;
  learnerProfile?: LearnerProfile;
}

export interface DriveBackupFileMetadata {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
}
