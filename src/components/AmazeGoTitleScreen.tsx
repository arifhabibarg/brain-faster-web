import React, { useEffect } from 'react';
import {
  Play,
  LayoutGrid,
  Shield,
  Infinity as InfinityIcon,
  Flame,
  Lock,
  Trophy,
  Award,
  LogIn,
  ShieldCheck,
  Settings,
  Users,
} from 'lucide-react';
import { amazeGoAudio } from '../game/amazeGoAudio';
import { TOTAL_LEVELS } from '../game/amazeGoLevels';
import { getMaxHeartsForLevel } from '../game/amazeGoLogic';
import { getRankTier, isLevelUnlocked } from '../game/playerProgression';
import { PWAInstallButton } from './PWAInstallButton';

interface AmazeGoTitleScreenProps {
  currentLevelId: number;
  highestUnlockedLevel: number;
  completedCount: number;
  isSignedIn: boolean;
  isAdmin: boolean;
  canPlayUnlimited: boolean;
  unlimitedNotice?: string | null;
  displayName: string;
  photoUrl: string;
  onStartLevel: (levelId: number) => void;
  onOpenLevelSelect: () => void;
  onOpenProfile: () => void;
  onOpenRecords: () => void;
  onOpenSettings: () => void;
  onOpenAdminPanel?: () => void;
  isZenMode: boolean;
  onToggleZenMode: () => void;
}

export const AmazeGoTitleScreen: React.FC<AmazeGoTitleScreenProps> = ({
  currentLevelId,
  highestUnlockedLevel,
  completedCount,
  isSignedIn,
  isAdmin,
  canPlayUnlimited,
  unlimitedNotice,
  displayName,
  photoUrl,
  onStartLevel,
  onOpenLevelSelect,
  onOpenProfile,
  onOpenRecords,
  onOpenSettings,
  onOpenAdminPanel,
  isZenMode,
  onToggleZenMode,
}) => {
  const isOneChance = currentLevelId > 200;
  const maxHearts = getMaxHeartsForLevel(currentLevelId);
  const tier = getRankTier(completedCount);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const target = e.target as HTMLElement | null;
        if (
          target &&
          ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(target.tagName)
        ) {
          return;
        }
        if (document.querySelector('[role="dialog"]')) {
          return;
        }
        e.preventDefault();
        amazeGoAudio.playClick();
        onStartLevel(currentLevelId);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentLevelId, onStartLevel]);

  const stripStart = Math.min(Math.max(1, currentLevelId), TOTAL_LEVELS - 4);
  const stripLevels = Array.from({ length: 5 }, (_, i) => stripStart + i);

  return (
    <div className="relative min-h-dvh flex flex-col items-center justify-between p-5 sm:p-6 bg-[#f6eedb] text-[#5c4b37] select-none overflow-hidden">
      {/* Top Bar: Player Account / Rank Badge + Utility Buttons */}
      <div className="w-full max-w-md flex items-center justify-between gap-2 z-10">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => {
                amazeGoAudio.playClick();
                onOpenProfile();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#fbf6ea] hover:bg-[#efe4ce] text-[#5c4b37] border border-[#e0d2b8] text-[11px] font-bold shadow-sm active:scale-95 transition-all max-w-[205px]"
              aria-label={isSignedIn ? 'Open Player Profile' : 'Sign in with Google'}
            >
              {isSignedIn ? (
                <>
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={displayName}
                      className="w-4 h-4 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-[#1d4ed8] text-white text-[9px] font-black flex items-center justify-center shrink-0">
                      {displayName.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className="truncate font-extrabold">{displayName}</span>
                  {isAdmin && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                </>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5 text-[#1d4ed8] shrink-0" />
                  <span>Google Login</span>
                </>
              )}
            </button>

            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-black shadow-sm"
              style={{
                backgroundColor: tier.badgeBg,
                color: tier.badgeText,
                borderColor: tier.badgeBorder,
              }}
              title="Player Rank Tier (7 Tiers)"
            >
              <Award className="w-3 h-3" />
              {tier.name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isAdmin && onOpenAdminPanel && (
            <button
              onClick={() => {
                amazeGoAudio.playClick();
                onOpenAdminPanel();
              }}
              className="p-2.5 rounded-2xl bg-emerald-600/15 shadow-sm border border-emerald-600/30 text-emerald-800 hover:bg-emerald-600/25 active:scale-95 transition-all"
              title="Admin: Logged-in Users & Unlimited Mode"
              aria-label="Admin Users Panel"
              data-testid="admin-panel-button"
            >
              <Users className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={() => {
              amazeGoAudio.playClick();
              onOpenRecords();
            }}
            className="p-2.5 rounded-2xl bg-[#fbf6ea] shadow-sm border border-[#e2d4ba] text-amber-700 hover:bg-[#efe4ce] active:scale-95 transition-all"
            title="Records & 1st/2nd Leaderboard"
            aria-label="Records and Leaderboard"
          >
            <Trophy className="w-5 h-5" />
          </button>

          <button
            onClick={() => {
              amazeGoAudio.playClick();
              onOpenSettings();
            }}
            className="p-2.5 rounded-2xl bg-[#fbf6ea] shadow-sm border border-[#e2d4ba] text-[#0c7b88] hover:bg-[#efe4ce] active:scale-95 transition-all"
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Center Hero: Interlocking Arrows Icon + Brain Faster */}
      <div className="flex flex-col items-center text-center my-auto z-10">
        <div className="mb-4 p-3.5 bg-[#e1f5e8] rounded-[34px] shadow-lg border border-[#cbead6] hover:scale-105 transition-transform duration-300">
          <div className="p-2.5 bg-white rounded-[26px]">
            <svg width="96" height="96" viewBox="0 0 120 120" aria-label="Brain Faster Logo">
              <path
                d="M 20 41 L 20 20 L 56 20 L 56 54"
                fill="none"
                stroke="#081636"
                strokeWidth="9.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polygon
                points="46,50 56,64 66,50"
                fill="#081636"
                stroke="#081636"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <path
                d="M 99 20 L 99 73"
                fill="none"
                stroke="#081636"
                strokeWidth="9.5"
                strokeLinecap="round"
              />
              <polygon
                points="89,69 99,83 109,69"
                fill="#081636"
                stroke="#081636"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <path
                d="M 99 99 L 20 99 L 20 60 L 38 60 L 38 45"
                fill="none"
                stroke="#bf1818"
                strokeWidth="9.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polygon
                points="28,49 38,35 48,49"
                fill="#bf1818"
                stroke="#bf1818"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <path
                d="M 40 78 L 77 78 L 77 25"
                fill="none"
                stroke="#164fd2"
                strokeWidth="9.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polygon
                points="67,29 77,15 87,29"
                fill="#164fd2"
                stroke="#164fd2"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-[#3f3122]">
          Brain Faster
        </h1>
        <p className="text-xs sm:text-sm font-semibold text-[#8c7a64] mt-1.5 max-w-xs">
          Habib Gaming &bull; {isAdmin ? `Admin: All ${TOTAL_LEVELS} Unlocked` : `Unlocked: Level 1–${highestUnlockedLevel} / ${TOTAL_LEVELS}`}
        </p>

        {/* Horizontal Sequential Level Progression Strip */}
        <div className="relative flex items-center justify-center gap-3 mt-5 mb-2 px-4">
          <div className="absolute left-6 right-6 h-2.5 bg-[#e6d8be] rounded-full -z-0" />
          {stripLevels.map((lvlId, idx) => {
            const unlocked = isLevelUnlocked(lvlId, highestUnlockedLevel, isAdmin);
            const isSelected = lvlId === currentLevelId;
            const isAnimated = lvlId > 200 && lvlId % 10 === 0;
            const isArt = lvlId % 5 === 0;
            return (
              <button
                key={lvlId}
                onClick={() => {
                  amazeGoAudio.playClick();
                  if (unlocked) {
                    onStartLevel(lvlId);
                  } else {
                    onOpenLevelSelect();
                  }
                }}
                className={`relative z-10 w-10 h-10 rounded-full font-extrabold text-xs flex items-center justify-center transition-all ${
                  !unlocked
                    ? 'bg-[#dfd3bc] text-[#8c7a64] cursor-not-allowed'
                    : isSelected
                    ? 'bg-[#7c3aed] text-white scale-115 shadow-md ring-4 ring-[#7c3aed]/20'
                    : isAnimated
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : isArt
                    ? 'bg-[#0284c7] text-white hover:bg-[#0369a1]'
                    : idx === 0
                    ? 'bg-[#8f7b62] text-white'
                    : 'bg-[#b7895c] text-white hover:bg-[#9c7046]'
                }`}
                title={
                  !unlocked
                    ? `Level ${lvlId} Locked (Beat Level ${lvlId - 1} first)`
                    : isAnimated
                    ? `Animated Showcase Level ${lvlId}`
                    : isArt
                    ? `Art Level ${lvlId}`
                    : `Play Level ${lvlId}`
                }
              >
                {unlocked ? lvlId : <Lock className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="w-full max-w-sm flex flex-col gap-2 z-10 pb-2">
        <button
          data-start="true"
          onClick={() => {
            amazeGoAudio.playClick();
            onStartLevel(currentLevelId);
          }}
          className={`w-full py-4 px-6 rounded-2xl text-white font-extrabold text-lg shadow-lg flex items-center justify-center gap-2.5 active:scale-95 transition-all ${
            isOneChance
              ? 'bg-[#993b3b] hover:bg-[#822e2e] shadow-[#993b3b]/25'
              : 'bg-[#18181b] hover:bg-[#27272a] shadow-black/20'
          }`}
        >
          {isOneChance ? (
            <>
              <Flame className="w-5 h-5 fill-white" />
              <span>One Chance &bull; Level {currentLevelId}</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-white" />
              <span>
                Play Level {currentLevelId} ({maxHearts} Hearts)
              </span>
            </>
          )}
        </button>

        {/* Action Row: Level Map, Records/1st-2nd Chart, Profile */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => {
              amazeGoAudio.playClick();
              onOpenLevelSelect();
            }}
            className="py-2.5 px-2 rounded-2xl bg-[#fbf6ea] hover:bg-[#efe4ce] text-[#5c4b37] font-bold text-[11px] shadow-sm border border-[#dfcfaf] flex items-center justify-center gap-1 active:scale-95 transition-all"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-[#8b6f4e]" />
            <span>Levels ({isAdmin ? TOTAL_LEVELS : `${highestUnlockedLevel}/${TOTAL_LEVELS}`})</span>
          </button>

          <button
            onClick={() => {
              amazeGoAudio.playClick();
              onOpenRecords();
            }}
            className="py-2.5 px-2 rounded-2xl bg-amber-600/12 hover:bg-amber-600/20 text-amber-900 font-bold text-[11px] shadow-sm border border-amber-600/25 flex items-center justify-center gap-1 active:scale-95 transition-all"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-700" />
            <span>1st/2nd Chart</span>
          </button>

          <button
            onClick={() => {
              amazeGoAudio.playClick();
              onOpenProfile();
            }}
            className="py-2.5 px-2 rounded-2xl bg-[#1d4ed8]/10 hover:bg-[#1d4ed8]/18 text-[#1d4ed8] font-bold text-[11px] shadow-sm border border-[#1d4ed8]/25 flex items-center justify-center gap-1 active:scale-95 transition-all"
          >
            <Award className="w-3.5 h-3.5" />
            <span>{isSignedIn ? 'My Profile' : 'Google Sync'}</span>
          </button>
        </div>

        {/* Mode Toggle */}
        <button
          data-testid="unlimited-mode-toggle"
          onClick={() => {
            amazeGoAudio.playClick();
            onToggleZenMode();
          }}
          className={`flex items-center justify-between px-4 py-2.5 rounded-2xl border text-xs font-semibold active:scale-98 transition-all ${
            canPlayUnlimited
              ? 'bg-[#fbf6ea] border-[#e3d5bc] hover:bg-[#f2e8d4]'
              : 'bg-[#f4ebd9] border-[#dfd0b4] text-[#7c6951]'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {!canPlayUnlimited ? (
              <Lock className="w-4 h-4 text-[#993b3b] shrink-0" />
            ) : isZenMode ? (
              <InfinityIcon className="w-4 h-4 text-teal-600 shrink-0" />
            ) : (
              <Shield className="w-4 h-4 text-[#993b3b] shrink-0" />
            )}
            <span className="text-[#5c4b37] truncate">
              {!canPlayUnlimited
                ? 'Unlimited Mode: অ্যাডমিন পারমিশন প্রয়োজন'
                : isZenMode
                ? 'Mode: Unlimited (Infinite Hearts)'
                : 'Mode: Standard (3 / 2 / 1 Hearts)'}
            </span>
          </div>

          <span className="text-[11px] font-bold text-[#8b6f4e] shrink-0 ml-2">
            {canPlayUnlimited ? 'Switch' : 'Locked'}
          </span>
        </button>

        {unlimitedNotice && (
          <p
            data-testid="unlimited-mode-notice"
            className="text-[11px] font-bold text-center text-[#993b3b] bg-rose-50 border border-rose-200 rounded-xl px-3 py-1.5"
          >
            {unlimitedNotice}
          </p>
        )}

        <PWAInstallButton />
      </div>
    </div>
  );
};
