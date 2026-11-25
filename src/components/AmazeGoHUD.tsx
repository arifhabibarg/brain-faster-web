import React from 'react';
import {
  ArrowLeft,
  Lightbulb,
  Heart,
  Infinity as InfinityIcon,
  Award,
  Trophy,
  Settings,
  Sparkles,
} from 'lucide-react';
import { AmazeGoLevel, isGoldenKeyLevel } from '../game/amazeGoLogic';
import { getRankTier } from '../game/playerProgression';
import { amazeGoAudio } from '../game/amazeGoAudio';

interface AmazeGoHUDProps {
  level: AmazeGoLevel;
  totalArrows: number;
  remainingArrows: number;
  hearts: number;
  maxHearts: number;
  hintsRemaining: number;
  isZenMode: boolean;
  completedCount: number;
  displayName: string;
  photoUrl: string;
  onBackToTitle: () => void;
  onOpenProfile: () => void;
  onOpenRecords: () => void;
  onOpenSettings: () => void;
  onHint: () => void;
}

export const AmazeGoHUD: React.FC<AmazeGoHUDProps> = ({
  level,
  totalArrows,
  remainingArrows,
  hearts,
  maxHearts,
  hintsRemaining,
  isZenMode,
  completedCount,
  displayName,
  photoUrl,
  onBackToTitle,
  onOpenProfile,
  onOpenRecords,
  onOpenSettings,
  onHint,
}) => {
  const totalDots = level.width * level.height;
  const tier = getRankTier(completedCount);
  const canUseHint = hintsRemaining > 0 && remainingArrows > 0;

  return (
    <header className="relative w-full max-w-xl mx-auto px-3 sm:px-4 pt-1.5 pb-1 flex flex-col gap-1 z-30">
      {/* Top Creator Strip + Live 7-Rank Tier Badge & Profile Avatar */}
      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.12em] text-[#8c7a64] px-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[#5c4b37]">Brain Faster</span>
          <button
            onClick={() => {
              amazeGoAudio.playClick();
              onOpenProfile();
            }}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px] font-black normal-case tracking-normal"
            style={{
              backgroundColor: tier.badgeBg,
              color: tier.badgeText,
              borderColor: tier.badgeBorder,
            }}
            title={`Rank ${tier.index + 1}/7: ${tier.name}`}
            aria-label="Open Player Rank and Profile"
          >
            {photoUrl ? (
              <img src={photoUrl} alt={displayName} className="w-3.5 h-3.5 rounded-full object-cover" />
            ) : (
              <Award className="w-3 h-3" />
            )}
            <span>{tier.name}</span>
          </button>
        </div>
      </div>

      {/* Row 1: Back, Centered Level Title, Utility Actions */}
      <div className="flex items-center justify-between border-b border-[#e5d9c1] pb-1.5">
        <button
          onClick={onBackToTitle}
          className="p-1.5 sm:p-2 rounded-xl text-[#7a6855] hover:bg-[#ebe0c9] active:scale-95 transition-all"
          title="Back to Home"
          aria-label="Back to Home"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-[#8b6f4e]">
              Level {level.id}
            </h1>
            {level.isAnimatedShowcase && level.artThemeName ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-600/15 text-rose-800 border border-rose-600/30">
                <Sparkles className="w-2.5 h-2.5 text-rose-600" />
                BOSS &bull; {level.artThemeName}
              </span>
            ) : (
              level.isArtLevel &&
              level.artThemeName && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#0284c7]/15 text-[#0369a1] border border-[#0284c7]/25">
                  {level.artThemeName}
                </span>
              )
            )}
            {isGoldenKeyLevel(level.id) && (
              <span
                data-testid="golden-level-badge"
                className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400/25 text-amber-900 border border-amber-500/45"
                title="Free the shimmering Golden Arrow to win immediately!"
              >
                <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                Gold Key
              </span>
            )}
          </div>
          <p className="text-[10px] font-bold text-[#9a866e]">
            {level.width}×{level.height} ({totalDots.toLocaleString()} Dots) &bull;{' '}
            {maxHearts === 1 ? 'One Chance (1 ❤️)' : `${maxHearts} Hearts`}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              amazeGoAudio.playClick();
              onOpenRecords();
            }}
            className="p-1.5 sm:p-2 rounded-xl text-amber-700 hover:bg-[#ebe0c9] active:scale-95 transition-all"
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
            className="p-1.5 sm:p-2 rounded-xl text-[#0c7b88] hover:bg-[#ebe0c9] active:scale-95 transition-all"
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Row 2: Hearts + Remaining Counter; Hint (Max 3 per level) */}
      <div className="flex items-center justify-between pt-0.5">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#fbf6ea] border border-[#e3d6bc]"
            data-testid="hearts-display"
          >
            {isZenMode ? (
              <div className="flex items-center gap-1 text-xs font-bold text-teal-700">
                <InfinityIcon className="w-4 h-4 text-teal-600" />
                <span>ZEN</span>
              </div>
            ) : (
              Array.from({ length: maxHearts }).map((_, i) => (
                <Heart
                  key={i}
                  className={`w-4 h-4 transition-all duration-300 ${
                    i < hearts
                      ? 'text-rose-600 fill-rose-500 scale-100'
                      : 'text-[#d9cbb3] scale-90'
                  }`}
                />
              ))
            )}
          </div>

          <span className="text-xs font-bold text-[#7c6951] tabular-nums">
            {remainingArrows} / {totalArrows} left
          </span>
        </div>

        <button
          data-testid="hint-button"
          data-hints-remaining={hintsRemaining}
          disabled={!canUseHint}
          onClick={() => {
            if (!canUseHint) return;
            onHint();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold text-xs transition-all ${
            canUseHint
              ? 'bg-[#fbf6ea] hover:bg-[#f6e8cb] border-[#e2c68f] text-[#b45309] active:scale-95 shadow-2xs'
              : 'bg-[#eee5d3] border-[#ddd0b8] text-[#9a866e] opacity-60 cursor-not-allowed'
          }`}
          title={
            hintsRemaining > 0
              ? `Highlight Escapable Arrow (${hintsRemaining} left)`
              : 'No hints left in this level'
          }
          aria-label={`Hint (${hintsRemaining} left)`}
        >
          <Lightbulb
            className={`w-4 h-4 ${
              canUseHint ? 'text-amber-500 fill-amber-400/30' : 'text-[#a39179]'
            }`}
          />
          <span>Hint ({hintsRemaining})</span>
        </button>
      </div>
    </header>
  );
};

