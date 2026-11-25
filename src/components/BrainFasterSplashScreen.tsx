import React, { useEffect } from 'react';

interface BrainFasterSplashScreenProps {
  onDone: () => void;
}

export const BrainFasterSplashScreen: React.FC<BrainFasterSplashScreenProps> = ({ onDone }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDone();
    }, 2200);

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        onDone();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKey);
    };
  }, [onDone]);

  return (
    <div
      onClick={onDone}
      role="button"
      tabIndex={0}
      aria-label="Habib Gaming Splash Screen - Tap to continue"
      className="h-dvh w-screen flex flex-col items-center justify-between py-10 px-6 bg-[#fcfaf5] text-[#18181b] select-none cursor-pointer animate-fade-in"
    >
      {/* Top Spacer */}
      <div className="h-4" />

      {/* Center Habib Gaming Logo Lockup (matching Oakever Games clean studio splash) */}
      <div className="flex flex-col items-center text-center animate-scale-up">
        <div className="flex items-center gap-3.5 mb-2">
          <svg width="54" height="54" viewBox="0 0 64 64" className="shrink-0">
            <circle cx="32" cy="32" r="27" fill="none" stroke="#1d4ed8" strokeWidth="7" strokeDasharray="128 32" strokeLinecap="round" />
            <path
              d="M 22 40 L 22 22 L 42 22 L 42 38"
              fill="none"
              stroke="#1d4ed8"
              strokeWidth="5.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polygon points="36,34 42,46 48,34" fill="#1d4ed8" />
          </svg>
          <span className="text-4xl sm:text-5xl font-black tracking-tight text-[#1d4ed8]">
            Habib
          </span>
        </div>
        <span className="text-xl sm:text-2xl font-semibold tracking-[0.28em] text-[#2563eb]/85 pl-1">
          Gaming
        </span>
      </div>

      {/* Bottom Subtle Title & Progress Indicator */}
      <div className="flex flex-col items-center gap-2">
        <span className="text-xs font-extrabold tracking-widest uppercase text-[#6b563c]">
          Brain Faster
        </span>
        <div className="w-32 h-1 rounded-full bg-[#ece2cd] overflow-hidden">
          <div className="h-full bg-[#1d4ed8] animate-[splashLoad_1.5s_ease-out_forwards]" />
        </div>
      </div>
    </div>
  );
};
