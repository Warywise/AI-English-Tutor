import React, { useState, useEffect } from 'react';
import { SavedVocabItem, UserProgressStats } from '../types';
import { loadVocabVault, loadUserStats } from '../utils/storage';
import { audioPlayer } from '../utils/speech';
import {
  X,
  BookOpen,
  Volume2,
  Trophy,
  Flame,
  MessageSquare,
  Search,
  CheckCircle,
  GraduationCap,
} from 'lucide-react';

interface ProgressVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayWord: (word: string) => void;
  onOpenDriveSync?: () => void;
  isDriveConnected?: boolean;
}

export const ProgressVaultModal: React.FC<ProgressVaultModalProps> = ({
  isOpen,
  onClose,
  onPlayWord,
  onOpenDriveSync,
  isDriveConnected,
}) => {
  const [vocab, setVocab] = useState<SavedVocabItem[]>([]);
  const [stats, setStats] = useState<UserProgressStats | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      setVocab(loadVocabVault());
      setStats(loadUserStats());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredVocab = vocab.filter(
    (item) =>
      item.word.toLowerCase().includes(search.toLowerCase()) ||
      item.meaningPt.toLowerCase().includes(search.toLowerCase())
  );

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

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-500 text-white flex items-center justify-center shadow-md shadow-indigo-200">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Seu Progresso & Vocabulário</h2>
            <p className="text-xs text-slate-500">
              Tudo o que você pratica com seu tutor fica salvo automaticamente aqui.
            </p>
          </div>
        </div>

        {/* Google Drive Cloud Backup Banner */}
        {onOpenDriveSync && (
          <div className="mb-5 p-3 rounded-2xl bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white text-sky-600 border border-sky-200 flex items-center justify-center shadow-xs">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
                </svg>
              </div>
              <div className="text-xs">
                <span className="font-bold text-slate-900 block">
                  {isDriveConnected ? 'Nuvem Conectada ao Google Drive' : 'Backup Remoto no Google Drive'}
                </span>
                <span className="text-slate-500 text-[11px]">
                  {isDriveConnected
                    ? 'Seus dados podem ser sincronizados e restaurados a qualquer momento.'
                    : 'Salve seu progresso remotamente para nunca perder seus estudos.'}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                onClose();
                onOpenDriveSync();
              }}
              className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
            >
              {isDriveConnected ? 'Gerenciar Backup' : 'Conectar Drive'}
            </button>
          </div>
        )}

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-600 text-white shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider block">
                  Mensagens
                </span>
                <span className="text-xl font-bold text-slate-900">
                  {stats.totalMessagesSent}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-100 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider block">
                  Dias Seguidos
                </span>
                <span className="text-xl font-bold text-slate-900">
                  {stats.streakDays} {stats.streakDays === 1 ? 'dia' : 'dias'}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-600 text-white shrink-0">
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider block">
                  Média Fluência
                </span>
                <span className="text-xl font-bold text-slate-900">
                  {stats.averageScore}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Vocab Vault Header */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Banco de Palavras Aprendidas ({vocab.length})
              </h3>
            </div>

            <div className="relative w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Buscar palavra..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {vocab.length === 0 ? (
            <div className="py-12 text-center p-6 rounded-2xl border border-dashed border-slate-200 text-slate-400">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-medium text-slate-600">
                Seu banco de palavras ainda está vazio.
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Conforme você conversa com seu tutor, as novas expressões e termos ensinados serão automaticamente salvos aqui!
              </p>
            </div>
          ) : filteredVocab.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">
              Nenhuma palavra encontrada para "{search}".
            </p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {filteredVocab.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 hover:border-indigo-200 transition-colors flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        {item.word}
                      </span>
                      <span className="text-indigo-600 font-medium">
                        • {item.meaningPt}
                      </span>
                    </div>
                    {item.example && (
                      <p className="text-slate-500 italic text-[11px]">
                        "{item.example}"
                      </p>
                    )}
                    <span className="text-[10px] text-slate-400 block">
                      Cenário: {item.scenarioTitle}
                    </span>
                  </div>

                  <button
                    onClick={() => onPlayWord(item.word)}
                    className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 transition-colors shrink-0 shadow-xs"
                    title="Ouvir pronúncia da palavra"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
