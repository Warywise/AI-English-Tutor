import React, { useState } from 'react';
import { TurnFeedback } from '../types';
import { CheckCircle2, AlertCircle, Sparkles, Volume2, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';

interface FeedbackCardProps {
  feedback: TurnFeedback;
  userText: string;
  isConciseMode?: boolean;
  onCheckPronunciation: (phrase: string) => void;
  onPlayWord: (word: string) => void;
}

export const FeedbackCard: React.FC<FeedbackCardProps> = ({
  feedback,
  userText,
  isConciseMode = false,
  onCheckPronunciation,
  onPlayWord,
}) => {
  // In concise mode, default to compact view; user can still expand details
  const [isExpanded, setIsExpanded] = useState(!isConciseMode);

  const getScoreBadge = (score: number) => {
    if (score >= 85) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (score >= 70) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-rose-700 bg-rose-50 border-rose-200';
  };

  const hasCorrections = feedback.corrections && feedback.corrections.length > 0;
  const hasBetterWays = feedback.betterWaysToSay && feedback.betterWaysToSay.length > 0;
  const hasPronunciation = feedback.pronunciationTips && feedback.pronunciationTips.length > 0;
  const hasVocab = feedback.vocabularyBoost && feedback.vocabularyBoost.length > 0;

  // Render Concise Mode (Modo Conversa Livre)
  if (isConciseMode && !isExpanded) {
    return (
      <div className="mt-2 rounded-2xl bg-gradient-to-r from-indigo-50/70 via-sky-50/50 to-white border border-indigo-100 shadow-sm p-3 text-slate-800 transition-all">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="p-1 rounded-lg bg-indigo-500/10 text-indigo-600 shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
            <p className="text-xs font-medium text-slate-700 truncate">
              {feedback.overallFeedbackPt ||
                (hasCorrections
                  ? `Dica: ${feedback.corrections[0].explanationPt}`
                  : 'Mandou super bem! Fala muito natural.')}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${getScoreBadge(
                feedback.fluencyScore
              )}`}
            >
              {feedback.fluencyScore}%
            </span>
            <button
              onClick={() => setIsExpanded(true)}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
            >
              <span>Detalhes</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Quick 1 better way to say pill if available */}
        {hasBetterWays && (
          <div className="mt-2 pt-2 border-t border-indigo-100/60 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-500">Alternativa natural:</span>
            <div className="flex items-center gap-1.5 font-medium text-indigo-950">
              <span>"{feedback.betterWaysToSay[0].version}"</span>
              <button
                onClick={() => onPlayWord(feedback.betterWaysToSay[0].version)}
                className="text-slate-400 hover:text-indigo-600 p-0.5"
                title="Ouvir"
              >
                <Volume2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Standard detailed or expanded view
  return (
    <div className="mt-2 rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden text-slate-800 transition-all">
      {/* Header Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between px-4 py-2.5 bg-slate-50/80 hover:bg-slate-100/70 cursor-pointer border-b border-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            {isConciseMode ? 'Feedback Leve do Tutor' : 'Feedback Pedagógico da sua fala'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Mini score pills */}
          <div className="flex items-center gap-1.5 text-xs">
            <span
              className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${getScoreBadge(
                feedback.grammarScore
              )}`}
            >
              Gramática {feedback.grammarScore}%
            </span>
            <span
              className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${getScoreBadge(
                feedback.fluencyScore
              )}`}
            >
              Fluência {feedback.fluencyScore}%
            </span>
          </div>

          <button className="text-slate-400 hover:text-slate-600 p-0.5">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3.5 text-sm">
        {/* Tutor quick highlight */}
        {feedback.overallFeedbackPt && (
          <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100/80 text-xs text-indigo-900 font-medium">
            💡 {feedback.overallFeedbackPt}
          </div>
        )}

        {/* 1. Grammar Corrections */}
        {hasCorrections ? (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Ajuste Gramatical Recomendado</span>
            </div>
            <div className="space-y-2">
              {feedback.corrections.map((corr, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-rose-50/60 border border-rose-100 text-xs space-y-1.5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="line-through text-rose-600 bg-rose-100/70 px-2 py-0.5 rounded font-mono">
                      {corr.original}
                    </span>
                    <span className="text-slate-400 font-bold">➔</span>
                    <span className="text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded font-mono font-semibold">
                      {corr.corrected}
                    </span>
                  </div>
                  <p className="text-slate-700 leading-relaxed font-normal">
                    {corr.explanationPt}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100 text-emerald-800 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Excelente! Estrutura correta e natural sem erros críticos.</span>
          </div>
        )}

        {/* 2. Better Ways to Say (Native Speaker Phrasing) */}
        {hasBetterWays && (
          <div className="space-y-1.5 pt-1 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Como um nativo também falaria</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {feedback.betterWaysToSay.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 hover:border-indigo-200 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-100/70 text-indigo-700">
                      {item.style === 'casual' ? 'Descontraído' : 'Mais Natural'}
                    </span>
                    <button
                      onClick={() => onPlayWord(item.version)}
                      className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
                      title="Ouvir pronúncia"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs font-medium text-slate-800 mb-0.5">"{item.version}"</p>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    {item.explanationPt}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Pronunciation Tips */}
        {hasPronunciation && (
          <div className="space-y-1.5 pt-1 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                <Volume2 className="w-3.5 h-3.5 text-amber-600" />
                <span>Dica de Pronúncia para Brasileiros</span>
              </div>
              <button
                onClick={() => onCheckPronunciation(userText)}
                className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 underline decoration-indigo-300"
              >
                Analisar fonética completa →
              </button>
            </div>

            <div className="space-y-1.5">
              {feedback.pronunciationTips.map((tip, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between p-2.5 rounded-xl bg-amber-50/50 border border-amber-200/60 text-xs"
                >
                  <div className="space-y-0.5 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{tip.word}</span>
                      <span className="font-mono text-amber-800 bg-amber-100/80 px-1.5 py-0.2 rounded text-[11px]">
                        /{tip.ipa}/
                      </span>
                    </div>
                    <p className="text-slate-700 text-[11px] leading-relaxed">{tip.tipPt}</p>
                  </div>
                  <button
                    onClick={() => onPlayWord(tip.word)}
                    className="p-1.5 rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 shrink-0 transition-colors"
                    title="Ouvir palavra devagar"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Vocabulary Boost */}
        {hasVocab && (
          <div className="space-y-1.5 pt-1 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
              <span>Vocabulário & Expressões</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {feedback.vocabularyBoost.map((v, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50/80 border border-emerald-200/70 text-xs text-emerald-950"
                >
                  <button
                    onClick={() => onPlayWord(v.word)}
                    className="text-emerald-700 hover:text-emerald-900"
                    title="Ouvir"
                  >
                    <Volume2 className="w-3 h-3" />
                  </button>
                  <span className="font-semibold">{v.word}:</span>
                  <span className="text-emerald-800">{v.meaningPt}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
