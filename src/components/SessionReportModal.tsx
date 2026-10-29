import React, { useState, useEffect } from 'react';
import { SessionReport, Message } from '../types';
import { X, Trophy, CheckCircle2, Award, BookOpen, ArrowRight, Loader2, RefreshCw } from 'lucide-react';

interface SessionReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  scenarioTitle: string;
  level: string;
  onRestartScenario: () => void;
}

export const SessionReportModal: React.FC<SessionReportModalProps> = ({
  isOpen,
  onClose,
  messages,
  scenarioTitle,
  level,
  onRestartScenario,
}) => {
  const [report, setReport] = useState<SessionReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      generateReport();
    }
  }, [isOpen]);

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/session-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map((m) => ({ role: m.role, text: m.text })),
          scenarioTitle,
          level,
        }),
      });
      if (!res.ok) {
        throw new Error('Falha ao gerar relatório pedagógico.');
      }
      const data = await res.json();
      setReport(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao processar dados da sessão');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 md:p-8 text-slate-800">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
            <h4 className="text-base font-semibold text-slate-800">
              Avaliando sua sessão com Inteligência Artificial...
            </h4>
            <p className="text-xs text-slate-500">
              Calculando pontuações de gramática, vocabulário e fluência discursiva.
            </p>
          </div>
        ) : error ? (
          <div className="py-8 text-center space-y-4">
            <p className="text-rose-600 text-sm">{error}</p>
            <button
              onClick={generateReport}
              className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700"
            >
              Tentar novamente
            </button>
          </div>
        ) : report ? (
          <div className="space-y-6">
            {/* Header Badge */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-gradient-to-tr from-amber-400 to-amber-500 text-white shadow-lg shadow-amber-200 mx-auto">
                <Trophy className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">
                Relatório de Fluência da Sessão
              </h2>
              <p className="text-xs text-slate-500">
                Cenário: <span className="font-semibold text-slate-700">{scenarioTitle}</span> • Nível {level}
              </p>
            </div>

            {/* Score Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-100 text-center">
                <span className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider">
                  Geral
                </span>
                <div className="text-2xl font-black text-indigo-950 mt-0.5">
                  {report.overallScore}%
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-100 text-center">
                <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">
                  Gramática
                </span>
                <div className="text-2xl font-black text-emerald-950 mt-0.5">
                  {report.grammarScore}%
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-sky-50/80 border border-sky-100 text-center">
                <span className="text-[10px] uppercase font-bold text-sky-600 tracking-wider">
                  Fluência
                </span>
                <div className="text-2xl font-black text-sky-950 mt-0.5">
                  {report.fluencyScore}%
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-100 text-center">
                <span className="text-[10px] uppercase font-bold text-amber-600 tracking-wider">
                  Vocabulário
                </span>
                <div className="text-2xl font-black text-amber-950 mt-0.5">
                  {report.vocabularyScore}%
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
              <p className="text-sm text-slate-700 leading-relaxed font-normal">
                {report.summaryPt}
              </p>
            </div>

            {/* Strengths & Improvements */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100/80 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Pontos Fortes Demonstrados</span>
                </div>
                <ul className="space-y-1 text-xs text-slate-700 list-disc list-inside">
                  {report.topStrengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100/80 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                  <Award className="w-4 h-4 text-amber-600" />
                  <span>O que focar na próxima vez</span>
                </div>
                <ul className="space-y-1 text-xs text-slate-700 list-disc list-inside">
                  {report.areasToImprove.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Key Grammar Fixes */}
            {report.keyGrammarFixes && report.keyGrammarFixes.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Principais Correções Gramaticais
                </h4>
                <div className="space-y-2">
                  {report.keyGrammarFixes.map((fix, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <span className="line-through text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                          {fix.before}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          {fix.after}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px] pt-1">
                        {fix.ruleExplanationPt}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Vocabulary Learned */}
            {report.topVocabularyLearned && report.topVocabularyLearned.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <span>Novas Palavras & Expressões Gravadas</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {report.topVocabularyLearned.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-indigo-50/40 border border-indigo-100 text-xs"
                    >
                      <span className="font-bold text-slate-900">{item.word}</span>
                      <span className="text-slate-500 ml-1">({item.meaningPt})</span>
                      <p className="text-[11px] text-indigo-900 italic mt-0.5">
                        "{item.usage}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Next challenge recommendation */}
            {report.suggestedNextChallenge && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-200/60 text-xs">
                <span className="font-bold text-indigo-900 block mb-0.5">
                  🚀 Próximo Desafio Sugerido:
                </span>
                <p className="text-slate-700">{report.suggestedNextChallenge}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => {
                  onClose();
                  onRestartScenario();
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Praticar Este Cenário Novamente</span>
              </button>

              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all"
              >
                Continuar Treinando
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
