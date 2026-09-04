/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User,
  signOut
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { Pesanan, ShopSettings } from './types';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request Workspace scope for access to full drive or drive.file
// The user has requested full 'https://www.googleapis.com/auth/drive' scope
provider.addScope('https://www.googleapis.com/auth/drive');

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let cachedUserProfile: any = null;

if (typeof window !== 'undefined') {
  const tokenTimestampStr = localStorage.getItem('gdrive_token_timestamp');
  const storedToken = localStorage.getItem('gdrive_access_token');
  if (storedToken && tokenTimestampStr) {
    const tokenTimestamp = parseInt(tokenTimestampStr, 10);
    // Google OAuth access tokens expire after 3600 seconds. If older than 55 minutes, treat as expired.
    if (Date.now() - tokenTimestamp > 55 * 60 * 1000) {
      localStorage.removeItem('gdrive_access_token');
      localStorage.removeItem('gdrive_token_timestamp');
      cachedAccessToken = null;
    } else {
      cachedAccessToken = storedToken;
    }
  } else {
    cachedAccessToken = storedToken;
  }

  const storedProfile = localStorage.getItem('gdrive_user_profile');
  if (storedProfile) {
    try {
      cachedUserProfile = JSON.parse(storedProfile);
    } catch (e) {
      cachedUserProfile = null;
    }
  }
}

// Track listener callbacks
const authCallbacks = new Set<(user: User | null, token: string | null) => void>();

export const clearExpiredToken = () => {
  cachedAccessToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('gdrive_access_token');
    localStorage.removeItem('gdrive_token_timestamp');
  }
  authCallbacks.forEach(cb => cb(auth.currentUser || cachedUserProfile, null));
};

// Handle Firebase Auth changes and fetch the token
onAuthStateChanged(auth, async (user: User | null) => {
  if (user) {
    if (isSigningIn) {
      // Do not trigger callbacks with a null/empty token while we are in the middle of googleSignIn()
      return;
    }
    if (!cachedAccessToken && typeof window !== 'undefined') {
      cachedAccessToken = localStorage.getItem('gdrive_access_token');
    }
    const profile = {
      uid: user.uid,
      photoURL: user.photoURL,
      displayName: user.displayName,
      email: user.email,
    };
    cachedUserProfile = profile;
    if (typeof window !== 'undefined') {
      localStorage.setItem('gdrive_user_profile', JSON.stringify(profile));
    }
    // If user is logged in, use the token
    authCallbacks.forEach(cb => cb(user, cachedAccessToken));
  } else {
    // Force clear internal properties
    cachedAccessToken = null;
    cachedUserProfile = null;
    // Notify all listeners of the logged out state
    authCallbacks.forEach(cb => cb(null, null));
  }
});

export const initAuth = (
  callback: (user: User | null, token: string | null) => void
) => {
  authCallbacks.add(callback);
  
  // Call immediately with current state or null (since we forced clear on init)
  callback(auth.currentUser || cachedUserProfile, cachedAccessToken);
  return () => {
    authCallbacks.delete(callback);
  };
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan access token dari Google Sign-In.');
    }

    cachedAccessToken = credential.accessToken;
    const profile = {
      uid: result.user.uid,
      photoURL: result.user.photoURL,
      displayName: result.user.displayName,
      email: result.user.email,
    };
    cachedUserProfile = profile;

    if (typeof window !== 'undefined') {
      localStorage.setItem('gdrive_access_token', cachedAccessToken);
      localStorage.setItem('gdrive_token_timestamp', Date.now().toString());
      localStorage.setItem('gdrive_user_profile', JSON.stringify(profile));
    }
    // Trigger callbacks with the newly logged in user & token
    authCallbacks.forEach(cb => cb(result.user, cachedAccessToken));
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.warn('Google Sign-in Error (Handled internally):', error);
    return null;
  } finally {
    isSigningIn = false;
  }
};

export const googleSignOut = async () => {
  try {
    await signOut(auth);
  } catch (e) {
    console.warn('Firebase signOut notice:', e);
  }
  cachedAccessToken = null;
  cachedUserProfile = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('gdrive_access_token');
    localStorage.removeItem('gdrive_token_timestamp');
    localStorage.removeItem('gdrive_user_profile');
  }
  authCallbacks.forEach(cb => cb(null, null));
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

// --- Google Drive Integration APIs ---

const DRAFT_FILE_NAME = 'laporan_jersey_draft.json';

export interface DriveFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
}

/**
 * List all backup/draft JSON files found in user's Google Drive.
 */
export const listDraftsInDrive = async (token: string): Promise<DriveFileMetadata[]> => {
  if (!token) {
    throw new Error('UNAUTHORIZED');
  }
  try {
    const q = encodeURIComponent(`(name = '${DRAFT_FILE_NAME}' or name contains 'DRAFT_LAPORAN_JERSEY' or name contains 'laporan_jersey' or (name contains 'jersey' and name contains '.json') or mimeType = 'application/json') and trashed = false`);
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&orderBy=modifiedTime desc&fields=files(id,name,mimeType,modifiedTime,size)&pageSize=25`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearExpiredToken();
        throw new Error('UNAUTHORIZED');
      }
      throw new Error(`Google Drive API error (${response.status})`);
    }

    const data = await response.json();
    return (data.files || []) as DriveFileMetadata[];
  } catch (err) {
    console.warn('Silent notice: Draft file list not loaded or offline.', err);
    throw err;
  }
};

/**
 * Search for the latest draft file in Google Drive.
 * Returns metadata of the draft if found, otherwise null.
 */
export const searchDraftInDrive = async (token: string): Promise<DriveFileMetadata | null> => {
  try {
    const files = await listDraftsInDrive(token);
    if (!files || files.length === 0) return null;

    // Look for exact DRAFT_FILE_NAME first, or compare with newest file
    const exactMatch = files.find(f => f.name === DRAFT_FILE_NAME);
    if (exactMatch) {
      const newestFile = files[0];
      if (new Date(newestFile.modifiedTime).getTime() > new Date(exactMatch.modifiedTime).getTime()) {
        return newestFile;
      }
      return exactMatch;
    }
    return files[0];
  } catch (err) {
    console.warn('Silent notice: Draft file check not loaded or offline.', err);
    throw err;
  }
};

export interface DraftPayload {
  appId: 'laporan-jersey-app';
  exportedAt: string;
  shopName: string;
  pesananList: Pesanan[];
  settings: ShopSettings;
}

/**
 * Downloads the draft data from Google Drive given a fileId.
 */
export const downloadDraftFromDrive = async (token: string, fileId: string): Promise<DraftPayload> => {
  try {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearExpiredToken();
        throw new Error('UNAUTHORIZED');
      }
      throw new Error(`Gagal mendownload file dari Drive (${response.status})`);
    }

    const payload = await response.json();
    let pesananList: Pesanan[] = [];
    let settings: ShopSettings | undefined = undefined;
    let shopName = '';

    if (Array.isArray(payload)) {
      pesananList = payload;
    } else if (payload && typeof payload === 'object') {
      pesananList = payload.pesananList || payload.pesanan || payload.orders || payload.data || [];
      settings = payload.settings;
      shopName = payload.shopName || payload.namaToko || (payload.settings?.namaToko) || '';
    }

    return {
      appId: 'laporan-jersey-app',
      exportedAt: payload?.exportedAt || new Date().toISOString(),
      shopName: shopName || 'Jersey Store',
      pesananList,
      settings: (settings || {}) as ShopSettings
    };
  } catch (err) {
    console.warn('Silent notice: Downloading of cloud draft offline or rejected.', err);
    throw err;
  }
};

/**
 * Uploads (creates or updates) the draft on Google Drive.
 * We use a neat 2-step process: POST file metadata, then media PATCH.
 */
export const uploadDraftToDrive = async (
  token: string, 
  pesananList: Pesanan[], 
  settings: ShopSettings
): Promise<{ success: boolean; fileId: string; modifiedTime: string }> => {
  try {
    // 1. Check if the draft file already exists
    const existingFile = await searchDraftInDrive(token);
    
    const payload: DraftPayload = {
      appId: 'laporan-jersey-app',
      exportedAt: new Date().toISOString(),
      shopName: settings.namaToko,
      pesananList,
      settings
    };

    let fileId = '';

    if (existingFile) {
      // File exists - overwrite it using PATCH
      fileId = existingFile.id;
    } else {
      // Create new file metadata
      const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: DRAFT_FILE_NAME,
          mimeType: 'application/json'
        })
      });

      if (!createRes.ok) {
        if (createRes.status === 401) {
          clearExpiredToken();
          throw new Error('UNAUTHORIZED');
        }
        throw new Error(`Gagal membuat berkas draft di Google Drive (${createRes.status})`);
      }

      const fileData = await createRes.json();
      fileId = fileData.id;
    }

    // 2. Upload the file content (payload) using media PATCH
    const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
    const uploadRes = await fetch(uploadUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!uploadRes.ok) {
      if (uploadRes.status === 401) {
        clearExpiredToken();
        throw new Error('UNAUTHORIZED');
      }
      throw new Error(`Gagal mengupload konten draft ke Google Drive (${uploadRes.status})`);
    }

    // 3. Retrieve the updated modifiedTime
    const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=modifiedTime`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    let modifiedTime = new Date().toISOString();
    if (metaRes.ok) {
      const metaData = await metaRes.json();
      modifiedTime = metaData.modifiedTime;
    }

    return { 
      success: true, 
      fileId, 
      modifiedTime 
    };
  } catch (err) {
    console.warn('Silent notice: Background upload/draft update skipped or offline.', err);
    throw err;
  }
};
