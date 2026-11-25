import React from 'react';
import { Play, RotateCcw, Grid, Home, Volume2, VolumeX } from 'lucide-react';
import { sound } from '../game/audio';

interface PauseModalProps {
  levelId: number;
  levelName: string;
  isMuted: boolean;
  onResume: () => void;
  onRestart: () => void;
  onOpenLevelSelect: () => void;
  onReturnTitle: () => void;
  onToggleMute: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  levelId,
  levelName,
  isMuted,
  onResume,
  onRestart,
  onOpenLevelSelect,
  onReturnTitle,
  onToggleMute
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 select-none">
      <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl p-6 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-150">
        <h2 className="text-2xl font-black text-white tracking-wide">
          PAUSED
        </h2>
        <p className="text-xs font-semibold text-slate-400 mt-1 mb-5">
          Level {levelId}: {levelName}
        </p>

        <div className="flex flex-col gap-2.5 w-full">
          {/* Resume */}
          <button
            onClick={() => {
              sound.playClick();
              onResume();
            }}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-extrabold text-base shadow-lg border border-pink-300/30 flex items-center justify-center gap-2 transform active:scale-95 transition-all cursor-pointer"
          >
            <Play className="fill-white" size={20} />
            <span>RESUME</span>
          </button>

          {/* Restart */}
          <button
            onClick={() => {
              sound.playClick();
              onRestart();
            }}
            className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm border border-slate-700 flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <RotateCcw size={16} />
            <span>Restart Level</span>
          </button>

          {/* Level Select (All Unlocked) */}
          <button
            onClick={() => {
              sound.playClick();
              onOpenLevelSelect();
            }}
            className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm border border-slate-700 flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Grid size={16} className="text-cyan-400" />
            <span>Level Select (All 32 Unlocked)</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => {
              sound.playClick();
              onToggleMute();
            }}
            className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm border border-slate-700 flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            <span>Sound: {isMuted ? 'OFF' : 'ON'}</span>
          </button>

          {/* Main Menu */}
          <button
            onClick={() => {
              sound.playClick();
              onReturnTitle();
            }}
            className="w-full py-2.5 px-4 rounded-xl text-slate-400 hover:text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer mt-1"
          >
            <Home size={14} />
            <span>Back to Title Screen</span>
          </button>
        </div>
      </div>
    </div>
  );
};
