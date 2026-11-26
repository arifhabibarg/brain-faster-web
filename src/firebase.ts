import { initializeApp } from 'firebase/app';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import {
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  signInWithCredential,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  setPersistence,
  browserLocalPersistence,
  signOut,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import {
  AdminPlayerRow,
  CompletedLevelsMap,
  GlobalLeaderboardRow,
  LevelCompletionRecord,
  LevelSpeedRecordRow,
  computeHighestUnlockedLevel,
  getRankTier,
  isAdminEmail,
  resolveAuthCompletedMerge,
  sortAdminPlayers,
  sortGlobalLeaderboard,
  sortLevelRecords,
} from './game/playerProgression';

const STORAGE_KEY_COMPLETED = 'amazego_completed_levels';
const STORAGE_KEY_LAST_UID = 'amazego_last_uid';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = Capacitor.isNativePlatform()
  ? initializeAuth(app, { persistence: indexedDBLocalPersistence })
  : getAuth(app);

if (!Capacitor.isNativePlatform()) {
  void setPersistence(auth, browserLocalPersistence).catch(() => {
    // Ignore if browser storage restricts persistence
  });
}

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Required startup connection check per Firebase Integration guidelines
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration (client offline).');
    }
  }
}
void testConnection();

export interface PlayerCloudProfile {
  uid: string;
  email: string;
  displayName: string;
  photoUrl: string;
  highestUnlockedLevel: number;
  completedCount: number;
  totalStars: number;
  totalTimeSeconds: number;
  unlimitedModeAllowed: boolean;
}

export function sanitizeDisplayName(raw: string | null | undefined, email?: string | null): string {
  const cleaned = (raw || '').trim().slice(0, 50);
  if (cleaned.length >= 1) return cleaned;
  if (email) {
    const prefix = email.split('@')[0]?.trim().slice(0, 50);
    if (prefix) return prefix;
  }
  return 'Player';
}

export function sanitizePhotoUrl(raw: string | null | undefined): string {
  const trimmed = (raw || '').trim();
  if (trimmed.length > 80000) return '';
  return trimmed;
}

function summarizeCompleted(map: CompletedLevelsMap, isAdmin: boolean) {
  const keys = Object.keys(map);
  let completedCount = 0;
  let totalStars = 0;
  let totalTimeSeconds = 0;
  for (let i = 0; i < keys.length; i++) {
    const rec = map[Number(keys[i])];
    if (!rec) continue;
    completedCount++;
    totalStars += Math.min(3, Math.max(1, Math.floor(rec.stars || 1)));
    totalTimeSeconds += Math.max(0, Math.floor(rec.bestTimeSeconds || 0));
  }
  const highestUnlockedLevel = computeHighestUnlockedLevel(map, isAdmin);
  return {
    completedCount: Math.min(500, completedCount),
    totalStars: Math.min(1500, totalStars),
    totalTimeSeconds: Math.min(9000000, totalTimeSeconds),
    highestUnlockedLevel,
  };
}

export function isInsideIframe(): boolean {
  try {
    return typeof window !== 'undefined' && window.self !== window.top;
  } catch {
    return true;
  }
}

export function formatFirebaseAuthError(err: unknown): {
  code: string;
  userMessage: string | null;
} {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: unknown }).code || '')
      : '';
  const msg = err instanceof Error ? err.message : String(err);
  const host =
    typeof window !== 'undefined' ? window.location.hostname : 'this domain';

  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return { code, userMessage: null };
  }

  console.error('Google Auth Error:', code || 'unknown', msg);

  if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
    return {
      code: 'auth/unauthorized-domain',
      userMessage: `এই ডোমেইন (${host}) এখনো Firebase Authorized Domains-এ যুক্ত করা হয়নি। Firebase Console → Authentication → Settings → Authorized domains-এ গিয়ে "${host}" যোগ করুন।`,
    };
  }

  if (code === 'auth/popup-blocked' || msg.includes('popup-blocked')) {
    return {
      code: 'auth/popup-blocked',
      userMessage:
        'ব্রাউজার লগইন পপআপ ব্লক করেছে। পপআপ Allow করুন অথবা নিচের Redirect লগইন / Chrome ব্রাউজার দিয়ে চেষ্টা করুন।',
    };
  }

  if (code === 'auth/operation-not-allowed') {
    return {
      code,
      userMessage:
        'Firebase Console-এ Google Sign-In চালু (Enable) করা নেই। Authentication → Sign-in method থেকে Google চালু করুন।',
    };
  }

  if (code === 'auth/network-request-failed') {
    return {
      code,
      userMessage: 'ইন্টারনেট সংযোগ পাওয়া যায়নি। নেটওয়ার্ক চেক করে আবার চেষ্টা করুন।',
    };
  }

  return {
    code: code || 'auth/unknown',
    userMessage: `Google লগইন সম্পন্ন করা যায়নি (${code || 'error'})। আবার চেষ্টা করুন।`,
  };
}

export async function consumeGoogleRedirectResult(): Promise<User | null> {
  const result = await getRedirectResult(auth);
  return result?.user || null;
}

export async function signInWithGoogleAccount(): Promise<{
  user: User | null;
  method: 'popup' | 'redirect';
}> {
  if (Capacitor.isNativePlatform()) {
    const result = await FirebaseAuthentication.signInWithGoogle();
    const idToken = result.credential?.idToken;
    if (!idToken) {
      throw new Error('Google sign-in did not return an ID token.');
    }
    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);
    return { user: userCredential.user, method: 'popup' };
  }

  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true);

  if (isStandalone) {
    await signInWithRedirect(auth, googleProvider);
    return { user: null, method: 'redirect' };
  }

  try {
    const cred = await signInWithPopup(auth, googleProvider);
    return { user: cred.user, method: 'popup' };
  } catch (err) {
    const code =
      typeof err === 'object' && err !== null && 'code' in err
        ? String((err as { code?: unknown }).code || '')
        : '';
    // Outside iframe (e.g. Chrome mobile, Netlify, PWA), fall back to redirect when popups are blocked
    if (
      !isInsideIframe() &&
      (code === 'auth/popup-blocked' ||
        code === 'auth/operation-not-supported-in-this-environment')
    ) {
      await signInWithRedirect(auth, googleProvider);
      return { user: null, method: 'redirect' };
    }
    throw err;
  }
}

export async function signInWithGoogleRedirectFallback(): Promise<void> {
  await signInWithRedirect(auth, googleProvider);
}

export async function signOutPlayer(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await FirebaseAuthentication.signOut().catch(() => {
      // Continue signing out from Firebase JS Auth
    });
  }
  // Keep offline progress and the previous UID for account-switch detection.
  await signOut(auth);
}

/**
 * Loads user's cloud profile and level history, merging any offline completions made before login.
 */
export async function syncPlayerOnAuth(
  user: User,
  localCompleted: CompletedLevelsMap
): Promise<{
  profile: PlayerCloudProfile;
  mergedCompleted: CompletedLevelsMap;
}> {
  const uid = user.uid;
  const userDocPath = `users/${uid}`;
  const historyPath = `users/${uid}/levelHistory`;
  const leaderboardPath = `leaderboard/${uid}`;
  const isAdmin = isAdminEmail(user.email);

  let existingUserData: Record<string, unknown> | null = null;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      existingUserData = snap.data() as Record<string, unknown>;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userDocPath);
  }

  const cloudCompleted: CompletedLevelsMap = {};
  try {
    const histSnap = await getDocs(collection(db, 'users', uid, 'levelHistory'));
    histSnap.forEach((docSnap) => {
      const d = docSnap.data();
      const lvlId = Number(d.levelId);
      if (lvlId >= 1 && lvlId <= 500) {
        cloudCompleted[lvlId] = {
          stars: Number(d.stars) || 1,
          bestMoves: Number(d.bestMoves) || 1,
          bestTimeSeconds: Number(d.bestTimeSeconds) || 0,
          minBumps: Number(d.minBumps) || 0,
        };
      }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, historyPath);
  }

  let previousUid: string | null = null;
  try {
    if (typeof localStorage !== 'undefined') {
      previousUid = localStorage.getItem(STORAGE_KEY_LAST_UID);
    }
  } catch {
    previousUid = null;
  }

  // Brand-new accounts or account switches always start cleanly from cloud state (Level 1 for new users)
  const { mergedCompleted, newlyMergedIds } = resolveAuthCompletedMerge({
    isNewCloudAccount: !existingUserData,
    previousUid,
    currentUid: uid,
    cloudCompleted,
    localCompleted,
  });

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_LAST_UID, uid);
    }
  } catch {
    // Ignore storage access errors
  }

  const displayName = sanitizeDisplayName(
    (existingUserData?.displayName as string) || user.displayName,
    user.email
  );
  const photoUrl = sanitizePhotoUrl(
    existingUserData?.photoUrl !== undefined
      ? (existingUserData.photoUrl as string)
      : user.photoURL
  );
  const email = (user.email || '').trim().slice(0, 150);
  const summary = summarizeCompleted(mergedCompleted, isAdmin);
  const tier = getRankTier(summary.completedCount);

  const unlimitedModeAllowed = isAdmin || Boolean(existingUserData?.unlimitedModeAllowed);

  if (!existingUserData) {
    try {
      await setDoc(doc(db, 'users', uid), {
        uid,
        email,
        displayName,
        photoUrl,
        highestUnlockedLevel: summary.highestUnlockedLevel,
        completedCount: summary.completedCount,
        totalStars: summary.totalStars,
        totalTimeSeconds: summary.totalTimeSeconds,
        unlimitedModeAllowed: isAdmin,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, userDocPath);
    }
  } else {
    try {
      await updateDoc(doc(db, 'users', uid), {
        displayName,
        photoUrl,
        highestUnlockedLevel: summary.highestUnlockedLevel,
        completedCount: summary.completedCount,
        totalStars: summary.totalStars,
        totalTimeSeconds: summary.totalTimeSeconds,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, userDocPath);
    }
  }

  // Upsert newly merged offline levels to levelHistory and public level records
  for (const lvlId of newlyMergedIds) {
    const rec = mergedCompleted[lvlId];
    if (!rec) continue;
    const histDocPath = `users/${uid}/levelHistory/${lvlId}`;
    const publicRecPath = `levels/${lvlId}/records/${uid}`;
    const safeTime = Math.min(86400, Math.max(0, Math.floor(rec.bestTimeSeconds || 0)));
    const safeStars = Math.min(3, Math.max(1, Math.floor(rec.stars || 1)));
    const safeMoves = Math.min(10000, Math.max(1, Math.floor(rec.bestMoves || 1)));
    const safeBumps = Math.min(1000, Math.max(0, Math.floor(rec.minBumps || 0)));

    try {
      await setDoc(doc(db, 'users', uid, 'levelHistory', String(lvlId)), {
        uid,
        levelId: lvlId,
        bestTimeSeconds: safeTime,
        stars: safeStars,
        bestMoves: safeMoves,
        minBumps: safeBumps,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, histDocPath);
    }

    try {
      await setDoc(doc(db, 'levels', String(lvlId), 'records', uid), {
        uid,
        levelId: lvlId,
        displayName,
        photoUrl,
        bestTimeSeconds: safeTime,
        stars: safeStars,
        bestMoves: safeMoves,
        minBumps: safeBumps,
        isPublic: true,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, publicRecPath);
    }
  }

  // Sync public leaderboard summary (Zero PII)
  try {
    const lbRef = doc(db, 'leaderboard', uid);
    const lbSnap = await getDoc(lbRef);
    const lbPayload = {
      uid,
      displayName,
      photoUrl,
      completedCount: summary.completedCount,
      highestUnlockedLevel: summary.highestUnlockedLevel,
      totalStars: summary.totalStars,
      totalTimeSeconds: summary.totalTimeSeconds,
      tierIndex: tier.index,
      isPublic: true,
      updatedAt: serverTimestamp(),
    };
    if (!lbSnap.exists()) {
      await setDoc(lbRef, lbPayload);
    } else {
      await updateDoc(lbRef, {
        displayName,
        photoUrl,
        completedCount: summary.completedCount,
        highestUnlockedLevel: summary.highestUnlockedLevel,
        totalStars: summary.totalStars,
        totalTimeSeconds: summary.totalTimeSeconds,
        tierIndex: tier.index,
        isPublic: true,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, leaderboardPath);
  }

  return {
    profile: {
      uid,
      email,
      displayName,
      photoUrl,
      ...summary,
      unlimitedModeAllowed,
    },
    mergedCompleted,
  };
}

/**
 * Updates editable player name & avatar photo across private profile and public leaderboard.
 */
export async function updatePlayerProfileCloud(
  user: User,
  nextName: string,
  nextPhotoUrl: string,
  currentCompleted: CompletedLevelsMap
): Promise<{ displayName: string; photoUrl: string }> {
  const uid = user.uid;
  const displayName = sanitizeDisplayName(nextName, user.email);
  const photoUrl = sanitizePhotoUrl(nextPhotoUrl);
  const isAdmin = isAdminEmail(user.email);
  const summary = summarizeCompleted(currentCompleted, isAdmin);
  const tier = getRankTier(summary.completedCount);

  const email = (user.email || '').trim().slice(0, 150);

  const userRef = doc(db, 'users', uid);
  try {
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid,
        email,
        displayName,
        photoUrl,
        highestUnlockedLevel: summary.highestUnlockedLevel,
        completedCount: summary.completedCount,
        totalStars: summary.totalStars,
        totalTimeSeconds: summary.totalTimeSeconds,
        unlimitedModeAllowed: isAdmin,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(userRef, {
        displayName,
        photoUrl,
        highestUnlockedLevel: summary.highestUnlockedLevel,
        completedCount: summary.completedCount,
        totalStars: summary.totalStars,
        totalTimeSeconds: summary.totalTimeSeconds,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
  }

  const lbRef = doc(db, 'leaderboard', uid);
  try {
    const lbSnap = await getDoc(lbRef);
    const lbPayload = {
      uid,
      displayName,
      photoUrl,
      completedCount: summary.completedCount,
      highestUnlockedLevel: summary.highestUnlockedLevel,
      totalStars: summary.totalStars,
      totalTimeSeconds: summary.totalTimeSeconds,
      tierIndex: tier.index,
      isPublic: true,
      updatedAt: serverTimestamp(),
    };
    if (!lbSnap.exists()) {
      await setDoc(lbRef, lbPayload);
    } else {
      await updateDoc(lbRef, {
        displayName,
        photoUrl,
        completedCount: summary.completedCount,
        highestUnlockedLevel: summary.highestUnlockedLevel,
        totalStars: summary.totalStars,
        totalTimeSeconds: summary.totalTimeSeconds,
        tierIndex: tier.index,
        isPublic: true,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `leaderboard/${uid}`);
  }

  return { displayName, photoUrl };
}

/**
 * Persists a newly completed level record (clear time in seconds, stars, moves, bumps)
 * to personal history, leaderboard summary, and per-level ranking board.
 */
export async function saveLevelRecordCloud(
  user: User,
  displayName: string,
  photoUrl: string,
  levelId: number,
  newRecord: LevelCompletionRecord,
  allCompleted: CompletedLevelsMap
): Promise<void> {
  const uid = user.uid;
  const email = (user.email || '').trim().slice(0, 150);
  const safeName = sanitizeDisplayName(displayName, user.email);
  const safePhoto = sanitizePhotoUrl(photoUrl);
  const isAdmin = isAdminEmail(user.email);
  const summary = summarizeCompleted(allCompleted, isAdmin);
  const tier = getRankTier(summary.completedCount);

  const safeTime = Math.min(86400, Math.max(0, Math.floor(newRecord.bestTimeSeconds || 0)));
  const safeStars = Math.min(3, Math.max(1, Math.floor(newRecord.stars || 1)));
  const safeMoves = Math.min(10000, Math.max(1, Math.floor(newRecord.bestMoves || 1)));
  const safeBumps = Math.min(1000, Math.max(0, Math.floor(newRecord.minBumps || 0)));

  const histRef = doc(db, 'users', uid, 'levelHistory', String(levelId));
  try {
    const existingHist = await getDoc(histRef);
    if (!existingHist.exists()) {
      await setDoc(histRef, {
        uid,
        levelId,
        bestTimeSeconds: safeTime,
        stars: safeStars,
        bestMoves: safeMoves,
        minBumps: safeBumps,
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(histRef, {
        bestTimeSeconds: safeTime,
        stars: safeStars,
        bestMoves: safeMoves,
        minBumps: safeBumps,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}/levelHistory/${levelId}`);
  }

  const userRef = doc(db, 'users', uid);
  try {
    const existingUser = await getDoc(userRef);
    if (!existingUser.exists()) {
      await setDoc(userRef, {
        uid,
        email,
        displayName: safeName,
        photoUrl: safePhoto,
        highestUnlockedLevel: summary.highestUnlockedLevel,
        completedCount: summary.completedCount,
        totalStars: summary.totalStars,
        totalTimeSeconds: summary.totalTimeSeconds,
        unlimitedModeAllowed: isAdmin,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(userRef, {
        highestUnlockedLevel: summary.highestUnlockedLevel,
        completedCount: summary.completedCount,
        totalStars: summary.totalStars,
        totalTimeSeconds: summary.totalTimeSeconds,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
  }

  const lbRef = doc(db, 'leaderboard', uid);
  try {
    const existingLb = await getDoc(lbRef);
    const lbPayload = {
      uid,
      displayName: safeName,
      photoUrl: safePhoto,
      completedCount: summary.completedCount,
      highestUnlockedLevel: summary.highestUnlockedLevel,
      totalStars: summary.totalStars,
      totalTimeSeconds: summary.totalTimeSeconds,
      tierIndex: tier.index,
      isPublic: true,
      updatedAt: serverTimestamp(),
    };
    if (!existingLb.exists()) {
      await setDoc(lbRef, lbPayload);
    } else {
      await updateDoc(lbRef, {
        displayName: safeName,
        photoUrl: safePhoto,
        completedCount: summary.completedCount,
        highestUnlockedLevel: summary.highestUnlockedLevel,
        totalStars: summary.totalStars,
        totalTimeSeconds: summary.totalTimeSeconds,
        tierIndex: tier.index,
        isPublic: true,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `leaderboard/${uid}`);
  }

  const levelRecRef = doc(db, 'levels', String(levelId), 'records', uid);
  try {
    const existingRec = await getDoc(levelRecRef);
    if (!existingRec.exists()) {
      await setDoc(levelRecRef, {
        uid,
        levelId,
        displayName: safeName,
        photoUrl: safePhoto,
        bestTimeSeconds: safeTime,
        stars: safeStars,
        bestMoves: safeMoves,
        minBumps: safeBumps,
        isPublic: true,
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(levelRecRef, {
        displayName: safeName,
        photoUrl: safePhoto,
        bestTimeSeconds: safeTime,
        stars: safeStars,
        bestMoves: safeMoves,
        minBumps: safeBumps,
        isPublic: true,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `levels/${levelId}/records/${uid}`);
  }
}

export async function fetchGlobalLeaderboard(): Promise<(GlobalLeaderboardRow & { rank: number })[]> {
  const path = 'leaderboard';
  try {
    const q = query(
      collection(db, path),
      where('isPublic', '==', true),
      limit(100)
    );
    const snap = await getDocs(q);
    const rows: GlobalLeaderboardRow[] = [];
    snap.forEach((d) => {
      const data = d.data();
      rows.push({
        uid: String(data.uid || d.id),
        displayName: String(data.displayName || 'Player'),
        photoUrl: String(data.photoUrl || ''),
        completedCount: Number(data.completedCount) || 0,
        highestUnlockedLevel: Number(data.highestUnlockedLevel) || 1,
        totalStars: Number(data.totalStars) || 0,
        totalTimeSeconds: Number(data.totalTimeSeconds) || 0,
        tierIndex: Number(data.tierIndex) || 0,
      });
    });
    return sortGlobalLeaderboard(rows);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchLevelSpeedRecords(
  levelId: number
): Promise<(LevelSpeedRecordRow & { rank: number })[]> {
  const path = `levels/${levelId}/records`;
  try {
    const q = query(
      collection(db, 'levels', String(levelId), 'records'),
      where('isPublic', '==', true),
      limit(100)
    );
    const snap = await getDocs(q);
    const rows: LevelSpeedRecordRow[] = [];
    snap.forEach((d) => {
      const data = d.data();
      rows.push({
        uid: String(data.uid || d.id),
        levelId: Number(data.levelId) || levelId,
        displayName: String(data.displayName || 'Player'),
        photoUrl: String(data.photoUrl || ''),
        bestTimeSeconds: Number(data.bestTimeSeconds) || 0,
        stars: Number(data.stars) || 1,
        bestMoves: Number(data.bestMoves) || 1,
        minBumps: Number(data.minBumps) || 0,
      });
    });
    return sortLevelRecords(rows);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

function toTimestampMs(val: unknown): number {
  if (
    val &&
    typeof val === 'object' &&
    'toMillis' in val &&
    typeof (val as { toMillis?: unknown }).toMillis === 'function'
  ) {
    return (val as { toMillis: () => number }).toMillis();
  }
  return 0;
}

/**
 * Admin-only: Fetches all Google-logged-in player profiles so Admin can see
 * total sign-ins and grant/revoke Unlimited (Zen) Mode permission.
 */
export async function fetchAllLoggedInPlayers(): Promise<AdminPlayerRow[]> {
  if (!isAdminEmail(auth.currentUser?.email)) {
    throw new Error('Unauthorized: Admin login required.');
  }
  const path = 'users';
  try {
    const q = query(collection(db, path), limit(500));
    const snap = await getDocs(q);
    const rows: AdminPlayerRow[] = [];
    snap.forEach((d) => {
      const data = d.data();
      const email = String(data.email || '');
      const rowIsAdmin = isAdminEmail(email);
      rows.push({
        uid: String(data.uid || d.id),
        email,
        displayName: String(data.displayName || 'Player'),
        photoUrl: String(data.photoUrl || ''),
        completedCount: Number(data.completedCount) || 0,
        highestUnlockedLevel: Number(data.highestUnlockedLevel) || 1,
        totalStars: Number(data.totalStars) || 0,
        unlimitedModeAllowed: rowIsAdmin || Boolean(data.unlimitedModeAllowed),
        updatedAtMs: toTimestampMs(data.updatedAt),
        createdAtMs: toTimestampMs(data.createdAt),
      });
    });
    return sortAdminPlayers(rows);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Admin-only: Grants or revokes Unlimited (Zen) Mode permission for a player.
 */
export async function setPlayerUnlimitedPermission(
  targetUid: string,
  allowed: boolean
): Promise<void> {
  if (!isAdminEmail(auth.currentUser?.email)) {
    throw new Error('Unauthorized: Only Admin can modify Unlimited Mode permission.');
  }
  const cleanUid = targetUid.trim();
  if (!cleanUid) {
    throw new Error('Invalid player ID.');
  }
  const path = `users/${cleanUid}`;
  try {
    await updateDoc(doc(db, 'users', cleanUid), {
      unlimitedModeAllowed: Boolean(allowed),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

