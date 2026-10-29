import React, { useState } from 'react';
import {
  CEFRLevel,
  Accent,
  VoiceId,
  VOICE_OPTIONS,
  ConversationMode,
  PlaybackSpeed,
} from '../types';
import {
  MessageSquare,
  Compass,
  Gauge,
  Trophy,
  Volume2,
  Settings2,
  Sparkles,
  RotateCcw,
  BookOpen,
  UserCheck,
  Cloud,
  Brain,
} from 'lucide-react';

interface HeaderProps {
  mode: ConversationMode;
  onModeChange: (mode: ConversationMode) => void;
  level: CEFRLevel;
  onLevelChange: (level: CEFRLevel) => void;
  accent: Accent;
  onAccentChange: (accent: Accent) => void;
  voiceId: VoiceId;
  onVoiceIdChange: (voiceId: VoiceId) => void;
  playbackSpeed: PlaybackSpeed;
  onPlaybackSpeedChange: (speed: PlaybackSpeed) => void;
  autoPlayAudio: boolean;
  onToggleAutoPlay: () => void;
  onOpenReport: () => void;
  onOpenVault: () => void;
  onOpenMemory: () => void;
  memoryFactsCount?: number;
  onOpenDriveSync: () => void;
  isDriveConnected: boolean;
  driveUserEmail?: string | null;
  onResetSession: () => void;
  messageCount: number;
  savedVocabCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  onModeChange,
  level,
  onLevelChange,
  accent,
  onAccentChange,
  voiceId,
  onVoiceIdChange,
  playbackSpeed,
  onPlaybackSpeedChange,
  autoPlayAudio,
  onToggleAutoPlay,
  onOpenReport,
  onOpenVault,
  onOpenMemory,
  memoryFactsCount = 0,
  onOpenDriveSync,
  isDriveConnected,
  driveUserEmail,
  onResetSession,
  messageCount,
  savedVocabCount,
}) => {
  const [showSettings, setShowSettings] = useState(false);

  const speedOptions: PlaybackSpeed[] = [0.75, 0.9, 1.0, 1.25];

  const cycleSpeed = () => {
    const currentIndex = speedOptions.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % speedOptions.length;
    onPlaybackSpeedChange(speedOptions[nextIndex]);
  };

  const currentVoiceOption =
    VOICE_OPTIONS.find((v) => v.id === voiceId) || VOICE_OPTIONS[0];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-2.5">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left: Brand + Mode Switcher */}
        <div className="flex items-center justify-between w-full md:w-auto gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 text-white flex items-center justify-center shadow-md shadow-indigo-200">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 tracking-tight text-base">
                  SpeakFluent AI
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60 flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-indigo-600" />
                  <span>Tutor: {currentVoiceOption.name}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Prática de conversação em inglês com áudio & feedback bilíngue
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/80 text-xs font-semibold">
            <button
              onClick={() => onModeChange('free_tutor')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                mode === 'free_tutor'
                  ? 'bg-white text-indigo-700 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title={`Conversa livre e aberta com ${currentVoiceOption.name}`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Modo Livre</span>
            </button>

            <button
              onClick={() => onModeChange('scenario')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                mode === 'scenario'
                  ? 'bg-white text-indigo-700 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Cenários guiados (A1 até C2)"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Cenários (A1-C2)</span>
            </button>
          </div>
        </div>

        {/* Right Controls: Speed, Level, Vocab, Report, Settings */}
        <div className="flex items-center flex-wrap justify-end gap-2 w-full md:w-auto">
          {/* Speed Selector Pill */}
          <button
            onClick={cycleSpeed}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              playbackSpeed < 1.0
                ? 'bg-amber-50 text-amber-800 border-amber-200 shadow-sm'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
            title="Clique para alternar a velocidade da fala do áudio (0.75x, 0.9x, 1.0x, 1.25x)"
          >
            <Gauge className="w-3.5 h-3.5 text-indigo-600" />
            <span>Velocidade:</span>
            <span className="font-mono font-bold text-indigo-700">
              {playbackSpeed === 0.75
                ? '0.75x'
                : playbackSpeed === 0.9
                ? '0.9x'
                : playbackSpeed === 1.0
                ? '1.0x'
                : '1.25x'}
            </span>
          </button>

          {/* CEFR Level Selector */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
            <span className="text-[11px] text-slate-500 font-medium">Nível:</span>
            <select
              value={level}
              onChange={(e) => onLevelChange(e.target.value as CEFRLevel)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="A1">A1 - Iniciante</option>
              <option value="A2">A2 - Básico</option>
              <option value="B1">B1 - Intermediário</option>
              <option value="B2">B2 - Intermediário Alto</option>
              <option value="C1">C1 - Avançado</option>
              <option value="C2">C2 - Fluente / Nativo</option>
            </select>
          </div>

          {/* Vocabulary Vault Button */}
          <button
            onClick={onOpenVault}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-indigo-300 bg-white text-slate-700 hover:text-indigo-700 text-xs font-semibold transition-colors shadow-xs"
            title="Ver palavras aprendidas e progresso salvo"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Progresso</span>
            {savedVocabCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                {savedVocabCount}
              </span>
            )}
          </button>

          {/* Student Profile & Continuous Memory Button */}
          <button
            onClick={onOpenMemory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-purple-300 bg-white text-slate-700 hover:text-purple-700 text-xs font-semibold transition-colors shadow-xs"
            title="Perfil do Estudante & Memória Contínua do Tutor (o que ele lembra de você)"
          >
            <Brain className="w-3.5 h-3.5 text-purple-600" />
            <span className="hidden sm:inline">Memória</span>
            {memoryFactsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">
                {memoryFactsCount}
              </span>
            )}
          </button>

          {/* Google Drive Remote Sync Button */}
          <button
            onClick={onOpenDriveSync}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-xs ${
              isDriveConnected
                ? 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
            }`}
            title={
              isDriveConnected
                ? `Google Drive conectado (${driveUserEmail || 'Sincronizado'})`
                : 'Sincronizar progresso com Google Drive'
            }
          >
            <Cloud className={`w-3.5 h-3.5 ${isDriveConnected ? 'text-sky-600' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">Drive</span>
            {isDriveConnected && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>

          {/* Settings Popover toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
            title="Configurações de voz e áudio"
          >
            <Settings2 className="w-4 h-4" />
          </button>

          {/* End Session / Report Card Button */}
          {messageCount > 1 && (
            <button
              onClick={onOpenReport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-bold hover:from-amber-600 hover:to-amber-700 shadow-sm transition-all"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Relatório</span>
            </button>
          )}

          {/* Reset button */}
          <button
            onClick={onResetSession}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Reiniciar esta conversa"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Settings Dropdown Drawer */}
      {showSettings && (
        <div className="max-w-6xl mx-auto mt-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs animate-in slide-in-from-top-2 duration-150">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-semibold">Tutor & Voz:</span>
              <select
                value={voiceId}
                onChange={(e) => onVoiceIdChange(e.target.value as VoiceId)}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-medium cursor-pointer"
              >
                {VOICE_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name} ({opt.genderLabel} • {opt.description})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-semibold">Sotaque:</span>
              <select
                value={accent}
                onChange={(e) => onAccentChange(e.target.value as Accent)}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-medium cursor-pointer"
              >
                <option value="American">Americano (US)</option>
                <option value="British">Britânico (UK)</option>
                <option value="Australian">Australiano (AU)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-slate-700 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoPlayAudio}
                  onChange={onToggleAutoPlay}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span>Tocar áudio automaticamente ao receber resposta nova</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
