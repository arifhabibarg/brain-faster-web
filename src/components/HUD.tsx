import React from 'react';
import { RotateCcw, Pause, Volume2, VolumeX, Grid, Palette, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Navigation } from 'lucide-react';
import { ColorTheme, Direction, LevelData } from '../game/types';
import { sound } from '../game/audio';

interface HUDProps {
  level: LevelData;
  progress: {
    total: number;
    painted: number;
    percentage: number;
  };
  moves: number;
  theme: ColorTheme;
  isMuted: boolean;
  showArrowGuide: boolean;
  onToggleMute: () => void;
  onToggleArrowGuide: () => void;
  onResetLevel: () => void;
  onPause: () => void;
  onOpenLevelSelect: () => void;
  onOpenCustomizer: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  level,
  progress,
  moves,
  theme,
  isMuted,
  showArrowGuide,
  onToggleMute,
  onToggleArrowGuide,
  onResetLevel,
  onPause,
  onOpenLevelSelect,
  onOpenCustomizer
}) => {
  const handleVirtualDir = (dir: Direction) => {
    window.dispatchEvent(new CustomEvent('amaze-roll', { detail: { direction: dir } }));
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-10 flex flex-col justify-between p-4 sm:p-6">
      {/* Top Header Cluster: Level, Progress, Moves, and Utilities */}
      <div className="w-full max-w-4xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Level Info & Progress */}
        <div className="pointer-events-auto flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-xl flex flex-col">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Level {level.id}
            </span>
            <span className="text-sm font-extrabold text-white truncate max-w-[120px] sm:max-w-[180px]">
              {level.name}
            </span>
          </div>

          {/* Paint Progress Bar & Percentage */}
          <div className="hidden sm:flex flex-col gap-1 px-4 py-2 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-xl min-w-[140px]">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-slate-400">PAINTED</span>
              <span className="text-white font-mono tabular-nums">{progress.percentage}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-200"
                style={{
                  width: `${progress.percentage}%`,
                  backgroundColor: theme.paintColor
                }}
              />
            </div>
          </div>
        </div>

        {/* Center: Moves Counter */}
        <div className="pointer-events-auto px-4 py-2 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-xl flex flex-col items-center">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            MOVES
          </span>
          <span className="text-base font-black text-white font-mono tabular-nums">
            {moves}
          </span>
        </div>

        {/* Right: Quick Action Buttons */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
          {/* Arrow Guide Toggle Button */}
          <button
            onClick={() => {
              sound.playClick();
              onToggleArrowGuide();
            }}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center shadow-md active:scale-95 transition-all cursor-pointer ${
              showArrowGuide
                ? 'bg-pink-600/90 border-pink-400 text-white shadow-pink-600/30'
                : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700/80 text-slate-400'
            }`}
            title={`3D Arrow Guide [A]: ${showArrowGuide ? 'ON' : 'OFF'}`}
            aria-label="Toggle 3D Arrow Guide"
          >
            <Navigation size={18} className={showArrowGuide ? 'rotate-45 text-white' : 'rotate-45'} />
          </button>

          {/* Level Select Button */}
          <button
            onClick={() => {
              sound.playClick();
              onOpenLevelSelect();
            }}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-200 shadow-md active:scale-95 transition-transform cursor-pointer"
            title="Level Select (All Unlocked)"
            aria-label="Level Select"
          >
            <Grid size={18} />
          </button>

          {/* Theme Customizer Button */}
          <button
            onClick={() => {
              sound.playClick();
              onOpenCustomizer();
            }}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-200 shadow-md active:scale-95 transition-transform cursor-pointer"
            title="Customize Ball & Paint"
            aria-label="Customize Ball and Paint"
          >
            <Palette size={18} />
          </button>

          {/* Reset Level Button */}
          <button
            onClick={() => {
              sound.playClick();
              onResetLevel();
            }}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-200 shadow-md active:scale-95 transition-transform cursor-pointer"
            title="Restart Level [R]"
            aria-label="Restart Level"
          >
            <RotateCcw size={18} />
          </button>

          {/* Sound Toggle Button */}
          <button
            onClick={() => {
              sound.playClick();
              onToggleMute();
            }}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-200 shadow-md active:scale-95 transition-transform cursor-pointer"
            title="Toggle Sound [M]"
            aria-label="Toggle Sound"
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          {/* Pause Button */}
          <button
            onClick={() => {
              sound.playClick();
              onPause();
            }}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-200 shadow-md active:scale-95 transition-transform cursor-pointer"
            title="Pause [P / Esc]"
            aria-label="Pause"
          >
            <Pause size={18} />
          </button>
        </div>
      </div>

      {/* Mobile progress strip (visible on small screens) */}
      <div className="sm:hidden pointer-events-auto mx-auto w-full max-w-xs mt-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/70 shadow-lg flex items-center gap-2">
        <span className="text-[10px] font-bold text-slate-400">PAINTED:</span>
        <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-200"
            style={{
              width: `${progress.percentage}%`,
              backgroundColor: theme.paintColor
            }}
          />
        </div>
        <span className="text-[11px] font-extrabold text-white font-mono tabular-nums">
          {progress.percentage}%
        </span>
      </div>

      {/* Bottom Area: Virtual Direction Pad with Arrow & Key hint */}
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-2 mb-2">
        {/* Virtual Arrow Controller */}
        <div className="pointer-events-auto flex flex-col items-center gap-1 opacity-85 hover:opacity-100 transition-opacity">
          {/* Arrow Up (W) */}
          <button
            onClick={() => handleVirtualDir('UP')}
            className="w-12 h-11 rounded-xl bg-slate-900/90 hover:bg-slate-800 active:bg-pink-600 border border-slate-700/80 flex flex-col items-center justify-center text-white shadow-lg active:scale-90 transition-all cursor-pointer group"
            title="Roll Up (↑ / W)"
            aria-label="Roll Up"
          >
            <ChevronUp size={20} className="group-hover:-translate-y-0.5 transition-transform" />
            <span className="text-[8px] font-bold text-slate-400 -mt-1">W</span>
          </button>

          <div className="flex items-center gap-2">
            {/* Arrow Left (A) */}
            <button
              onClick={() => handleVirtualDir('LEFT')}
              className="w-12 h-11 rounded-xl bg-slate-900/90 hover:bg-slate-800 active:bg-pink-600 border border-slate-700/80 flex flex-col items-center justify-center text-white shadow-lg active:scale-90 transition-all cursor-pointer group"
              title="Roll Left (← / A)"
              aria-label="Roll Left"
            >
              <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
              <span className="text-[8px] font-bold text-slate-400 -mt-1">A</span>
            </button>

            {/* Arrow Down (S) */}
            <button
              onClick={() => handleVirtualDir('DOWN')}
              className="w-12 h-11 rounded-xl bg-slate-900/90 hover:bg-slate-800 active:bg-pink-600 border border-slate-700/80 flex flex-col items-center justify-center text-white shadow-lg active:scale-90 transition-all cursor-pointer group"
              title="Roll Down (↓ / S)"
              aria-label="Roll Down"
            >
              <ChevronDown size={20} className="group-hover:translate-y-0.5 transition-transform" />
              <span className="text-[8px] font-bold text-slate-400 -mt-1">S</span>
            </button>

            {/* Arrow Right (D) */}
            <button
              onClick={() => handleVirtualDir('RIGHT')}
              className="w-12 h-11 rounded-xl bg-slate-900/90 hover:bg-slate-800 active:bg-pink-600 border border-slate-700/80 flex flex-col items-center justify-center text-white shadow-lg active:scale-90 transition-all cursor-pointer group"
              title="Roll Right (→ / D)"
              aria-label="Roll Right"
            >
              <ChevronRight size={20} className="group-hover:translate-x-0.5 transition-transform" />
              <span className="text-[8px] font-bold text-slate-400 -mt-1">D</span>
            </button>
          </div>
        </div>

        <p className="text-[11px] font-medium text-slate-400 tracking-wide text-center">
          Tap 3D Arrows, Swipe, or use Keyboard Arrow Keys (↑ ↓ ← → / WASD)
        </p>
      </div>
    </div>
  );
};
