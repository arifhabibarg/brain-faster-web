import React, { useState } from 'react';
import { X, Unlock, CheckCircle2, Play } from 'lucide-react';
import { LevelData } from '../game/types';
import { sound } from '../game/audio';

interface LevelSelectModalProps {
  levels: LevelData[];
  currentLevelId: number;
  completedLevels: Set<number>;
  onSelectLevel: (levelId: number) => void;
  onClose: () => void;
}

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  levels,
  currentLevelId,
  completedLevels,
  onSelectLevel,
  onClose
}) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');

  const filteredLevels = selectedDifficulty === 'All'
    ? levels
    : levels.filter(lvl => lvl.difficulty === selectedDifficulty);

  const difficultyColors: Record<string, string> = {
    Easy: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60',
    Medium: 'text-amber-400 bg-amber-950/60 border-amber-800/60',
    Hard: 'text-rose-400 bg-rose-950/60 border-rose-800/60',
    Expert: 'text-purple-400 bg-purple-950/60 border-purple-800/60'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 select-none">
      <div className="w-full max-w-2xl max-h-[85vh] rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
              <Unlock size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">
                SELECT LEVEL
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>ALL 32 LEVELS UNLOCKED</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="px-5 py-3 border-b border-slate-800/80 bg-slate-900/60 flex items-center gap-2 overflow-x-auto">
          {['All', 'Easy', 'Medium', 'Hard', 'Expert'].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                sound.playClick();
                setSelectedDifficulty(tab);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedDifficulty === tab
                  ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Levels Grid (Scrollable) */}
        <div className="p-5 overflow-y-auto flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filteredLevels.map((lvl) => {
            const isCurrent = lvl.id === currentLevelId;
            const isCompleted = completedLevels.has(lvl.id);

            return (
              <button
                key={lvl.id}
                onClick={() => {
                  sound.playClick();
                  onSelectLevel(lvl.id);
                  onClose();
                }}
                className={`relative p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer group ${
                  isCurrent
                    ? 'bg-pink-950/60 border-pink-500 ring-2 ring-pink-500/50 shadow-lg shadow-pink-500/20'
                    : 'bg-slate-800/70 hover:bg-slate-800 border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <span className="text-lg font-black text-white font-mono">
                    #{lvl.id}
                  </span>
                  <div className="flex items-center gap-1">
                    {isCompleted && (
                      <CheckCircle2 size={16} className="text-emerald-400" />
                    )}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        difficultyColors[lvl.difficulty] || 'text-slate-300'
                      }`}
                    >
                      {lvl.difficulty}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-auto pt-1">
                  <span className="text-xs font-semibold text-slate-300 truncate max-w-[95px]">
                    {lvl.name}
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-pink-600/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play size={12} className="fill-white" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
          <span>Click any level to jump straight into it!</span>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors cursor-pointer"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
};
