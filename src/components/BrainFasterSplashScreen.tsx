import React, { useEffect } from 'react';

interface BrainFasterSplashScreenProps {
  onDone: () => void;
}

export const BrainFasterSplashScreen: React.FC<BrainFasterSplashScreenProps> = ({ onDone }) => {
  useEffect(() => {
    const timer = setTimeout(onDone, 2200);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      className="h-dvh w-screen flex flex-col items-center justify-center gap-4 bg-[#f6eedb] select-none animate-fade-in"
      onClick={onDone}
    >
      <svg
        width="128"
        height="128"
        viewBox="0 0 120 120"
        role="img"
        aria-label="Brain Faster Logo"
      >
        <path d="M20 41 L20 20 L56 20 L56 54" fill="none" stroke="#081636" strokeWidth="9.5" strokeLinecap="round" strokeLinejoin="round" />
        <polygon points="46,50 56,64 66,50" fill="#081636" />
        <path d="M99 20 L99 73" fill="none" stroke="#081636" strokeWidth="9.5" strokeLinecap="round" />
        <polygon points="89,69 99,83 109,69" fill="#081636" />
        <path d="M99 99 L20 99 L20 60 L38 60 L38 45" fill="none" stroke="#bf1818" strokeWidth="9.5" strokeLinecap="round" strokeLinejoin="round" />
        <polygon points="28,49 38,35 48,49" fill="#bf1818" />
        <path d="M40 78 L77 78 L77 25" fill="none" stroke="#164fd2" strokeWidth="9.5" strokeLinecap="round" strokeLinejoin="round" />
        <polygon points="67,29 77,15 87,29" fill="#164fd2" />
      </svg>
      <h1 className="text-3xl font-black tracking-tight text-[#18181b]">
        Brain Faster
      </h1>
    </div>
  );
};
