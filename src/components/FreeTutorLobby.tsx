import React, { useState } from 'react';
import {
  MessageSquare,
  Sparkles,
  Play,
  Coffee,
  Laptop,
  Film,
  Plane,
  Heart,
  HelpCircle,
} from 'lucide-react';

interface FreeTutorLobbyProps {
  tutorName: string;
  onStartSession: (initialTopic?: string) => void;
  savedMessagesCount: number;
  onResumeSession?: () => void;
}

export const FreeTutorLobby: React.FC<FreeTutorLobbyProps> = ({
  tutorName,
  onStartSession,
  savedMessagesCount,
  onResumeSession,
}) => {
  const [selectedTopic, setSelectedTopic] = useState<string>('Minha rotina e planos de hoje');

  const topicOptions = [
    {
      id: 'routine',
      label: 'Minha rotina e planos de hoje',
      en: 'My daily routine, habits, and weekend plans',
      icon: <Coffee className="w-4 h-4 text-amber-500" />,
    },
    {
      id: 'tech',
      label: 'Tecnologia, trabalho e carreira',
      en: 'Tech trends, remote work, coding and career goals',
      icon: <Laptop className="w-4 h-4 text-sky-500" />,
    },
    {
      id: 'entertainment',
      label: 'Filmes, séries e música',
      en: 'Favorite TV shows, cinema, and Spotify playlists',
      icon: <Film className="w-4 h-4 text-purple-500" />,
    },
    {
      id: 'travel',
      label: 'Viagens e novas culturas',
      en: 'Places I want to visit and dream travel destinations',
      icon: <Plane className="w-4 h-4 text-emerald-500" />,
    },
    {
      id: 'free',
      label: 'Bate-papo totalmente livre',
      en: 'Casual chit-chat about anything on my mind',
      icon: <Heart className="w-4 h-4 text-rose-500" />,
    },
  ];

  return (
    <div className="max-w-2xl mx-auto my-auto p-6 md:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-xl shadow-slate-200/50 animate-in fade-in duration-200 text-slate-800">
      {/* Tutor Profile Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 text-white flex items-center justify-center font-extrabold text-2xl shadow-lg shadow-indigo-200">
          {tutorName.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl md:text-2xl font-black text-slate-900">
              Conheça {tutorName}
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase">
              Tutor Online
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Seu tutor pessoal de conversação em inglês com IA bilíngue.
          </p>
        </div>
      </div>

      {/* Feature Highlights Card */}
      <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2 mb-6 text-xs text-slate-700">
        <div className="flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <p>
            <strong>Conversa Leve & Descontraída:</strong> Converse livremente como se estivesse batendo papo com um amigo nativo.
          </p>
        </div>
        <div className="flex items-start gap-2.5">
          <MessageSquare className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <p>
            <strong>Transição Bilíngue Natural:</strong> {tutorName} fala em inglês, mas explica termos ou gírias difíceis em português sempre que necessário, sem travar o ritmo!
          </p>
        </div>
        <div className="flex items-start gap-2.5">
          <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <p>
            <strong>Feedback Sob Medida:</strong> Você recebe pontuação de fluência, sugestões de como nativos falariam e dicas de fonética rápida.
          </p>
        </div>
      </div>

      {/* Topic Selection */}
      <div className="space-y-3 mb-6">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
          Sobre o que você gostaria de conversar hoje?
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {topicOptions.map((topic) => {
            const isSelected = selectedTopic === topic.label;
            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => setSelectedTopic(topic.label)}
                className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                  isSelected
                    ? 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/80'
                }`}
              >
                <div className="p-2 rounded-xl bg-white shadow-xs shrink-0">
                  {topic.icon}
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    {topic.label}
                  </span>
                  <span className="text-[11px] text-slate-400 block truncate">
                    {topic.en}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Start Button Area */}
      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
        {savedMessagesCount > 1 && onResumeSession ? (
          <button
            type="button"
            onClick={onResumeSession}
            className="w-full sm:w-auto px-4 py-3 rounded-2xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all text-center"
          >
            Continuar conversa anterior ({savedMessagesCount} msgs)
          </button>
        ) : (
          <div className="text-xs text-slate-400 hidden sm:block">
            Você pode falar pelo microfone ou digitar.
          </div>
        )}

        <button
          type="button"
          onClick={() => onStartSession(selectedTopic)}
          className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white text-sm font-bold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 group"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>Iniciar Conversa com {tutorName}</span>
        </button>
      </div>
    </div>
  );
};
