import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  SpeakFluentBackupPayload,
  DriveBackupFileMetadata,
} from '../types';
import {
  exportLocalData,
  restoreAllData,
  loadDriveSyncPrefs,
  saveDriveSyncPrefs,
} from '../utils/storage';

// 1. Initialize Firebase App with env vars or bundled configuration
const activeFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || (firebaseConfig as any)?.apiKey || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || (firebaseConfig as any)?.authDomain || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || (firebaseConfig as any)?.projectId || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || (firebaseConfig as any)?.storageBucket || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || (firebaseConfig as any)?.messagingSenderId || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || (firebaseConfig as any)?.appId || '',
};

const app = getApps().length === 0 ? initializeApp(activeFirebaseConfig) : getApp();
export const auth = getAuth(app);

// In-Memory Token Management (Strictly never in localStorage or sessionStorage)
let inMemoryAccessToken: string | null = null;
let inMemoryUser: User | null = null;

const DRIVE_FILE_NAME = 'SpeakFluent_AI_Backup.json';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

type AuthSubscriber = (user: User | null, hasToken: boolean) => void;
const subscribers: Set<AuthSubscriber> = new Set();

export function subscribeToAuth(callback: AuthSubscriber): () => void {
  subscribers.add(callback);
  callback(inMemoryUser, !!inMemoryAccessToken);
  return () => {
    subscribers.delete(callback);
  };
}

function notifySubscribers() {
  subscribers.forEach((cb) => cb(inMemoryUser, !!inMemoryAccessToken));
}

// Listen to Firebase Auth state
onAuthStateChanged(auth, (user) => {
  inMemoryUser = user;
  if (!user) {
    inMemoryAccessToken = null;
  }
  notifySubscribers();
});

export function getCachedUser(): User | null {
  return inMemoryUser || auth.currentUser;
}

export function getCachedAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function isDriveConnected(): boolean {
  return !!inMemoryAccessToken && !!inMemoryUser;
}

// 2. Google Sign-In with Drive Scope
export async function signInWithGoogleDrive(): Promise<{ user: User; accessToken: string }> {
  const provider = new GoogleAuthProvider();
  provider.addScope(DRIVE_SCOPE);
  provider.setCustomParameters({
    prompt: 'consent',
  });

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;

    if (!token) {
      throw new Error('Não foi possível obter o token de acesso do Google Drive.');
    }

    inMemoryAccessToken = token;
    inMemoryUser = result.user;
    notifySubscribers();

    return { user: result.user, accessToken: token };
  } catch (error: any) {
    console.error('Falha ao autenticar com Google Drive:', error);
    throw error;
  }
}

// 3. Sign Out
export async function disconnectGoogleDrive(): Promise<void> {
  inMemoryAccessToken = null;
  inMemoryUser = null;
  notifySubscribers();
  await firebaseSignOut(auth);
}

// 4. Drive API: Search for existing backup file
export async function findRemoteBackupFile(
  accessToken: string
): Promise<DriveBackupFileMetadata | null> {
  const query = encodeURIComponent(`name = '${DRIVE_FILE_NAME}' and trashed = false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,size)&pageSize=1`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status === 401) {
    inMemoryAccessToken = null;
    notifySubscribers();
    throw new Error('Sessão expirada. Por favor, conecte-se novamente ao Google Drive.');
  }

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erro ao buscar arquivo no Google Drive: ${errText}`);
  }

  const data = await response.json();
  if (data.files && data.files.length > 0) {
    return data.files[0] as DriveBackupFileMetadata;
  }

  return null;
}

// 5. Drive API: Save / Upload backup payload
export async function uploadBackupToDrive(
  accessToken: string,
  userOverride?: { email?: string; displayName?: string }
): Promise<{ fileMetadata: DriveBackupFileMetadata; payload: SpeakFluentBackupPayload }> {
  const user = inMemoryUser || auth.currentUser;
  const email = userOverride?.email || user?.email || undefined;
  const displayName = userOverride?.displayName || user?.displayName || undefined;

  const payload: SpeakFluentBackupPayload = exportLocalData(email, displayName);
  const jsonContent = JSON.stringify(payload, null, 2);

  // Check if file already exists
  const existingFile = await findRemoteBackupFile(accessToken);

  let fileMetadata: DriveBackupFileMetadata;

  if (existingFile) {
    // Update existing file content
    const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`;
    const updateRes = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: jsonContent,
    });

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      throw new Error(`Falha ao atualizar backup no Drive: ${errText}`);
    }

    const updated = await updateRes.json();
    fileMetadata = {
      id: updated.id,
      name: updated.name || DRIVE_FILE_NAME,
      modifiedTime: new Date().toISOString(),
      size: `${Math.round(jsonContent.length / 1024)} KB`,
    };
  } else {
    // Create new file via multipart upload
    const boundary = '-------speakfluent_boundary_314159';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: DRIVE_FILE_NAME,
      mimeType: 'application/json',
      description: 'SpeakFluent AI - Backup de conversas, vocabulário e fluência',
    };

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      jsonContent +
      closeDelimiter;

    const createUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    const createRes = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Falha ao criar backup no Drive: ${errText}`);
    }

    const created = await createRes.json();
    fileMetadata = {
      id: created.id,
      name: created.name || DRIVE_FILE_NAME,
      modifiedTime: new Date().toISOString(),
      size: `${Math.round(jsonContent.length / 1024)} KB`,
    };
  }

  // Update last sync time
  saveDriveSyncPrefs({ lastSyncedAt: new Date().toISOString() });

  return { fileMetadata, payload };
}

// 6. Drive API: Download remote backup payload
export async function downloadBackupFromDrive(
  accessToken: string,
  fileId: string
): Promise<SpeakFluentBackupPayload> {
  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await fetch(downloadUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (res.status === 401) {
    inMemoryAccessToken = null;
    notifySubscribers();
    throw new Error('Sessão expirada. Por favor, conecte-se novamente ao Google Drive.');
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Falha ao baixar backup do Drive: ${errText}`);
  }

  const payload: SpeakFluentBackupPayload = await res.json();
  return payload;
}

// 7. Restore from Drive with Safety Check
export async function restoreProgressFromDrive(
  accessToken: string,
  fileId: string
): Promise<{
  success: boolean;
  messagesCount: number;
  vocabCount: number;
  details: string;
  payload: SpeakFluentBackupPayload;
}> {
  const payload = await downloadBackupFromDrive(accessToken, fileId);
  const result = restoreAllData(payload);

  return {
    ...result,
    payload,
  };
}

// 8. Offline Local JSON Export Download
export function downloadBackupLocally(): void {
  const user = inMemoryUser || auth.currentUser;
  const payload = exportLocalData(user?.email || undefined, user?.displayName || undefined);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `SpeakFluent_AI_Backup_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 9. Debounced Auto-Sync trigger
let autoSyncTimeout: any = null;
export function triggerDebouncedAutoSync(): void {
  const prefs = loadDriveSyncPrefs();
  if (!prefs.autoSync) return;
  if (!inMemoryAccessToken) return;

  if (autoSyncTimeout) {
    clearTimeout(autoSyncTimeout);
  }

  autoSyncTimeout = setTimeout(async () => {
    try {
      if (inMemoryAccessToken) {
        console.log('[DriveSync] Executando sincronização automática em segundo plano...');
        await uploadBackupToDrive(inMemoryAccessToken);
        console.log('[DriveSync] Sincronização automática concluída com sucesso!');
      }
    } catch (e) {
      console.warn('[DriveSync] Falha na sincronização automática:', e);
    }
  }, 4000);
}
