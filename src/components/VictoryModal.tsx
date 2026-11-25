import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Play, RotateCcw, Grid, Award, Clock, Move } from 'lucide-react';
import { sound } from '../game/audio';

interface VictoryModalProps {
  levelId: number;
  levelName: string;
  totalLevels: number;
  stats: {
    moves: number;
    seconds: number;
  };
  onNextLevel: () => void;
  onReplay: () => void;
  onOpenLevelSelect: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  levelId,
  levelName,
  totalLevels,
  stats,
  onNextLevel,
  onReplay,
  onOpenLevelSelect
}) => {
  // Fire colorful celebratory confetti bursts
  useEffect(() => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 }
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 }
        });
      }, 250);
    } catch {
      // Ignore if confetti not supported
    }
  }, []);

  // Enter and Space trigger Next Level as mandated
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onNextLevel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNextLevel]);

  const hasNextLevel = levelId < totalLevels;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 select-none">
      <div className="w-full max-w-sm rounded-3xl bg-slate-900 border-2 border-pink-500/50 shadow-[0_20px_50px_rgba(255,46,147,0.3)] p-6 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
        
        {/* Celebration Trophy / Star Lockup */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/40 mb-3">
          <Award size={36} />
        </div>

        <span className="text-xs font-bold uppercase tracking-widest text-pink-400">
          100% Painted!
        </span>
        <h2 className="text-2xl font-black text-white mt-1">
          LEVEL COMPLETED!
        </h2>
        <p className="text-sm font-semibold text-slate-300">
          Level {levelId}: {levelName}
        </p>

        {/* 3 Stars */}
        <div className="flex gap-2 my-4">
          {[1, 2, 3].map((star) => (
            <svg
              key={star}
              viewBox="0 0 24 24"
              className="w-8 h-8 text-amber-400 fill-amber-400 drop-shadow-[0_2px_8px_rgba(251,191,36,0.5)]"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          ))}
        </div>

        {/* Mastery Metric Tiles */}
        <div className="grid grid-cols-2 gap-3 w-full my-2">
          <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex flex-col items-center">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold mb-1">
              <Move size={14} className="text-cyan-400" />
              <span>MOVES</span>
            </div>
            <span className="text-xl font-black text-white font-mono tabular-nums">
              {stats.moves}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex flex-col items-center">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold mb-1">
              <Clock size={14} className="text-amber-400" />
              <span>TIME</span>
            </div>
            <span className="text-xl font-black text-white font-mono tabular-nums">
              {stats.seconds}s
            </span>
          </div>
        </div>

        {/* Primary CTA: Next Level or First Level */}
        <div className="w-full flex flex-col gap-2 mt-4">
          <button
            data-start="true"
            onClick={() => {
              sound.playClick();
              onNextLevel();
            }}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:from-pink-400 hover:to-amber-400 text-white font-extrabold text-base shadow-[0_8px_20px_rgba(244,63,94,0.4)] border border-pink-300/40 flex items-center justify-center gap-2 transform active:scale-95 transition-all cursor-pointer"
          >
            <Play className="fill-white" size={20} />
            <span>{hasNextLevel ? `NEXT LEVEL (${levelId + 1})` : 'PLAY AGAIN'}</span>
          </button>

          {/* Secondary Actions */}
          <div className="flex gap-2 w-full">
            <button
              onClick={() => {
                sound.playClick();
                onReplay();
              }}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw size={15} />
              <span>Replay</span>
            </button>

            <button
              onClick={() => {
                sound.playClick();
                onOpenLevelSelect();
              }}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Grid size={15} className="text-cyan-400" />
              <span>Level Select</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
