import React from 'react';
import { Scenario } from '../types';
import {
  Compass,
  CheckCircle2,
  Play,
  RotateCcw,
  Volume2,
  Sparkles,
  ArrowRight,
  Globe2,
} from 'lucide-react';

interface ScenarioLobbyProps {
  scenario: Scenario;
  tutorName?: string;
  onStartScenario: () => void;
  onOpenScenarioSelector: () => void;
  hasSavedHistory: boolean;
  savedMessagesCount: number;
  onResumeScenario?: () => void;
}

export const ScenarioLobby: React.FC<ScenarioLobbyProps> = ({
  scenario,
  tutorName = 'Alex',
  onStartScenario,
  onOpenScenarioSelector,
  hasSavedHistory,
  savedMessagesCount,
  onResumeScenario,
}) => {
  return (
    <div className="max-w-2xl mx-auto my-auto p-6 md:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-xl shadow-slate-200/50 animate-in fade-in duration-200 text-slate-800">
      {/* Category & Change Scenario Button */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider border border-indigo-200/60">
          Cenário Guiado • Nível {scenario.recommendedLevel}
        </span>

        <button
          onClick={onOpenScenarioSelector}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
        >
          <span>Trocar Cenário</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Title & Description */}
      <div className="space-y-1 mb-5">
        <h2 className="text-2xl md:text-3xl font-black text-slate-900">
          {scenario.title}
        </h2>
        <p className="text-sm text-slate-500 font-medium">
          {scenario.titleEn}
        </p>
        <p className="text-xs md:text-sm text-slate-600 leading-relaxed pt-1">
          {scenario.description}
        </p>
      </div>

      {/* Role Play Context Box */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 mb-5 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-0.5">
              Personagem do Tutor ({tutorName})
            </span>
            <p className="font-bold text-indigo-950">
              {scenario.partnerRole}
            </p>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-0.5">
              Seu Papel
            </span>
            <p className="font-bold text-slate-800">
              {scenario.userRole}
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-200/70">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-0.5">
            Ambiente e Contexto
          </span>
          <p className="text-slate-600 italic">
            "{scenario.context}"
          </p>
        </div>
      </div>

      {/* Mission Checklist */}
      <div className="space-y-2 mb-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Objetivos da Missão (O que praticar):</span>
        </h3>
        <div className="space-y-1.5">
          {scenario.missionGoals.map((goal, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2.5 p-2.5 rounded-xl bg-indigo-50/50 border border-indigo-100 text-xs text-slate-700"
            >
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>{goal}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Meta Pills (Level, Accent) */}
      <div className="flex items-center gap-3 mb-6 text-xs text-slate-500">
        <span className="flex items-center gap-1 font-medium">
          <Globe2 className="w-3.5 h-3.5 text-slate-400" />
          Sotaque: <strong className="text-slate-700">{scenario.accent}</strong>
        </span>
        <span>•</span>
        <span className="font-medium">
          Nível recomendado: <strong className="text-slate-700">{scenario.recommendedLevel}</strong>
        </span>
      </div>

      {/* Action Area */}
      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
        {hasSavedHistory && onResumeScenario ? (
          <button
            type="button"
            onClick={onResumeScenario}
            className="w-full sm:w-auto px-4 py-3 rounded-2xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all text-center"
          >
            Continuar conversa salva ({savedMessagesCount} mensagens)
          </button>
        ) : (
          <div className="text-xs text-slate-400 hidden sm:block">
            Ao clicar em iniciar, {tutorName} começará a encenar o papel.
          </div>
        )}

        <button
          type="button"
          onClick={onStartScenario}
          className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-sm font-bold shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 group"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>Iniciar Prática deste Cenário</span>
        </button>
      </div>
    </div>
  );
};
