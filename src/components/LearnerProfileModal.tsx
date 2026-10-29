import React, { useState } from 'react';
import { LearnerProfile, LearnedFact } from '../types';
import {
  Brain,
  X,
  Sparkles,
  Save,
  Check,
  Plus,
  Trash2,
  Briefcase,
  MapPin,
  Target,
  Heart,
  User,
  FileText,
  Cloud,
} from 'lucide-react';

interface LearnerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: LearnerProfile;
  onSaveProfile: (profile: LearnerProfile) => void;
  onOpenDriveSync?: () => void;
  isDriveConnected?: boolean;
}

export const LearnerProfileModal: React.FC<LearnerProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
  onOpenDriveSync,
  isDriveConnected,
}) => {
  if (!isOpen) return null;

  const [formData, setFormData] = useState<LearnerProfile>({ ...profile });
  const [newFactInput, setNewFactInput] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleFieldChange = (field: keyof LearnerProfile, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSavedSuccess(false);
  };

  const handleAddFact = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newFactInput.trim();
    if (!trimmed) return;

    const newFact: LearnedFact = {
      id: `fact-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      fact: trimmed,
      createdAt: Date.now(),
    };

    setFormData((prev) => ({
      ...prev,
      autoLearnedFacts: [newFact, ...prev.autoLearnedFacts],
    }));
    setNewFactInput('');
    setSavedSuccess(false);
  };

  const handleRemoveFact = (factId: string) => {
    setFormData((prev) => ({
      ...prev,
      autoLearnedFacts: prev.autoLearnedFacts.filter((f) => f.id !== factId),
    }));
    setSavedSuccess(false);
  };

  const handleSave = () => {
    onSaveProfile(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50/80 via-white to-indigo-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-200">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-slate-900">
                  Perfil & Memória Contínua
                </h3>
                <span className="text-[11px] font-bold text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded-full border border-purple-200/50">
                  {formData.autoLearnedFacts.length} lembranças
                </span>
              </div>
              <p className="text-xs text-slate-500">
                O tutor usa estas informações para personalizar conversas e nunca esquecer seu contexto
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {/* Informative notice */}
          <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100/80 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
            <div className="text-xs text-purple-950 leading-relaxed">
              <span className="font-bold">Como funciona a memória contínua:</span> Durante qualquer conversa livre ou cenário, o tutor identifica fatos que você conta sobre sua vida e os guarda aqui. Você pode editar ou apagar qualquer lembrança a qualquer momento!
            </div>
          </div>

          {/* Structured Fields */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-purple-600" />
              <span>Dados Pessoais Principais</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Preferred Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Como prefere ser chamado?
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={formData.preferredName}
                    onChange={(e) => handleFieldChange('preferredName', e.target.value)}
                    placeholder="Ex: Gustavo"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-purple-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Occupation */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Profissão ou Área de Atuação
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={formData.occupation}
                    onChange={(e) => handleFieldChange('occupation', e.target.value)}
                    placeholder="Ex: Engenheiro de Software / TI"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-purple-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cidade / País onde mora
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleFieldChange('location', e.target.value)}
                    placeholder="Ex: Curitiba, Brasil"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-purple-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Main Goal */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Objetivo Principal com o Inglês
                </label>
                <div className="relative">
                  <Target className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={formData.primaryGoal}
                    onChange={(e) => handleFieldChange('primaryGoal', e.target.value)}
                    placeholder="Ex: Fluência para reuniões com clientes"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-purple-500 focus:outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Hobbies / Interests */}
            <div className="mt-3.5">
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-500" />
                <span>Interesses, Hobbies & Tópicos Favoritos</span>
              </label>
              <input
                type="text"
                value={formData.interests}
                onChange={(e) => handleFieldChange('interests', e.target.value)}
                placeholder="Ex: Tocar violão, tecnologia, séries de ficção científica, viagens"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-purple-500 focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Auto-Learned Facts List */}
          <div className="border-t border-slate-100 pt-5">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 text-purple-600" />
                <span>Lembranças & Fatos Memorizados ({formData.autoLearnedFacts.length})</span>
              </h4>

              {/* Toggle Auto-extract */}
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={formData.autoExtractEnabled}
                  onChange={(e) => handleFieldChange('autoExtractEnabled', e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-purple-600 focus:ring-purple-500 border-slate-300"
                />
                <span>Aprender fatos automaticamente no chat</span>
              </label>
            </div>

            {/* Add fact manually form */}
            <form onSubmit={handleAddFact} className="flex gap-2 mb-3">
              <input
                type="text"
                value={newFactInput}
                onChange={(e) => setNewFactInput(e.target.value)}
                placeholder="Adicionar fato novo... (Ex: Vai viajar para a Califórnia em outubro)"
                className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-purple-500 focus:outline-none transition-all"
              />
              <button
                type="submit"
                disabled={!newFactInput.trim()}
                className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar</span>
              </button>
            </form>

            {/* List of facts */}
            {formData.autoLearnedFacts.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-500">
                Nenhum fato memorizado ainda. Conforme você conversar com o tutor ou adicionar detalhes acima, as lembranças aparecerão aqui.
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {formData.autoLearnedFacts.map((fact) => (
                  <div
                    key={fact.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 text-xs text-slate-700 hover:border-purple-200 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                      <span className="font-medium text-slate-800 leading-snug">{fact.fact}</span>
                    </div>

                    <button
                      onClick={() => handleRemoveFact(fact.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                      title="Excluir este fato"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* General Free-Form Notes */}
          <div className="border-t border-slate-100 pt-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-purple-600" />
              <span>Anotações Livres & Preferências do Aluno</span>
            </h4>
            <p className="text-xs text-slate-500 mb-2">
              Escreva aqui qualquer detalhe livre que queira que seu tutor leve em conta sempre (ex: suas dificuldades gramaticais, rotina diária ou preferências de feedback).
            </p>
            <textarea
              rows={3}
              value={formData.generalNotes}
              onChange={(e) => handleFieldChange('generalNotes', e.target.value)}
              placeholder="Ex: Trabalho em home office e tenho reuniões diárias em inglês. Costumo errar as preposições 'in' e 'on', então me chame a atenção se eu cometer esses deslizes."
              className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-purple-500 focus:outline-none transition-all leading-relaxed"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {onOpenDriveSync && (
              <button
                type="button"
                onClick={onOpenDriveSync}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
                  isDriveConnected
                    ? 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
                title="Sincronizar no Google Drive"
              >
                <Cloud className={`w-3.5 h-3.5 ${isDriveConnected ? 'text-sky-600' : 'text-slate-400'}`} />
                <span>{isDriveConnected ? 'Drive Conectado' : 'Sincronizar com Drive'}</span>
              </button>
            )}

            {savedSuccess && (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Memória salva com sucesso!</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-200 flex items-center gap-1.5 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Memória</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
