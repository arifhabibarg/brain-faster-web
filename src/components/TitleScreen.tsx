import React, { useEffect } from 'react';
import { Play, Grid, Palette, Volume2, VolumeX } from 'lucide-react';
import { sound } from '../game/audio';

interface TitleScreenProps {
  onStart: () => void;
  onOpenLevelSelect: () => void;
  onOpenCustomizer: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  currentLevel: number;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStart,
  onOpenLevelSelect,
  onOpenCustomizer,
  isMuted,
  onToggleMute,
  currentLevel
}) => {
  // Bind Enter and Space to start as mandated by game craft guidelines
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStart]);

  return (
    <div className="absolute inset-0 flex flex-col justify-between p-6 pointer-events-none select-none z-20">
      {/* Top Header Row with Sound Toggle and Info Badge */}
      <div className="flex justify-between items-center w-full max-w-4xl mx-auto pt-2">
        <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/60 shadow-lg backdrop-blur-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
          <span className="text-xs font-semibold tracking-wider text-emerald-300 uppercase">
            All 32 Levels Unlocked
          </span>
        </div>

        <button
          onClick={() => {
            sound.playClick();
            onToggleMute();
          }}
          className="pointer-events-auto w-10 h-10 rounded-xl bg-slate-900/85 hover:bg-slate-800 border border-slate-700/70 flex items-center justify-center text-slate-200 transition-transform active:scale-95 shadow-lg"
          title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>

      {/* Hero Showcase Centerpiece with Bespoke SVG Title Lockup */}
      <div className="flex flex-col items-center justify-center text-center my-auto">
        <div className="relative mb-5 transform transition-transform hover:scale-105 duration-300">
          {/* Custom Bespoke SVG Title Lockup for AMAZE GO */}
          <svg
            viewBox="0 0 460 110"
            className="w-72 sm:w-96 md:w-[440px] drop-shadow-[0_12px_24px_rgba(255,46,147,0.35)]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Splash droplet accents */}
            <path d="M 40 30 Q 30 15 45 10 Q 55 18 40 30 Z" fill="#ff2e93" />
            <circle cx="420" cy="25" r="8" fill="#00e5ff" />
            <circle cx="438" cy="42" r="5" fill="#ffd600" />
            <path d="M 405 85 Q 425 90 415 102 Q 398 95 405 85 Z" fill="#00e676" />

            {/* AMAZE Wordmark */}
            <text
              x="20"
              y="75"
              fill="#ffffff"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontWeight="900"
              fontSize="70"
              letterSpacing="3"
              stroke="#0f0c1d"
              strokeWidth="9"
              paintOrder="stroke fill"
            >
              AMAZE
            </text>

            {/* GO 3D Badge */}
            <rect
              x="300"
              y="18"
              width="130"
              height="68"
              rx="18"
              fill="#ff2e93"
              stroke="#ffffff"
              strokeWidth="4"
            />
            <text
              x="365"
              y="68"
              textAnchor="middle"
              fill="#ffffff"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontWeight="900"
              fontSize="52"
              fontStyle="italic"
            >
              GO!
            </text>
          </svg>

          <div className="mt-2">
            <span className="inline-block px-4 py-1.5 rounded-full bg-slate-950/80 border border-slate-700/60 text-xs sm:text-sm font-semibold text-slate-200 shadow-md">
              The Satisfying 3D Ball Paint Maze Puzzle
            </span>
          </div>
        </div>

        {/* Primary CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs sm:max-w-md pointer-events-auto mt-2">
          <button
            data-start="true"
            onClick={() => {
              sound.playClick();
              onStart();
            }}
            className="w-full flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:from-pink-400 hover:to-amber-400 text-white font-extrabold text-lg sm:text-xl shadow-[0_10px_25px_rgba(244,63,94,0.45)] border border-pink-300/40 flex items-center justify-center gap-3 transform active:scale-95 transition-all cursor-pointer"
          >
            <Play className="fill-white" size={24} />
            <span>PLAY LEVEL {currentLevel}</span>
          </button>
        </div>

        {/* Secondary Navigation CTAs */}
        <div className="flex items-center gap-3 mt-3 w-full max-w-xs sm:max-w-md pointer-events-auto">
          <button
            onClick={() => {
              sound.playClick();
              onOpenLevelSelect();
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-100 font-bold text-sm border border-slate-700/80 flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer"
          >
            <Grid size={18} className="text-cyan-400" />
            <span>Levels (32)</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onOpenCustomizer();
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-100 font-bold text-sm border border-slate-700/80 flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer"
          >
            <Palette size={18} className="text-pink-400" />
            <span>Customizer</span>
          </button>
        </div>
      </div>

      {/* Flat borderless control hint line at bottom */}
      <div className="text-center pb-2">
        <p className="text-xs sm:text-sm font-medium text-slate-400 tracking-wide">
          Use Arrow Keys (↑ ↓ ← →) or Click 3D Arrows / Swipe to Roll · Space or Enter to Start · Esc to Pause
        </p>
      </div>
    </div>
  );
};
