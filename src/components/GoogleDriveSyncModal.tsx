import React, { useState, useEffect } from 'react';
import {
  X,
  Cloud,
  CloudUpload,
  CloudDownload,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Download,
  FileJson,
  ShieldCheck,
  Sparkles,
  Database,
  Clock,
  UserCheck,
} from 'lucide-react';
import {
  signInWithGoogleDrive,
  disconnectGoogleDrive,
  findRemoteBackupFile,
  uploadBackupToDrive,
  restoreProgressFromDrive,
  downloadBackupLocally,
  getCachedAccessToken,
  getCachedUser,
  subscribeToAuth,
} from '../services/googleDriveService';
import {
  loadDriveSyncPrefs,
  saveDriveSyncPrefs,
  getAllChatHistories,
  loadVocabVault,
  loadUserStats,
} from '../utils/storage';
import { DriveBackupFileMetadata } from '../types';

interface GoogleDriveSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataRestored?: () => void;
}

export const GoogleDriveSyncModal: React.FC<GoogleDriveSyncModalProps> = ({
  isOpen,
  onClose,
  onDataRestored,
}) => {
  const [user, setUser] = useState(getCachedUser());
  const [hasToken, setHasToken] = useState(!!getCachedAccessToken());
  const [remoteFile, setRemoteFile] = useState<DriveBackupFileMetadata | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showConfirmRestore, setShowConfirmRestore] = useState(false);

  const [autoSync, setAutoSync] = useState(() => loadDriveSyncPrefs().autoSync);
  const [lastSyncedAt, setLastSyncedAt] = useState(() => loadDriveSyncPrefs().lastSyncedAt);

  // Local data counters
  const [localStats, setLocalStats] = useState({ messagesCount: 0, vocabCount: 0 });

  useEffect(() => {
    const unsubscribe = subscribeToAuth((u, tokenPresent) => {
      setUser(u);
      setHasToken(tokenPresent);
    });
    return unsubscribe;
  }, []);

  // Update local stats when opening modal
  useEffect(() => {
    if (isOpen) {
      const histories = getAllChatHistories();
      let totalMsgs = 0;
      Object.values(histories).forEach((msgs) => {
        if (Array.isArray(msgs)) totalMsgs += msgs.length;
      });
      const vocab = loadVocabVault();
      setLocalStats({
        messagesCount: totalMsgs,
        vocabCount: vocab.length,
      });

      const prefs = loadDriveSyncPrefs();
      setAutoSync(prefs.autoSync);
      setLastSyncedAt(prefs.lastSyncedAt);

      if (hasToken) {
        checkRemoteBackup();
      }
    }
  }, [isOpen, hasToken]);

  const checkRemoteBackup = async () => {
    const token = getCachedAccessToken();
    if (!token) return;
    setIsLoadingFile(true);
    try {
      const file = await findRemoteBackupFile(token);
      setRemoteFile(file);
    } catch (err: any) {
      console.warn('Erro ao verificar arquivo no Drive:', err);
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setMessage(null);
    try {
      const { user: loggedUser, accessToken } = await signInWithGoogleDrive();
      setUser(loggedUser);
      setHasToken(true);
      setMessage({
        type: 'success',
        text: `Conectado com sucesso como ${loggedUser.displayName || loggedUser.email}!`,
      });
      setIsLoadingFile(true);
      const file = await findRemoteBackupFile(accessToken);
      setRemoteFile(file);
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Falha ao autenticar com a conta Google.',
      });
    } finally {
      setIsSigningIn(false);
      setIsLoadingFile(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectGoogleDrive();
    setUser(null);
    setHasToken(false);
    setRemoteFile(null);
    setMessage({
      type: 'info',
      text: 'Desconectado do Google Drive.',
    });
  };

  const handleSyncNow = async () => {
    const token = getCachedAccessToken();
    if (!token) {
      setMessage({ type: 'error', text: 'Conecte sua conta do Google Drive primeiro.' });
      return;
    }

    setIsSyncing(true);
    setMessage(null);
    try {
      const { fileMetadata } = await uploadBackupToDrive(token);
      setRemoteFile(fileMetadata);
      const nowIso = new Date().toISOString();
      setLastSyncedAt(nowIso);
      setMessage({
        type: 'success',
        text: 'Backup salvo com sucesso no seu Google Drive! Todas as conversas e vocabulários foram salvos.',
      });
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Falha ao salvar backup no Google Drive.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestoreConfirm = async () => {
    const token = getCachedAccessToken();
    if (!token || !remoteFile) {
      setMessage({ type: 'error', text: 'Nenhum arquivo de backup encontrado para restaurar.' });
      return;
    }

    setIsRestoring(true);
    setMessage(null);
    setShowConfirmRestore(false);

    try {
      const result = await restoreProgressFromDrive(token, remoteFile.id);
      if (result.success) {
        setMessage({
          type: 'success',
          text: `Progresso restaurado do Drive com sucesso! (${result.details})`,
        });
        if (onDataRestored) {
          onDataRestored();
        }
      } else {
        setMessage({
          type: 'error',
          text: result.details || 'Falha ao processar arquivo restaurado.',
        });
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Falha ao restaurar dados do Google Drive.',
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleToggleAutoSync = () => {
    const newValue = !autoSync;
    setAutoSync(newValue);
    saveDriveSyncPrefs({ autoSync: newValue });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-slate-100 p-5 sm:p-7 text-slate-800">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-indigo-200 shrink-0">
            <Cloud className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Sincronização Google Drive
              </h2>
              {hasToken && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Conectado
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Salve remotamente todo o seu histórico de conversas, vocabulário e relatórios.
            </p>
          </div>
        </div>

        {/* Status Notification Message */}
        {message && (
          <div
            className={`mb-4 p-3 rounded-2xl text-xs flex items-start gap-2.5 animate-in fade-in ${
              message.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : message.type === 'error'
                ? 'bg-rose-50 border border-rose-200 text-rose-800'
                : 'bg-indigo-50 border border-indigo-200 text-indigo-800'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : message.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            )}
            <span className="flex-1 font-medium leading-relaxed">{message.text}</span>
          </div>
        )}

        {/* If User Not Signed In */}
        {!hasToken ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Privacidade & Segurança</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Utilizamos o escopo restrito do Google Drive (<code>drive.file</code>).
                    O aplicativo só tem acesso ao próprio arquivo de backup que criar (
                    <strong>SpeakFluent_AI_Backup.json</strong>), mantendo todos os seus outros documentos
                    e pastas no Google Drive 100% seguros e inacessíveis.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/60 flex flex-wrap gap-2 text-[11px] text-slate-600">
                <span className="flex items-center gap-1">
                  ✓ Histórico de todas as conversas
                </span>
                <span className="flex items-center gap-1">
                  ✓ Banco de vocabulário e expressões
                </span>
                <span className="flex items-center gap-1">
                  ✓ Dias de prática (streak) e notas
                </span>
              </div>
            </div>

            {/* Google Sign-in Button */}
            <div className="pt-2">
              <button
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 font-semibold text-sm shadow-sm transition-all disabled:opacity-50"
              >
                {isSigningIn ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                    <span>Conectando com o Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Conectar com Google Drive</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* User Is Connected */
          <div className="space-y-4">
            {/* Account Card */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Usuário'}
                    className="w-10 h-10 rounded-full border border-slate-200"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm">
                    {(user?.displayName || user?.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">
                      {user?.displayName || 'Usuário Conectado'}
                    </span>
                    <span className="text-[10px] bg-sky-100 text-sky-800 px-1.5 py-0.2 rounded font-semibold">
                      Drive
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">{user?.email}</span>
                </div>
              </div>

              <button
                onClick={handleDisconnect}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                title="Desconectar conta Google"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Remote File Status Card */}
            <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  <FileJson className="w-4 h-4 text-indigo-600" />
                  Arquivo Remoto no Drive
                </span>

                <button
                  onClick={checkRemoteBackup}
                  disabled={isLoadingFile}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingFile ? 'animate-spin' : ''}`} />
                  <span>Verificar</span>
                </button>
              </div>

              {isLoadingFile ? (
                <div className="py-2 text-xs text-slate-500 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  <span>Consultando Google Drive...</span>
                </div>
              ) : remoteFile ? (
                <div className="text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Arquivo:</span>
                    <strong className="text-slate-800 font-mono">{remoteFile.name}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Última modificação no Drive:</span>
                    <span className="text-slate-700">
                      {new Date(remoteFile.modifiedTime).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-600">
                  Nenhum arquivo de backup encontrado ainda no Drive. Clique em "Sincronizar Agora"
                  abaixo para salvar seus dados pela primeira vez!
                </p>
              )}
            </div>

            {/* Local Stats Snapshot */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Mensagens salvas localmente</span>
                <span className="text-base font-bold text-slate-900">
                  {localStats.messagesCount} mensagens
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Vocabulário no cofre</span>
                <span className="text-base font-bold text-slate-900">
                  {localStats.vocabCount} palavras salvas
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-1">
              {/* Sync Now / Upload */}
              <button
                onClick={handleSyncNow}
                disabled={isSyncing || isRestoring}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm shadow-md shadow-indigo-200 transition-all"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Enviando dados para o Drive...</span>
                  </>
                ) : (
                  <>
                    <CloudUpload className="w-4 h-4" />
                    <span>Sincronizar Agora (Salvar no Google Drive)</span>
                  </>
                )}
              </button>

              {/* Restore From Drive */}
              {remoteFile && (
                <button
                  onClick={() => setShowConfirmRestore(true)}
                  disabled={isSyncing || isRestoring}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
                >
                  {isRestoring ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                      <span>Restaurando dados do Drive...</span>
                    </>
                  ) : (
                    <>
                      <CloudDownload className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Restaurar do Drive (Carregar Progresso)</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Auto-Sync Toggle Preference */}
            <div className="pt-2 border-t border-slate-200">
              <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer">
                <div>
                  <span className="text-xs font-semibold text-slate-800 block">
                    Sincronização Automática
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Salva automaticamente no Drive após novas conversas e vocabulários
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={handleToggleAutoSync}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
              </label>
            </div>

            {/* Offline Local JSON download fallback */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Precisa de uma cópia física offline?</span>
              <button
                onClick={downloadBackupLocally}
                className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                <span>Baixar JSON Local</span>
              </button>
            </div>
          </div>
        )}

        {/* Restore Confirmation Dialog */}
        {showConfirmRestore && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-3xl p-6 flex flex-col justify-center items-center text-center z-10 animate-in fade-in">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Restaurar dados do Google Drive?
            </h3>
            <p className="text-xs text-slate-600 max-w-sm mb-5 leading-relaxed">
              Esta ação substituirá os históricos e estatísticas locais pelo backup salvo no seu Google Drive (
              <strong>{remoteFile?.name}</strong>). Deseja prosseguir?
            </p>
            <div className="flex items-center gap-3 w-full max-w-xs">
              <button
                onClick={() => setShowConfirmRestore(false)}
                className="flex-1 py-2.5 px-3 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleRestoreConfirm}
                className="flex-1 py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-sm"
              >
                Sim, Restaurar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
