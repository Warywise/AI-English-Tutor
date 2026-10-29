import React, { useState, useEffect } from 'react';
import { PhoneticAnalysis } from '../types';
import { X, Volume2, Sparkles, Loader2, PlayCircle, BookOpen, AlertTriangle } from 'lucide-react';
import { audioPlayer } from '../utils/speech';

interface PronunciationModalProps {
  isOpen: boolean;
  onClose: () => void;
  phrase: string;
}

export const PronunciationModal: React.FC<PronunciationModalProps> = ({
  isOpen,
  onClose,
  phrase,
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PhoneticAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slowAudioPlaying, setSlowAudioPlaying] = useState(false);

  useEffect(() => {
    if (isOpen && phrase) {
      fetchAnalysis(phrase);
    } else {
      setData(null);
      setError(null);
    }
  }, [isOpen, phrase]);

  const fetchAnalysis = async (targetPhrase: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/pronunciation-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phrase: targetPhrase }),
      });
      if (!res.ok) {
        throw new Error('Não foi possível carregar a análise fonética.');
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao carregar detalhes');
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = (rate: number = 1.0) => {
    if (!phrase) return;
    if (rate < 1.0) setSlowAudioPlaying(true);
    audioPlayer.play(phrase, null, {
      rate,
      onEnd: () => setSlowAudioPlaying(false),
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 text-slate-800">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Pronunciation Lab & Fonética</h3>
            <p className="text-xs text-slate-500">
              Guia prático focado nas armadilhas comuns para brasileiros
            </p>
          </div>
        </div>

        {/* Target Phrase Box */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 border border-indigo-100/80 mb-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">
                Frase / Palavra analisada
              </span>
              <h4 className="text-xl font-bold text-slate-900 mt-0.5">"{phrase}"</h4>
              {data?.ipa && (
                <div className="flex items-center gap-2 mt-1.5 font-mono text-sm text-indigo-700 bg-indigo-100/60 px-2.5 py-0.5 rounded-lg w-fit">
                  <span>/{data.ipa}/</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5 shrink-0">
              <button
                onClick={() => handlePlay(1.0)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-sm transition-all"
              >
                <PlayCircle className="w-4 h-4" />
                <span>Ouvir 1.0x</span>
              </button>
              <button
                onClick={() => handlePlay(0.75)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-all"
              >
                <Volume2 className="w-4 h-4 text-indigo-600" />
                <span>Devagar 0.75x</span>
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-xs font-medium">Analisando fonemas e padrões articulatórios...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {error}
          </div>
        ) : data ? (
          <div className="space-y-4">
            {/* Syllable Stress */}
            {data.syllableStress && (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
                <div className="text-xs font-semibold text-slate-600 mb-1">
                  🎯 Ritmo e Sílaba Tônica (Stress):
                </div>
                <div className="text-base font-bold text-indigo-950 font-mono">
                  {data.syllableStress}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  A ênfase correta na sílaba maiúscula é o segredo para soar natural e ser compreendido imediatamente por nativos.
                </p>
              </div>
            )}

            {/* Pitfalls for Brazilians */}
            {data.portuguesePitfalls && data.portuguesePitfalls.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/70 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Cuidado: Armadilhas Típicas de Brasileiros</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-700 list-disc list-inside">
                  {data.portuguesePitfalls.map((pitfall, i) => (
                    <li key={i} className="leading-relaxed">
                      {pitfall}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Mouth & Tongue placement tips */}
            {data.mouthPlacementTips && data.mouthPlacementTips.length > 0 && (
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/70 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Dicas Físicas de Articulação (Boca e Língua)</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-700 list-disc list-inside">
                  {data.mouthPlacementTips.map((tip, i) => (
                    <li key={i} className="leading-relaxed">
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Drill */}
            {data.practiceDrill && (
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/70">
                <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block mb-1">
                  Exercício de Repetição Rápida (Shadowing)
                </span>
                <p className="text-xs text-slate-800 italic">"{data.practiceDrill}"</p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};
