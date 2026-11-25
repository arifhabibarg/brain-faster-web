import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, ArrowRight, RotateCw, LayoutGrid, Star, Award, Unlock } from 'lucide-react';
import { AmazeGoLevel } from '../game/amazeGoLogic';
import { TOTAL_LEVELS } from '../game/amazeGoLevels';
import { getRankTier, formatDurationShort } from '../game/playerProgression';
import { amazeGoAudio } from '../game/amazeGoAudio';

interface AmazeGoVictoryProps {
  level: AmazeGoLevel;
  moves: number;
  blockedCount: number;
  timeSeconds: number;
  completedCount: number;
  clearedByGoldenKey?: boolean;
  onNextLevel: () => void;
  onReplay: () => void;
  onOpenLevelSelect: () => void;
  onOpenRecords: () => void;
}

export const AmazeGoVictory: React.FC<AmazeGoVictoryProps> = ({
  level,
  blockedCount,
  timeSeconds,
  completedCount,
  clearedByGoldenKey = false,
  onNextLevel,
  onReplay,
  onOpenLevelSelect,
  onOpenRecords,
}) => {
  const stars = blockedCount === 0 ? 3 : blockedCount <= 2 ? 2 : 1;
  const tier = getRankTier(completedCount);

  useEffect(() => {
    if (!clearedByGoldenKey) {
      amazeGoAudio.playVictory();
    }
    try {
      confetti({
        particleCount: clearedByGoldenKey ? 85 : 55,
        spread: clearedByGoldenKey ? 80 : 65,
        origin: { y: 0.6 },
        colors: clearedByGoldenKey
          ? ['#fbbf24', '#f59e0b', '#fef08a', '#d97706']
          : ['#7c3aed', '#18181b', '#f59e0b', '#0f766e'],
      });
    } catch {
      // Ignore if confetti unavailable
    }
  }, [clearedByGoldenKey]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-sm bg-[#fbf6ea] text-[#5c4b37] rounded-3xl p-6 shadow-2xl border border-[#e0d2b8] flex flex-col items-center text-center animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/20 mb-3">
          <Trophy className="w-8 h-8 text-amber-950" />
        </div>

        <h2 className="text-2xl font-black tracking-tight">LEVEL {level.id} CLEARED!</h2>
        <p className="text-xs font-semibold text-[#8c7a64] mt-0.5">
          {level.width}×{level.height} &bull; {level.arrows.length} Arrows
        </p>

        {clearedByGoldenKey && (
          <div
            data-testid="golden-victory-badge"
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/25 text-amber-900 border border-amber-500/45 text-[11px] font-black"
          >
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-600" />
            <span>Golden Arrow Freed!</span>
          </div>
        )}

        {level.id < TOTAL_LEVELS && (
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600/12 text-emerald-800 border border-emerald-600/25 text-[11px] font-extrabold">
            <Unlock className="w-3.5 h-3.5" />
            <span>Level {level.id + 1} Unlocked!</span>
          </div>
        )}

        <div className="flex items-center gap-2 my-3.5">
          {[1, 2, 3].map((starIdx) => (
            <Star
              key={starIdx}
              className={`w-9 h-9 ${
                starIdx <= stars
                  ? 'text-amber-500 fill-amber-400'
                  : 'text-[#dfd3bc]'
              }`}
            />
          ))}
        </div>

        <div className="w-full grid grid-cols-3 gap-2 bg-[#f3e9d3] rounded-2xl p-3 mb-3 border border-[#e4d6bb]">
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-[#8c7a64]">Arrows</span>
            <span className="text-base font-black">{level.arrows.length}</span>
          </div>
          <div className="flex flex-col items-center border-x border-[#dfd1b5]">
            <span className="text-[10px] uppercase font-bold text-[#8c7a64]">Rank</span>
            <span
              className="text-xs font-black px-2 py-0.5 rounded-full border mt-0.5 inline-flex items-center gap-1"
              style={{
                backgroundColor: tier.badgeBg,
                color: tier.badgeText,
                borderColor: tier.badgeBorder,
              }}
            >
              <Award className="w-3 h-3" />
              {tier.name}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-[#8c7a64]">Time</span>
            <span className="text-base font-black">{formatDurationShort(timeSeconds)}</span>
          </div>
        </div>

        <div className="w-full flex flex-col gap-2">
          <button
            onClick={() => {
              amazeGoAudio.playClick();
              onNextLevel();
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#6b563c] hover:bg-[#574530] text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <span>Next Level ({level.id < TOTAL_LEVELS ? level.id + 1 : 1})</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="w-full grid grid-cols-3 gap-2">
            <button
              onClick={() => {
                amazeGoAudio.playClick();
                onReplay();
              }}
              className="py-2.5 px-2 rounded-2xl bg-[#efe4ce] hover:bg-[#e5d6b8] text-[#5c4b37] font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-all"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Replay</span>
            </button>

            <button
              onClick={() => {
                amazeGoAudio.playClick();
                onOpenRecords();
              }}
              className="py-2.5 px-2 rounded-2xl bg-amber-600/15 hover:bg-amber-600/25 text-amber-900 font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-all"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Records</span>
            </button>

            <button
              onClick={() => {
                amazeGoAudio.playClick();
                onOpenLevelSelect();
              }}
              className="py-2.5 px-2 rounded-2xl bg-[#efe4ce] hover:bg-[#e5d6b8] text-[#5c4b37] font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-all"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Levels</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
