import {
  Message,
  SavedVocabItem,
  UserProgressStats,
  CEFRLevel,
  Accent,
  VoiceId,
  PlaybackSpeed,
  LearnerProfile,
  LearnedFact,
} from '../types';

const STORAGE_KEYS = {
  CHAT_HISTORIES: 'speakfluent_chat_histories_v2',
  SETTINGS: 'speakfluent_settings_v2',
  STATS: 'speakfluent_user_stats_v2',
  VOCAB_VAULT: 'speakfluent_vocab_vault_v2',
  STARTED_MODES: 'speakfluent_started_modes_v2',
  LEARNER_PROFILE: 'speakfluent_learner_profile_v2',
};

export interface StoredSettings {
  level: CEFRLevel;
  accent: Accent;
  voiceId: VoiceId;
  playbackSpeed: PlaybackSpeed;
  autoPlayAudio: boolean;
  showTranslations: boolean;
}

const DEFAULT_SETTINGS: StoredSettings = {
  level: 'B1',
  accent: 'American',
  voiceId: 'alex',
  playbackSpeed: 1.0,
  autoPlayAudio: false,
  showTranslations: true,
};

const DEFAULT_STATS: UserProgressStats = {
  totalMessagesSent: 0,
  completedScenarios: [],
  averageScore: 85,
  streakDays: 1,
  lastActiveDate: new Date().toISOString().split('T')[0],
};

// 1. Settings Persistence
export function loadSettings(): StoredSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: StoredSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {}
}

// 2. Chat Histories Persistence (per session key)
export function loadChatHistory(sessionKey: string): Message[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CHAT_HISTORIES);
    if (!raw) return null;
    const map = JSON.parse(raw);
    return map[sessionKey] || null;
  } catch (e) {
    return null;
  }
}

export function saveChatHistory(sessionKey: string, messages: Message[]): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CHAT_HISTORIES);
    const map = raw ? JSON.parse(raw) : {};
    map[sessionKey] = messages;
    localStorage.setItem(STORAGE_KEYS.CHAT_HISTORIES, JSON.stringify(map));
  } catch (e) {}
}

export function clearChatHistory(sessionKey: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CHAT_HISTORIES);
    if (!raw) return;
    const map = JSON.parse(raw);
    delete map[sessionKey];
    localStorage.setItem(STORAGE_KEYS.CHAT_HISTORIES, JSON.stringify(map));
  } catch (e) {}
}

// 3. User Progress & Stats
export function loadUserStats(): UserProgressStats {
  if (typeof window === 'undefined') return DEFAULT_STATS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STATS);
    if (!raw) return DEFAULT_STATS;
    const stats: UserProgressStats = JSON.parse(raw);

    // Calculate streak
    const today = new Date().toISOString().split('T')[0];
    if (stats.lastActiveDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (stats.lastActiveDate === yesterday) {
        stats.streakDays += 1;
      }
      stats.lastActiveDate = today;
      saveUserStats(stats);
    }
    return stats;
  } catch (e) {
    return DEFAULT_STATS;
  }
}

export function saveUserStats(stats: UserProgressStats): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
  } catch (e) {}
}

export function incrementMessageStats(score?: number): void {
  const stats = loadUserStats();
  stats.totalMessagesSent += 1;
  if (score && score > 0) {
    stats.averageScore = Math.round((stats.averageScore * 0.9) + (score * 0.1));
  }
  saveUserStats(stats);
}

// 4. Vocabulary Vault
export function loadVocabVault(): SavedVocabItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.VOCAB_VAULT);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveVocabItem(item: Omit<SavedVocabItem, 'savedAt'>): void {
  if (typeof window === 'undefined') return;
  try {
    const current = loadVocabVault();
    const exists = current.some((v) => v.word.toLowerCase() === item.word.toLowerCase());
    if (exists) return; // avoid duplicates

    const updated: SavedVocabItem[] = [
      { ...item, savedAt: Date.now() },
      ...current,
    ];
    localStorage.setItem(STORAGE_KEYS.VOCAB_VAULT, JSON.stringify(updated.slice(0, 100)));
  } catch (e) {}
}

// 5. Started Sessions Tracking (whether the user clicked "Start" for this scenario/mode)
export function isSessionStarted(sessionKey: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STARTED_MODES);
    if (!raw) return false;
    const set = JSON.parse(raw);
    return !!set[sessionKey];
  } catch (e) {
    return false;
  }
}

export function setSessionStarted(sessionKey: string, started: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STARTED_MODES);
    const set = raw ? JSON.parse(raw) : {};
    if (started) {
      set[sessionKey] = true;
    } else {
      delete set[sessionKey];
    }
    localStorage.setItem(STORAGE_KEYS.STARTED_MODES, JSON.stringify(set));
  } catch (e) {}
}

export function getAllChatHistories(): Record<string, Message[]> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CHAT_HISTORIES);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function getAllStartedModes(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STARTED_MODES);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

// 5.1 Learner Profile & Continuous Long-Term Memory
export const DEFAULT_LEARNER_PROFILE: LearnerProfile = {
  preferredName: '',
  occupation: '',
  location: '',
  primaryGoal: '',
  interests: '',
  generalNotes: '',
  autoLearnedFacts: [],
  autoExtractEnabled: true,
};

export function loadLearnerProfile(): LearnerProfile {
  if (typeof window === 'undefined') return DEFAULT_LEARNER_PROFILE;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LEARNER_PROFILE);
    if (!raw) return DEFAULT_LEARNER_PROFILE;
    return { ...DEFAULT_LEARNER_PROFILE, ...JSON.parse(raw) };
  } catch (e) {
    return DEFAULT_LEARNER_PROFILE;
  }
}

export function saveLearnerProfile(profile: LearnerProfile): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.LEARNER_PROFILE, JSON.stringify(profile));
  } catch (e) {}
}

export function addLearnedFact(factText: string): LearnerProfile {
  const profile = loadLearnerProfile();
  const trimmed = factText.trim();
  if (!trimmed) return profile;

  // Avoid duplicate facts (case insensitive match)
  const isDuplicate = profile.autoLearnedFacts.some(
    (f) => f.fact.toLowerCase() === trimmed.toLowerCase()
  );
  if (isDuplicate) return profile;

  const newFact: LearnedFact = {
    id: `fact-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    fact: trimmed,
    createdAt: Date.now(),
  };

  const updated: LearnerProfile = {
    ...profile,
    autoLearnedFacts: [newFact, ...profile.autoLearnedFacts],
  };

  saveLearnerProfile(updated);
  return updated;
}

export function removeLearnedFact(factId: string): LearnerProfile {
  const profile = loadLearnerProfile();
  const updated: LearnerProfile = {
    ...profile,
    autoLearnedFacts: profile.autoLearnedFacts.filter((f) => f.id !== factId),
  };
  saveLearnerProfile(updated);
  return updated;
}

export function updateLearnedFact(factId: string, newText: string): LearnerProfile {
  const profile = loadLearnerProfile();
  const updated: LearnerProfile = {
    ...profile,
    autoLearnedFacts: profile.autoLearnedFacts.map((f) =>
      f.id === factId ? { ...f, fact: newText.trim() } : f
    ),
  };
  saveLearnerProfile(updated);
  return updated;
}

// 6. Export and Restore Full App State
export function exportLocalData(userEmail?: string, userDisplayName?: string) {
  const settings = loadSettings();
  const stats = loadUserStats();
  const vocabVault = loadVocabVault();
  const chatHistories = getAllChatHistories();
  const startedModes = getAllStartedModes();
  const learnerProfile = loadLearnerProfile();

  return {
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    userEmail: userEmail || undefined,
    userDisplayName: userDisplayName || undefined,
    settings,
    stats,
    vocabVault,
    chatHistories,
    startedModes,
    learnerProfile,
  };
}

export function restoreAllData(payload: any): {
  success: boolean;
  messagesCount: number;
  vocabCount: number;
  details: string;
} {
  if (!payload || typeof payload !== 'object') {
    return { success: false, messagesCount: 0, vocabCount: 0, details: 'Arquivo de backup inválido.' };
  }

  try {
    // 1. Settings
    if (payload.settings && typeof payload.settings === 'object') {
      saveSettings({
        ...DEFAULT_SETTINGS,
        ...payload.settings,
      });
    }

    // 2. Stats
    if (payload.stats && typeof payload.stats === 'object') {
      saveUserStats({
        ...DEFAULT_STATS,
        ...payload.stats,
      });
    }

    // 3. Vocab Vault
    let vocabCount = 0;
    if (Array.isArray(payload.vocabVault)) {
      localStorage.setItem(STORAGE_KEYS.VOCAB_VAULT, JSON.stringify(payload.vocabVault));
      vocabCount = payload.vocabVault.length;
    }

    // 4. Chat Histories
    let messagesCount = 0;
    if (payload.chatHistories && typeof payload.chatHistories === 'object') {
      localStorage.setItem(STORAGE_KEYS.CHAT_HISTORIES, JSON.stringify(payload.chatHistories));
      for (const key of Object.keys(payload.chatHistories)) {
        if (Array.isArray(payload.chatHistories[key])) {
          messagesCount += payload.chatHistories[key].length;
        }
      }
    }

    // 5. Started Modes
    if (payload.startedModes && typeof payload.startedModes === 'object') {
      localStorage.setItem(STORAGE_KEYS.STARTED_MODES, JSON.stringify(payload.startedModes));
    }

    // 6. Learner Profile & Long-term Memory
    if (payload.learnerProfile && typeof payload.learnerProfile === 'object') {
      saveLearnerProfile({
        ...DEFAULT_LEARNER_PROFILE,
        ...payload.learnerProfile,
      });
    }

    return {
      success: true,
      messagesCount,
      vocabCount,
      details: `${messagesCount} mensagens e ${vocabCount} termos de vocabulário restaurados com sucesso.`,
    };
  } catch (err: any) {
    return {
      success: false,
      messagesCount: 0,
      vocabCount: 0,
      details: `Erro durante a restauração: ${err.message || 'Falha desconhecida'}`,
    };
  }
}

// 7. Auto Sync Preference
const DRIVE_PREFS_KEY = 'speakfluent_drive_prefs_v2';

export interface DriveSyncPrefs {
  autoSync: boolean;
  lastSyncedAt: string | null;
}

export function loadDriveSyncPrefs(): DriveSyncPrefs {
  if (typeof window === 'undefined') return { autoSync: true, lastSyncedAt: null };
  try {
    const raw = localStorage.getItem(DRIVE_PREFS_KEY);
    if (!raw) return { autoSync: true, lastSyncedAt: null };
    return JSON.parse(raw);
  } catch (e) {
    return { autoSync: true, lastSyncedAt: null };
  }
}

export function saveDriveSyncPrefs(prefs: Partial<DriveSyncPrefs>): void {
  if (typeof window === 'undefined') return;
  try {
    const current = loadDriveSyncPrefs();
    localStorage.setItem(DRIVE_PREFS_KEY, JSON.stringify({ ...current, ...prefs }));
  } catch (e) {}
}
