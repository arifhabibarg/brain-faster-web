import React from 'react';
import { HeartCrack, RotateCw, Infinity as InfinityIcon, LayoutGrid, Lock } from 'lucide-react';
import { AmazeGoLevel } from '../game/amazeGoLogic';
import { amazeGoAudio } from '../game/amazeGoAudio';

interface AmazeGoGameOverProps {
  level: AmazeGoLevel;
  canPlayUnlimited: boolean;
  onRetry: () => void;
  onSwitchToZen: () => void;
  onOpenLevelSelect: () => void;
}

export const AmazeGoGameOver: React.FC<AmazeGoGameOverProps> = ({
  level,
  canPlayUnlimited,
  onRetry,
  onSwitchToZen,
  onOpenLevelSelect,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-sm bg-[#fbf6ea] text-[#5c4b37] rounded-3xl p-6 shadow-2xl border border-[#e0d2b8] flex flex-col items-center text-center animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-16 h-16 rounded-3xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mb-3">
          <HeartCrack className="w-8 h-8 text-rose-600 animate-pulse" />
        </div>

        <h2 className="text-2xl font-black tracking-tight">
          {level.maxHearts === 1 ? 'ONE CHANCE MISSED!' : 'OUT OF HEARTS'}
        </h2>
        <p className="text-xs text-[#8c7a64] mt-1">
          Level {level.id} ({level.maxHearts} {level.maxHearts === 1 ? 'Heart' : 'Hearts'}) &bull; Trace the arrow&apos;s tip before tapping!
        </p>

        <div className="w-full flex flex-col gap-2.5 mt-6">
          <button
            onClick={() => {
              amazeGoAudio.playClick();
              onRetry();
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#993b3b] hover:bg-[#822e2e] text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <RotateCw className="w-4 h-4" />
            <span>Try Again ({level.maxHearts} {level.maxHearts === 1 ? 'Heart' : 'Hearts'})</span>
          </button>

          {canPlayUnlimited ? (
            <button
              onClick={() => {
                amazeGoAudio.playClick();
                onSwitchToZen();
              }}
              className="w-full py-3 px-4 rounded-2xl bg-teal-600/12 hover:bg-teal-600/20 border border-teal-600/25 text-teal-800 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <InfinityIcon className="w-4 h-4 text-teal-700" />
              <span>Continue in Unlimited Mode (Infinite Lives)</span>
            </button>
          ) : (
            <div className="w-full py-2.5 px-4 rounded-2xl bg-[#f1e7d2] border border-[#dfd0b4] text-[#7c6951] font-bold text-[11px] flex items-center justify-center gap-1.5">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>Unlimited Mode: শুধু অ্যাডমিনের অনুমতিতে খেলা যাবে</span>
            </div>
          )}

          <button
            onClick={() => {
              amazeGoAudio.playClick();
              onOpenLevelSelect();
            }}
            className="w-full py-2.5 px-3 rounded-2xl bg-[#efe4ce] hover:bg-[#e5d6b8] text-[#5c4b37] font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Select Any of 500 Levels</span>
          </button>
        </div>
      </div>
    </div>
  );
};
