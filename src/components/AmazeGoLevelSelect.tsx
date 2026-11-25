import React, { useState } from 'react';
import { X, Lock, Heart, ArrowRight, ShieldCheck, Clock, Sparkles } from 'lucide-react';
import { AMAZE_GO_LEVEL_METAS, TOTAL_LEVELS } from '../game/amazeGoLevels';
import {
  CompletedLevelsMap,
  formatDurationShort,
  isLevelUnlocked,
} from '../game/playerProgression';
import { amazeGoAudio } from '../game/amazeGoAudio';

interface AmazeGoLevelSelectProps {
  currentLevelId: number;
  highestUnlockedLevel: number;
  isAdmin: boolean;
  completedLevels: CompletedLevelsMap;
  onSelectLevel: (levelId: number) => void;
  onClose: () => void;
}

type TierTab = 'ALL' | 'ANIMATED' | 'ART' | 'T1' | 'T2' | 'T3';

export const AmazeGoLevelSelect: React.FC<AmazeGoLevelSelectProps> = ({
  currentLevelId,
  highestUnlockedLevel,
  isAdmin,
  completedLevels,
  onSelectLevel,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TierTab>('ALL');
  const [jumpInput, setJumpInput] = useState<string>('');
  const [lockMessage, setLockMessage] = useState<string | null>(null);

  const filteredLevels = AMAZE_GO_LEVEL_METAS.filter((lvl) => {
    if (activeTab === 'ANIMATED') return !!lvl.isAnimatedShowcase;
    if (activeTab === 'ART') return !!lvl.isArtLevel;
    if (activeTab === 'T1') return lvl.id <= 100;
    if (activeTab === 'T2') return lvl.id >= 101 && lvl.id <= 200;
    if (activeTab === 'T3') return lvl.id >= 201;
    return true;
  });

  const handleTrySelect = (lvlId: number) => {
    if (!isLevelUnlocked(lvlId, highestUnlockedLevel, isAdmin)) {
      amazeGoAudio.playBlocked();
      setLockMessage(
        `Level ${lvlId} লক করা আছে! আগে Level ${highestUnlockedLevel} কমপ্লিট করুন।`
      );
      setTimeout(() => setLockMessage(null), 2600);
      return;
    }
    amazeGoAudio.playClick();
    onSelectLevel(lvlId);
    onClose();
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(jumpInput, 10);
    if (!isNaN(num) && num >= 1 && num <= TOTAL_LEVELS) {
      handleTrySelect(num);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Level Select"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-[#fbf6ea] text-[#5c4b37] rounded-3xl p-5 sm:p-6 shadow-2xl border border-[#e0d2b8] flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#e6d9c0]">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[#6b563c]">
                BRAIN FASTER &bull; {TOTAL_LEVELS} LEVELS
              </h2>
              {isAdmin ? (
                <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-600/15 text-emerald-700 border border-emerald-600/25">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Admin: All {TOTAL_LEVELS} Unlocked
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-600/15 text-amber-800 border border-amber-600/25">
                  Unlocked: 1–{highestUnlockedLevel}
                </span>
              )}
            </div>
            <p className="text-xs text-[#8c7a64] mt-0.5">
              একটা লেভেল জিতলে পরের লেভেল ওপেন হবে &bull; প্রতি ৫ম: Art &bull; ২০১+ প্রতি ১০ম: Boss Animated
            </p>
          </div>

          <button
            onClick={() => {
              amazeGoAudio.playClick();
              onClose();
            }}
            className="p-2 rounded-2xl bg-[#efe4ce] text-[#6b563c] hover:bg-[#e5d5b7] active:scale-95 transition-all"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {lockMessage && (
          <div className="mt-2 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold text-center animate-fade-in">
            {lockMessage}
          </div>
        )}

        {/* Tier Tabs + Quick Level Jump */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { key: 'ALL', label: `All (${TOTAL_LEVELS})` },
              { key: 'ANIMATED', label: 'Boss Animated (30)' },
              { key: 'ART', label: 'Art (Every 5th)' },
              { key: 'T1', label: '1–100 (3 ❤️)' },
              { key: 'T2', label: '101–200 (2 ❤️)' },
              { key: 'T3', label: `201–${TOTAL_LEVELS} (1 ❤️)` },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  amazeGoAudio.playClick();
                  setActiveTab(tab.key as TierTab);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'bg-[#6b563c] text-white shadow-sm'
                    : 'bg-[#efe4ce] text-[#6b563c] hover:bg-[#e5d6b8]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleJumpSubmit} className="flex items-center gap-1.5 shrink-0">
            <input
              type="number"
              min={1}
              max={TOTAL_LEVELS}
              value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              placeholder={`Level # (1-${TOTAL_LEVELS})`}
              className="w-32 px-2.5 py-1.5 rounded-xl bg-white border border-[#dcccb0] text-xs font-bold text-[#5c4b37] placeholder:text-[#a89882] focus:outline-none focus:border-[#7c3aed]"
            />
            <button
              type="submit"
              className="p-1.5 rounded-xl bg-[#7c3aed] text-white hover:bg-[#6d28d9] active:scale-95 transition-all"
              aria-label="Go to level"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Levels Grid */}
        <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2.5 py-1">
          {filteredLevels.map((lvl) => {
            const unlocked = isLevelUnlocked(lvl.id, highestUnlockedLevel, isAdmin);
            const isCurrent = lvl.id === currentLevelId;
            const completion = completedLevels[lvl.id];
            const isCompleted = !!completion;

            return (
              <button
                key={lvl.id}
                onClick={() => handleTrySelect(lvl.id)}
                className={`relative flex flex-col items-center justify-center p-2.5 rounded-2xl border-2 transition-all group ${
                  !unlocked
                    ? 'border-[#e8dec9] bg-[#efe5d0]/70 opacity-65 cursor-not-allowed'
                    : isCurrent
                    ? 'border-[#7c3aed] bg-[#7c3aed]/10 shadow-md scale-[1.03]'
                    : lvl.isAnimatedShowcase
                    ? 'border-emerald-500/55 bg-emerald-50/75 hover:border-emerald-600 hover:bg-emerald-100/70'
                    : lvl.isArtLevel
                    ? 'border-[#0284c7]/45 bg-[#e0f2fe]/50 hover:border-[#0284c7] hover:bg-[#e0f2fe]/80'
                    : 'border-[#e5d8be] hover:border-[#8b6f4e] bg-white/80 hover:bg-white'
                }`}
              >
                {unlocked ? (
                  lvl.isAnimatedShowcase ? (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-600 text-white text-[8px] font-black uppercase tracking-wider mb-1">
                      <Sparkles className="w-2.5 h-2.5" />
                      BOSS
                    </span>
                  ) : (
                    <span
                      className="w-2.5 h-2.5 rounded-full mb-1"
                      style={{ backgroundColor: lvl.arrowColor }}
                    />
                  )
                ) : (
                  <Lock className="w-3 h-3 text-[#9a866e] mb-1" />
                )}

                <span className="text-base font-black text-[#4a3b2a] leading-none">
                  {lvl.id}
                </span>

                <span className="text-[9px] font-bold text-[#8c7a64] mt-1 truncate max-w-full">
                  {lvl.isArtLevel && lvl.artThemeName
                    ? lvl.artThemeName
                    : `${lvl.width}×${lvl.height}`}
                </span>

                <div className="flex items-center gap-0.5 mt-1">
                  {isCompleted ? (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-emerald-700">
                      <Clock className="w-2.5 h-2.5" />
                      {formatDurationShort(completion.bestTimeSeconds || 0)}
                    </span>
                  ) : !unlocked ? (
                    <span className="text-[9px] font-bold text-[#9a866e]">Locked</span>
                  ) : (
                    Array.from({ length: lvl.maxHearts }).map((_, i) => (
                      <Heart key={i} className="w-2.5 h-2.5 text-rose-500 fill-rose-500" />
                    ))
                  )}
                </div>

                {isCurrent && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#7c3aed] text-white flex items-center justify-center text-[9px] font-bold shadow">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#e6d9c0] flex items-center justify-between text-xs text-[#8c7a64]">
          <span>Brain Faster &bull; {TOTAL_LEVELS} Levels</span>
          <span className="font-bold text-[#6b563c]">
            {isAdmin ? 'Admin Mode (All Open)' : `${Object.keys(completedLevels).length} Cleared`}
          </span>
        </div>
      </div>
    </div>
  );
};
