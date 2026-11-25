import React, { useState, useEffect, useRef, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  TOTAL_LEVELS,
  getAmazeGoLevel,
} from './game/amazeGoLevels';
import { ArrowPath, AmazeGoLevel, getEscapableArrows } from './game/amazeGoLogic';
import { MusicTrackId, SoundPresetId, amazeGoAudio } from './game/amazeGoAudio';
import {
  CompletedLevelsMap,
  MAX_HINTS_PER_LEVEL,
  canUseUnlimitedMode,
  computeHighestUnlockedLevel,
  consumeHintAllowance,
  isAdminEmail,
  isLevelUnlocked,
} from './game/playerProgression';
import {
  auth,
  db,
  consumeGoogleRedirectResult,
  formatFirebaseAuthError,
  saveLevelRecordCloud,
  signInWithGoogleAccount,
  signInWithGoogleRedirectFallback,
  signOutPlayer,
  syncPlayerOnAuth,
  updatePlayerProfileCloud,
} from './firebase';
import { AmazeGoTitleScreen } from './components/AmazeGoTitleScreen';
import { BrainFasterSplashScreen } from './components/BrainFasterSplashScreen';
import { AmazeGoHUD } from './components/AmazeGoHUD';
import { AmazeGoBoard } from './components/AmazeGoBoard';
import { AmazeGoLevelSelect } from './components/AmazeGoLevelSelect';
import { AmazeGoVictory } from './components/AmazeGoVictory';
import { AmazeGoGameOver } from './components/AmazeGoGameOver';
import { PlayerAuthProfileModal } from './components/PlayerAuthProfileModal';
import { RecordsLeaderboardModal } from './components/RecordsLeaderboardModal';
import { SoundPickerModal } from './components/SoundPickerModal';
import { SettingsModal } from './components/SettingsModal';
import { AmazeGoShowcaseIntro } from './components/AmazeGoShowcaseIntro';
import { AdminUsersModal } from './components/AdminUsersModal';

const STORAGE_KEY_COMPLETED = 'amazego_completed_levels';

function loadLocalCompleted(): CompletedLevelsMap {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_COMPLETED);
    return saved ? (JSON.parse(saved) as CompletedLevelsMap) : {};
  } catch {
    return {};
  }
}

export default function App() {
  const [view, setView] = useState<'splash' | 'title' | 'playing'>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') return 'playing';
      if (params.get('skipSplash') === '1') return 'title';
    } catch {
      // Ignore
    }
    return 'splash';
  });

  // Firebase Auth & Player Profile state
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authErrorCode, setAuthErrorCode] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('Guest Player');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [unlimitedModeAllowed, setUnlimitedModeAllowed] = useState<boolean>(false);
  const [unlimitedNotice, setUnlimitedNotice] = useState<string | null>(null);
  const unlimitedNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Completed levels registry (Local + Firestore Synced)
  const [completedLevels, setCompletedLevels] = useState<CompletedLevelsMap>(loadLocalCompleted);
  const completedRef = useRef<CompletedLevelsMap>(completedLevels);
  completedRef.current = completedLevels;

  const isAdmin = isAdminEmail(authUser?.email);
  const canPlayUnlimited = canUseUnlimitedMode(isAdmin, unlimitedModeAllowed);
  const highestUnlockedLevel = computeHighestUnlockedLevel(completedLevels, isAdmin);
  const completedCount = Object.keys(completedLevels).length;

  const [currentLevel, setCurrentLevel] = useState<AmazeGoLevel>(() => {
    const initial = loadLocalCompleted();
    const startId = computeHighestUnlockedLevel(initial, false);
    return getAmazeGoLevel(startId);
  });
  const [activeArrows, setActiveArrows] = useState<ArrowPath[]>(() => [...currentLevel.arrows]);
  const [hintsRemaining, setHintsRemaining] = useState<number>(MAX_HINTS_PER_LEVEL);
  const [moves, setMoves] = useState<number>(0);
  const [blockedCount, setBlockedCount] = useState<number>(0);
  const [hearts, setHearts] = useState<number>(() => currentLevel.maxHearts);
  const [clearedByGoldenKey, setClearedByGoldenKey] = useState<boolean>(false);
  const [customArrowColor, setCustomArrowColor] = useState<string | null>(null);
  const [showGuideline, setShowGuideline] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('amazego_guideline_enabled');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });
  const [isZenMode, setIsZenMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('amazego_zen_mode') === 'true';
    } catch {
      return false;
    }
  });
  const effectiveZenMode = canPlayUnlimited && isZenMode;
  const [isMuted, setIsMuted] = useState<boolean>(() => amazeGoAudio.getMuted());
  const [vibrationEnabled, setVibrationEnabled] = useState<boolean>(() =>
    amazeGoAudio.isVibrationEnabled()
  );
  const [musicEnabled, setMusicEnabled] = useState<boolean>(() =>
    amazeGoAudio.isMusicEnabled()
  );
  const [musicTrack, setMusicTrack] = useState<MusicTrackId>(() =>
    amazeGoAudio.getMusicTrack()
  );
  const [soundPreset, setSoundPreset] = useState<SoundPresetId>(() => amazeGoAudio.getPreset());
  const [hintArrowId, setHintArrowId] = useState<string | null>(null);

  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameOverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const urlInitDoneRef = useRef<boolean>(false);
  const viewRef = useRef(view);
  viewRef.current = view;
  const currentLevelIdRef = useRef(currentLevel.id);
  currentLevelIdRef.current = currentLevel.id;
  const [boardResetNonce, setBoardResetNonce] = useState<number>(0);

  // Timer
  const [timeSeconds, setTimeSeconds] = useState<number>(0);
  const timeSecondsRef = useRef<number>(0);
  timeSecondsRef.current = timeSeconds;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetRoundCounters = useCallback(() => {
    if (hintTimerRef.current) {
      clearTimeout(hintTimerRef.current);
      hintTimerRef.current = null;
    }
    if (gameOverTimerRef.current) {
      clearTimeout(gameOverTimerRef.current);
      gameOverTimerRef.current = null;
    }
    setBoardResetNonce((n) => n + 1);
    amazeGoAudio.resetCombo();
  }, []);

  useEffect(() => {
    return () => {
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
      if (gameOverTimerRef.current) clearTimeout(gameOverTimerRef.current);
      if (unlimitedNoticeTimerRef.current) clearTimeout(unlimitedNoticeTimerRef.current);
    };
  }, []);

  // Modals
  const [isLevelSelectOpen, setIsLevelSelectOpen] = useState<boolean>(false);
  const [isVictoryOpen, setIsVictoryOpen] = useState<boolean>(false);
  const [isGameOverOpen, setIsGameOverOpen] = useState<boolean>(false);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [isRecordsOpen, setIsRecordsOpen] = useState<boolean>(false);
  const [isSoundPickerOpen, setIsSoundPickerOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState<boolean>(false);
  const [showShowcaseIntro, setShowShowcaseIntro] = useState<boolean>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('skipIntro') === '1') return false;
      const initial = loadLocalCompleted();
      const startId = computeHighestUnlockedLevel(initial, false);
      return getAmazeGoLevel(startId).isAnimatedShowcase === true;
    } catch {
      return false;
    }
  });

  // Load any unlocked level 1..500
  const loadLevel = useCallback(
    (levelId: number, overrideUnlockedMax?: number, overrideAdmin?: boolean) => {
      const effectiveMax = overrideUnlockedMax ?? highestUnlockedLevel;
      const effectiveAdmin = overrideAdmin ?? isAdmin;
      const targetId = isLevelUnlocked(levelId, effectiveMax, effectiveAdmin)
        ? levelId
        : effectiveMax;
      const lvl = getAmazeGoLevel(targetId);
      setCurrentLevel(lvl);
      setActiveArrows([...lvl.arrows]);
      setHintsRemaining(MAX_HINTS_PER_LEVEL);
      setMoves(0);
      setBlockedCount(0);
      setHearts(lvl.maxHearts);
      setClearedByGoldenKey(false);
      setHintArrowId(null);
      setIsVictoryOpen(false);
      setIsGameOverOpen(false);
      setTimeSeconds(0);
      setShowShowcaseIntro(!!lvl.isAnimatedShowcase);
      resetRoundCounters();
    },
    [highestUnlockedLevel, isAdmin, resetRoundCounters]
  );

  // Ensure unpermitted players can never retain Unlimited (Zen) Mode state
  useEffect(() => {
    if (!canPlayUnlimited && isZenMode) {
      setIsZenMode(false);
      try {
        localStorage.setItem('amazego_zen_mode', 'false');
      } catch {
        // Ignore
      }
    }
  }, [canPlayUnlimited, isZenMode]);

  // Firebase Auth listener, redirect completion check & cloud sync + live Unlimited Mode permission listener
  useEffect(() => {
    void consumeGoogleRedirectResult().catch((err) => {
      const formatted = formatFirebaseAuthError(err);
      setAuthErrorCode(formatted.code);
      if (formatted.userMessage) {
        setAuthError(formatted.userMessage);
        setIsProfileOpen(true);
      }
    });

    let unsubUserDoc: (() => void) | null = null;

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (unsubUserDoc) {
        unsubUserDoc();
        unsubUserDoc = null;
      }
      setAuthUser(user);
      if (!user) {
        setDisplayName('Guest Player');
        setPhotoUrl('');
        setUnlimitedModeAllowed(false);
        setIsAdminPanelOpen(false);
        return;
      }

      setIsAuthLoading(true);
      setAuthError(null);
      setAuthErrorCode(null);
      try {
        const { profile, mergedCompleted } = await syncPlayerOnAuth(user, completedRef.current);
        setDisplayName(profile.displayName);
        setPhotoUrl(profile.photoUrl);
        setUnlimitedModeAllowed(profile.unlimitedModeAllowed);
        setCompletedLevels(mergedCompleted);
        try {
          localStorage.setItem(STORAGE_KEY_COMPLETED, JSON.stringify(mergedCompleted));
        } catch {
          // LocalStorage fallback
        }
        const hasUrlLevel = new URLSearchParams(window.location.search).has('level');
        if (!hasUrlLevel) {
          const isUserAdmin = isAdminEmail(user.email);
          const syncedLevelId = computeHighestUnlockedLevel(mergedCompleted, false);
          const curUnlocked = isLevelUnlocked(
            currentLevelIdRef.current,
            syncedLevelId,
            isUserAdmin
          );
          if (
            viewRef.current !== 'playing' ||
            !curUnlocked ||
            Object.keys(mergedCompleted).length === 0
          ) {
            const syncedLevel = getAmazeGoLevel(syncedLevelId);
            setCurrentLevel(syncedLevel);
            setActiveArrows([...syncedLevel.arrows]);
            setHearts(syncedLevel.maxHearts);
            setHintsRemaining(MAX_HINTS_PER_LEVEL);
            setMoves(0);
            setBlockedCount(0);
            setClearedByGoldenKey(false);
            setShowShowcaseIntro(!!syncedLevel.isAnimatedShowcase);
          }
        }

        // Listen live for Admin permission grants/revocations on this user doc
        unsubUserDoc = onSnapshot(
          doc(db, 'users', user.uid),
          (snap) => {
            if (snap.exists()) {
              const d = snap.data();
              setUnlimitedModeAllowed(
                isAdminEmail(user.email) || Boolean(d.unlimitedModeAllowed)
              );
            }
          },
          () => {
            // Ignore transient listener errors; syncPlayerOnAuth already read state
          }
        );
      } catch (err) {
        console.error('Failed syncing player profile:', err);
        setDisplayName(user.displayName || user.email?.split('@')[0] || 'Player');
        setPhotoUrl(user.photoURL || '');
        setUnlimitedModeAllowed(isAdminEmail(user.email));
      } finally {
        setIsAuthLoading(false);
      }
    });
    return () => {
      if (unsubUserDoc) unsubUserDoc();
      unsub();
    };
  }, []);

  const handleGoogleLogin = async () => {
    setIsAuthLoading(true);
    setAuthError(null);
    setAuthErrorCode(null);
    try {
      const res = await signInWithGoogleAccount();
      if (res.method === 'redirect') {
        return;
      }
      setIsAuthLoading(false);
    } catch (err) {
      const formatted = formatFirebaseAuthError(err);
      setAuthErrorCode(formatted.code);
      if (formatted.userMessage) {
        setAuthError(formatted.userMessage);
      }
      setIsAuthLoading(false);
    }
  };

  const handleGoogleRedirectLogin = async () => {
    setIsAuthLoading(true);
    setAuthError(null);
    setAuthErrorCode(null);
    try {
      await signInWithGoogleRedirectFallback();
    } catch (err) {
      const formatted = formatFirebaseAuthError(err);
      setAuthErrorCode(formatted.code);
      if (formatted.userMessage) {
        setAuthError(formatted.userMessage);
      }
      setIsAuthLoading(false);
    }
  };

  const handleSaveProfile = async (nextName: string, nextPhotoUrl: string) => {
    if (!authUser) return;
    const saved = await updatePlayerProfileCloud(
      authUser,
      nextName,
      nextPhotoUrl,
      completedRef.current
    );
    setDisplayName(saved.displayName);
    setPhotoUrl(saved.photoUrl);
  };

  const handleSignOut = async () => {
    await signOutPlayer();
    setCompletedLevels({});
    const levelOne = getAmazeGoLevel(1);
    setCurrentLevel(levelOne);
    setActiveArrows([...levelOne.arrows]);
    setHearts(levelOne.maxHearts);
    setHintsRemaining(MAX_HINTS_PER_LEVEL);
    setMoves(0);
    setBlockedCount(0);
    setClearedByGoldenKey(false);
    setHintArrowId(null);
    setShowShowcaseIntro(false);
    resetRoundCounters();
    setIsProfileOpen(false);
  };

  // URL params support (?level=1&autostart=1) — run once on mount so gameplay never resets on progress change
  useEffect(() => {
    if (urlInitDoneRef.current) return;
    urlInitDoneRef.current = true;
    try {
      const params = new URLSearchParams(window.location.search);
      const lvlParam = params.get('level');
      if (lvlParam) {
        const parsed = parseInt(lvlParam, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= TOTAL_LEVELS) {
          loadLevel(parsed);
        }
      }
      if (params.get('autostart') === '1') {
        setView('playing');
      }
      if (params.get('skipIntro') === '1') {
        setShowShowcaseIntro(false);
      }
    } catch {
      // Ignore URL errors
    }
  }, [loadLevel]);

  // Sync body dataset state
  useEffect(() => {
    if (view === 'splash') {
      document.body.dataset.state = 'splash';
    } else if (view === 'title') {
      document.body.dataset.state = 'title';
    } else if (isVictoryOpen) {
      document.body.dataset.state = 'victory';
    } else if (isGameOverOpen) {
      document.body.dataset.state = 'gameover';
    } else {
      document.body.dataset.state = 'playing';
    }
  }, [view, isVictoryOpen, isGameOverOpen]);

  // Timer loop during active gameplay
  useEffect(() => {
    if (
      view === 'playing' &&
      !showShowcaseIntro &&
      !isVictoryOpen &&
      !isGameOverOpen &&
      !isLevelSelectOpen &&
      !isProfileOpen &&
      !isRecordsOpen &&
      !isSoundPickerOpen &&
      !isSettingsOpen &&
      !isAdminPanelOpen
    ) {
      timerRef.current = setInterval(() => {
        setTimeSeconds((t) => t + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [
    view,
    showShowcaseIntro,
    isVictoryOpen,
    isGameOverOpen,
    isLevelSelectOpen,
    isProfileOpen,
    isRecordsOpen,
    isSoundPickerOpen,
    isSettingsOpen,
    isAdminPanelOpen,
  ]);

  // Victory detection + sequential unlock + Firestore time record sync
  useEffect(() => {
    if (
      view === 'playing' &&
      !isVictoryOpen &&
      !isGameOverOpen &&
      moves > 0 &&
      (activeArrows.length === 0 || clearedByGoldenKey) &&
      currentLevel.arrows.length > 0
    ) {
      const stars = blockedCount === 0 ? 3 : blockedCount <= 2 ? 2 : 1;
      const prevLevel = completedRef.current[currentLevel.id];
      const elapsedSec = timeSecondsRef.current;
      const nextBestTime =
        prevLevel?.bestTimeSeconds !== undefined
          ? Math.min(elapsedSec, prevLevel.bestTimeSeconds)
          : elapsedSec;
      const nextMinBumps =
        prevLevel?.minBumps !== undefined
          ? Math.min(blockedCount, prevLevel.minBumps)
          : blockedCount;
      const newRecord = {
        stars: Math.max(stars, prevLevel?.stars || 0),
        bestMoves: Math.min(moves, prevLevel?.bestMoves || moves),
        bestTimeSeconds: nextBestTime,
        minBumps: nextMinBumps,
      };
      const updatedMap: CompletedLevelsMap = {
        ...completedRef.current,
        [currentLevel.id]: newRecord,
      };

      setCompletedLevels(updatedMap);
      try {
        localStorage.setItem(STORAGE_KEY_COMPLETED, JSON.stringify(updatedMap));
      } catch {
        // LocalStorage fallback
      }

      if (authUser) {
        void saveLevelRecordCloud(
          authUser,
          displayName,
          photoUrl,
          currentLevel.id,
          newRecord,
          updatedMap
        ).catch((err) => console.error('Cloud record save failed:', err));
      }

      const victoryTimer = setTimeout(() => {
        setIsVictoryOpen(true);
      }, 720);

      return () => clearTimeout(victoryTimer);
    }
  }, [
    activeArrows.length,
    clearedByGoldenKey,
    view,
    isVictoryOpen,
    isGameOverOpen,
    moves,
    currentLevel.id,
    currentLevel.arrows.length,
    blockedCount,
    authUser,
    displayName,
    photoUrl,
  ]);

  const handleArrowEscape = useCallback((arrow: ArrowPath, burstArrows: ArrowPath[] = []) => {
    const batch = [arrow, ...burstArrows];
    const batchIds = new Set(batch.map((a) => a.id));
    const hitGoldenKey = batch.some((a) => a.specialType === 'golden_key');

    setActiveArrows((prev) => prev.filter((a) => !batchIds.has(a.id)));
    setMoves((m) => m + 1);
    setHintArrowId((cur) => (cur && batchIds.has(cur) ? null : cur));

    if (hitGoldenKey) {
      setClearedByGoldenKey(true);
    }
  }, []);

  const handleArrowBlocked = useCallback(
    (_arrow: ArrowPath, _blockerId?: string, impactDurationMs?: number) => {
      setBlockedCount((b) => b + 1);
      setMoves((m) => m + 1);

      if (!effectiveZenMode) {
        setHearts((h) => {
          const nextHearts = Math.max(0, h - 1);
          if (nextHearts <= 0) {
            if (gameOverTimerRef.current) clearTimeout(gameOverTimerRef.current);
            const waitMs = Math.max(640, (impactDurationMs ?? 560) + 160);
            gameOverTimerRef.current = setTimeout(() => {
              gameOverTimerRef.current = null;
              setIsGameOverOpen(true);
            }, waitMs);
            return 0;
          }
          return nextHearts;
        });
      }
    },
    [effectiveZenMode]
  );

  const handleHint = () => {
    if (hintsRemaining <= 0 || activeArrows.length === 0) return;
    const escapable = getEscapableArrows(
      currentLevel.width,
      currentLevel.height,
      activeArrows
    );
    const { allowed, nextRemaining } = consumeHintAllowance(
      hintsRemaining,
      escapable.length > 0
    );
    if (!allowed) return;

    const target = escapable.find((a) => a.id !== hintArrowId) || escapable[0];
    setHintsRemaining(nextRemaining);
    setHintArrowId(target.id);
    amazeGoAudio.playHint();

    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => {
      hintTimerRef.current = null;
      setHintArrowId((cur) => (cur === target.id ? null : cur));
    }, 3800);
  };

  const handleToggleMute = () => {
    const muted = amazeGoAudio.toggleMute();
    setIsMuted(muted);
    if (!muted) {
      amazeGoAudio.playClick();
    }
  };

  const handleToggleVibration = () => {
    const next = !vibrationEnabled;
    amazeGoAudio.setVibrationEnabled(next);
    setVibrationEnabled(next);
    if (next) amazeGoAudio.vibrate(14);
  };

  const handleToggleMusic = () => {
    const next = !musicEnabled;
    amazeGoAudio.setMusicEnabled(next);
    setMusicEnabled(next);
  };

  const handleToggleGuideline = () => {
    setShowGuideline((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('amazego_guideline_enabled', String(next));
      } catch {
        // Fallback
      }
      return next;
    });
  };

  const handleToggleZenMode = () => {
    if (!canPlayUnlimited) {
      setUnlimitedNotice(
        authUser
          ? 'আনলিমিটেড মোড সবার জন্য উন্মুক্ত নয়। শুধু অ্যাডমিনের অনুমতি পেলে খেলতে পারবেন!'
          : 'প্রথমে Google দিয়ে লগইন করুন; এরপর অ্যাডমিন অনুমতি দিলে আনলিমিটেড মোড খেলতে পারবেন।'
      );
      if (unlimitedNoticeTimerRef.current) {
        clearTimeout(unlimitedNoticeTimerRef.current);
      }
      unlimitedNoticeTimerRef.current = setTimeout(() => {
        setUnlimitedNotice(null);
      }, 4200);
      return;
    }
    setUnlimitedNotice(null);
    setIsZenMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('amazego_zen_mode', String(next));
      } catch {
        // Fallback
      }
      return next;
    });
  };

  const handleNextLevel = () => {
    const nextId = currentLevel.id < TOTAL_LEVELS ? currentLevel.id + 1 : 1;
    const updatedMax = computeHighestUnlockedLevel(completedLevels, isAdmin);
    loadLevel(nextId, updatedMax, isAdmin);
  };

  const handleRetry = () => {
    setActiveArrows([...currentLevel.arrows]);
    setHintsRemaining(MAX_HINTS_PER_LEVEL);
    setMoves(0);
    setBlockedCount(0);
    setHearts(currentLevel.maxHearts);
    setClearedByGoldenKey(false);
    setHintArrowId(null);
    setIsVictoryOpen(false);
    setIsGameOverOpen(false);
    setTimeSeconds(0);
    resetRoundCounters();
  };

  const modalsLayer = (
    <>
      {isLevelSelectOpen && (
        <AmazeGoLevelSelect
          currentLevelId={currentLevel.id}
          highestUnlockedLevel={highestUnlockedLevel}
          isAdmin={isAdmin}
          completedLevels={completedLevels}
          onSelectLevel={(id) => {
            loadLevel(id);
            setView('playing');
          }}
          onClose={() => setIsLevelSelectOpen(false)}
        />
      )}

      <PlayerAuthProfileModal
        isOpen={isProfileOpen}
        isSignedIn={!!authUser}
        isAdmin={isAdmin}
        canPlayUnlimited={canPlayUnlimited}
        isAuthLoading={isAuthLoading}
        email={authUser?.email || null}
        displayName={displayName}
        photoUrl={photoUrl}
        googlePhotoUrl={authUser?.photoURL || null}
        completedCount={completedCount}
        highestUnlockedLevel={highestUnlockedLevel}
        authError={authError}
        authErrorCode={authErrorCode}
        onGoogleLogin={handleGoogleLogin}
        onGoogleRedirectLogin={handleGoogleRedirectLogin}
        onSaveProfile={handleSaveProfile}
        onSignOut={handleSignOut}
        onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
        onClose={() => setIsProfileOpen(false)}
      />

      <AdminUsersModal
        isOpen={isAdminPanelOpen}
        isAdmin={isAdmin}
        currentUid={authUser?.uid || null}
        onClose={() => setIsAdminPanelOpen(false)}
      />

      <RecordsLeaderboardModal
        isOpen={isRecordsOpen}
        isSignedIn={!!authUser}
        currentUid={authUser?.uid || null}
        currentLevelId={currentLevel.id}
        completedLevels={completedLevels}
        onRequestLogin={() => setIsProfileOpen(true)}
        onClose={() => setIsRecordsOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        soundEnabled={!isMuted}
        vibrationEnabled={vibrationEnabled}
        musicEnabled={musicEnabled}
        guidelineEnabled={showGuideline}
        soundPreset={soundPreset}
        musicTrack={musicTrack}
        customArrowColor={customArrowColor}
        isSignedIn={!!authUser}
        isAdmin={isAdmin}
        displayName={displayName}
        onToggleSound={handleToggleMute}
        onToggleVibration={handleToggleVibration}
        onToggleMusic={handleToggleMusic}
        onToggleGuideline={handleToggleGuideline}
        onChangeMusicTrack={(track) => {
          amazeGoAudio.setMusicTrack(track, true);
          setMusicTrack(track);
          setMusicEnabled(true);
        }}
        onSelectArrowColor={(clr) => setCustomArrowColor(clr)}
        onOpenSoundPicker={() => setIsSoundPickerOpen(true)}
        onOpenLevelSelect={() => setIsLevelSelectOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
        onClose={() => setIsSettingsOpen(false)}
      />

      <SoundPickerModal
        isOpen={isSoundPickerOpen}
        selectedPreset={soundPreset}
        onSelectPreset={(preset) => {
          amazeGoAudio.setPreset(preset);
          setSoundPreset(preset);
          setIsMuted(false);
        }}
        onClose={() => setIsSoundPickerOpen(false)}
      />
    </>
  );

  if (view === 'splash') {
    return <BrainFasterSplashScreen onDone={() => setView('title')} />;
  }

  if (view === 'title') {
    return (
      <>
        <AmazeGoTitleScreen
          currentLevelId={currentLevel.id}
          highestUnlockedLevel={highestUnlockedLevel}
          completedCount={completedCount}
          isSignedIn={!!authUser}
          isAdmin={isAdmin}
          canPlayUnlimited={canPlayUnlimited}
          unlimitedNotice={unlimitedNotice}
          displayName={displayName}
          photoUrl={photoUrl}
          onStartLevel={(lvlId) => {
            loadLevel(lvlId);
            setView('playing');
          }}
          onOpenLevelSelect={() => setIsLevelSelectOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
          onOpenRecords={() => setIsRecordsOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
          isZenMode={effectiveZenMode}
          onToggleZenMode={handleToggleZenMode}
        />
        {modalsLayer}
      </>
    );
  }

  return (
    <div
      className={`h-dvh w-screen flex flex-col justify-between text-[#5c4b37] overflow-hidden transition-colors duration-300 ${
        currentLevel.isAnimatedShowcase ? 'bg-[#edf6ef]' : 'bg-[#f6eedb]'
      }`}
    >
      <AmazeGoHUD
        level={currentLevel}
        totalArrows={currentLevel.arrows.length}
        remainingArrows={activeArrows.length}
        hearts={hearts}
        maxHearts={currentLevel.maxHearts}
        hintsRemaining={hintsRemaining}
        isZenMode={effectiveZenMode}
        completedCount={completedCount}
        displayName={displayName}
        photoUrl={photoUrl}
        onBackToTitle={() => {
          amazeGoAudio.playClick();
          setView('title');
        }}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenRecords={() => setIsRecordsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onHint={handleHint}
      />

      <main className="relative flex-1 min-h-0 flex items-center justify-center w-full">
        <AmazeGoBoard
          level={currentLevel}
          activeArrows={activeArrows}
          customArrowColor={customArrowColor}
          hintArrowId={hintArrowId}
          showGuideline={showGuideline}
          boardResetNonce={boardResetNonce}
          isInteractionLocked={(!effectiveZenMode && hearts <= 0) || clearedByGoldenKey}
          onArrowEscape={handleArrowEscape}
          onArrowBlocked={handleArrowBlocked}
        />
      </main>

      {showShowcaseIntro && currentLevel.isAnimatedShowcase && (
        <AmazeGoShowcaseIntro
          level={currentLevel}
          onComplete={() => setShowShowcaseIntro(false)}
        />
      )}

      {modalsLayer}

      {isVictoryOpen && (
        <AmazeGoVictory
          level={currentLevel}
          moves={moves}
          blockedCount={blockedCount}
          timeSeconds={timeSeconds}
          completedCount={completedCount}
          clearedByGoldenKey={clearedByGoldenKey}
          onNextLevel={handleNextLevel}
          onReplay={handleRetry}
          onOpenLevelSelect={() => {
            setIsVictoryOpen(false);
            setIsLevelSelectOpen(true);
          }}
          onOpenRecords={() => {
            setIsVictoryOpen(false);
            setIsRecordsOpen(true);
          }}
        />
      )}

      {isGameOverOpen && (
        <AmazeGoGameOver
          level={currentLevel}
          canPlayUnlimited={canPlayUnlimited}
          onRetry={handleRetry}
          onSwitchToZen={() => {
            if (!canPlayUnlimited) return;
            setIsZenMode(true);
            try {
              localStorage.setItem('amazego_zen_mode', 'true');
            } catch {
              // Fallback
            }
            setHearts(currentLevel.maxHearts);
            setIsGameOverOpen(false);
          }}
          onOpenLevelSelect={() => {
            setIsGameOverOpen(false);
            setIsLevelSelectOpen(true);
          }}
        />
      )}
    </div>
  );
}
