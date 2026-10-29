import React, { useState } from 'react';
import { Scenario, CEFRLevel } from '../types';
import { PRESET_SCENARIOS } from '../data/scenarios';
import {
  Coffee,
  Briefcase,
  Plane,
  Building,
  Sparkles,
  HeartPulse,
  Cpu,
  PlusCircle,
  MessageSquare,
  Search,
  CheckCircle2,
  X,
  Loader2,
} from 'lucide-react';

interface ScenarioSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  currentScenario: Scenario | null;
  onSelectScenario: (scenario: Scenario) => void;
  onSelectFreeTutor: () => void;
  userLevel: CEFRLevel;
  tutorName?: string;
}

export const ScenarioSelector: React.FC<ScenarioSelectorProps> = ({
  isOpen,
  onClose,
  currentScenario,
  onSelectScenario,
  onSelectFreeTutor,
  userLevel,
  tutorName = 'Alex',
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGeneratingCustom, setIsGeneratingCustom] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);

  if (!isOpen) return null;

  const getIcon = (name: string) => {
    switch (name) {
      case 'Coffee':
        return <Coffee className="w-5 h-5" />;
      case 'Briefcase':
        return <Briefcase className="w-5 h-5" />;
      case 'Plane':
        return <Plane className="w-5 h-5" />;
      case 'Building':
        return <Building className="w-5 h-5" />;
      case 'Sparkles':
        return <Sparkles className="w-5 h-5" />;
      case 'HeartPulse':
        return <HeartPulse className="w-5 h-5" />;
      case 'Cpu':
        return <Cpu className="w-5 h-5" />;
      default:
        return <MessageSquare className="w-5 h-5" />;
    }
  };

  const filteredScenarios = PRESET_SCENARIOS.filter((s) => {
    const matchesCategory = filterCategory === 'all' || s.category === filterCategory;
    const matchesLevel = filterLevel === 'all' || s.recommendedLevel === filterLevel;
    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.titleEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesLevel && matchesSearch;
  });

  const handleGenerateCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim()) return;

    setIsGeneratingCustom(true);
    setCustomError(null);

    try {
      const res = await fetch('/api/generate-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: customPrompt, level: userLevel }),
      });

      if (!res.ok) {
        throw new Error('Não foi possível gerar este cenário personalizado.');
      }

      const generated = await res.json();
      const customScenario: Scenario = {
        ...generated,
        category: 'custom',
        iconName: 'Sparkles',
        recommendedLevel: userLevel,
      };

      onSelectScenario(customScenario);
      onClose();
    } catch (err: any) {
      console.error(err);
      setCustomError(err.message || 'Erro ao gerar cenário');
    } finally {
      setIsGeneratingCustom(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 md:p-8 text-slate-800">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-6 space-y-1">
          <h2 className="text-xl md:text-2xl font-bold text-slate-900">
            Escolha seu Cenário de Prática
          </h2>
          <p className="text-xs md:text-sm text-slate-500">
            Simule conversas reais do dia a dia, trabalho e viagens ou converse livremente com seu tutor.
          </p>
        </div>

        {/* Free Tutor Quick Banner */}
        <div
          onClick={() => {
            onSelectFreeTutor();
            onClose();
          }}
          className="p-4 mb-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 text-white shadow-lg shadow-indigo-200 cursor-pointer hover:opacity-95 transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base">Modo Conversa Livre com {tutorName}</span>
                <span className="px-2 py-0.5 rounded-full bg-white/25 text-[10px] font-bold uppercase tracking-wider">
                  Recomendado
                </span>
              </div>
              <p className="text-xs text-white/90 mt-0.5">
                Bate-papo leve e aberto sobre qualquer assunto. {tutorName} explica dúvidas rapidamente em português sem travar a conversa!
              </p>
            </div>
          </div>
          <button className="hidden sm:inline-flex px-3.5 py-1.5 rounded-xl bg-white text-indigo-700 text-xs font-bold shadow-sm shrink-0">
            Começar Livre →
          </button>
        </div>

        {/* Custom Scenario Builder Bar */}
        <form onSubmit={handleGenerateCustom} className="mb-6">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4 text-indigo-600" />
              <span>Criar Cenário Personalizado com IA:</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: Negociar aluguel em Toronto, pedir devolução de casaco na Zara, falar sobre cinema..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={isGeneratingCustom || !customPrompt.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all shadow-sm"
              >
                {isGeneratingCustom ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Criando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Gerar Cenário</span>
                  </>
                )}
              </button>
            </div>
            {customError && <p className="text-rose-600 text-[11px]">{customError}</p>}
          </div>
        </form>

        {/* Level Filters & Category Filters */}
        <div className="space-y-2.5 mb-4">
          {/* Level Filter Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Nível:
            </span>
            {[
              { id: 'all', label: 'Todos' },
              { id: 'A1', label: 'A1 (Iniciante)' },
              { id: 'A2', label: 'A2 (Básico)' },
              { id: 'B1', label: 'B1 (Intermediário)' },
              { id: 'B2', label: 'B2 (Interm. Alto)' },
              { id: 'C1', label: 'C1 (Avançado)' },
              { id: 'C2', label: 'C2 (Fluente)' },
            ].map((lvl) => (
              <button
                key={lvl.id}
                onClick={() => setFilterLevel(lvl.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  filterLevel === lvl.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {lvl.label}
              </button>
            ))}
          </div>

          {/* Category Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                Tema:
              </span>
              {[
                { id: 'all', label: 'Todos' },
                { id: 'daily', label: 'Dia a Dia' },
                { id: 'work', label: 'Trabalho / Tech' },
                { id: 'travel', label: 'Viagens' },
                { id: 'social', label: 'Social' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setFilterCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    filterCategory === cat.id
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar cenário..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Scenarios Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredScenarios.map((scenario) => {
            const isSelected = currentScenario?.id === scenario.id;
            return (
              <div
                key={scenario.id}
                onClick={() => {
                  onSelectScenario(scenario);
                  onClose();
                }}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                  isSelected
                    ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20 shadow-md'
                    : 'bg-white border-slate-200/80 hover:border-indigo-200 hover:shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                        {getIcon(scenario.iconName)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 leading-snug">
                          {scenario.title}
                        </h4>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {scenario.titleEn}
                        </span>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 shrink-0">
                      Nível {scenario.recommendedLevel}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed mb-3">
                    {scenario.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Sotaque: {scenario.accent}</span>
                  <span className="font-semibold text-indigo-600 hover:underline">
                    {isSelected ? 'Cenário Ativo ✓' : 'Praticar agora →'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
