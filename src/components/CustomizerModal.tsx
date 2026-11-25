import React from 'react';
import { X, Check, Sparkles } from 'lucide-react';
import { BallSkin, ColorTheme } from '../game/types';
import { COLOR_THEMES } from '../game/levels';
import { sound } from '../game/audio';

interface CustomizerModalProps {
  currentTheme: ColorTheme;
  currentSkin: BallSkin;
  onSelectTheme: (theme: ColorTheme) => void;
  onSelectSkin: (skin: BallSkin) => void;
  onClose: () => void;
}

const BALL_SKINS: { id: BallSkin; name: string; desc: string; icon: string }[] = [
  { id: 'classic', name: 'Classic Roller', desc: 'Cute anime eyes roller ball', icon: '👀' },
  { id: 'star', name: 'Star Crest', desc: 'Golden geometric star crown', icon: '⭐' },
  { id: 'donut', name: 'Torus Ring', desc: 'Saturn-style orbit roller', icon: '🪐' },
  { id: 'stripes', name: 'Twin Stripes', desc: 'Dual dynamic speed rings', icon: '⚡' },
  { id: 'gem', name: 'Crystal Gem', desc: 'Faceted crystalline core', icon: '💎' },
];

export const CustomizerModal: React.FC<CustomizerModalProps> = ({
  currentTheme,
  currentSkin,
  onSelectTheme,
  onSelectSkin,
  onClose
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 select-none">
      <div className="w-full max-w-lg max-h-[85vh] rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center border border-pink-500/40">
              <Sparkles size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">
                CUSTOMIZER
              </h2>
              <span className="text-xs text-slate-400 font-medium">
                Choose paint palette and ball skin
              </span>
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

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-6">
          {/* Section 1: Color Themes */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Paint & Maze Color Palette
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {COLOR_THEMES.map((thm) => {
                const isSelected = thm.id === currentTheme.id;
                return (
                  <button
                    key={thm.id}
                    onClick={() => {
                      sound.playClick();
                      onSelectTheme(thm);
                    }}
                    className={`p-3 rounded-2xl border text-left flex flex-col gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800 border-pink-500 ring-2 ring-pink-500/40'
                        : 'bg-slate-850 hover:bg-slate-800 border-slate-750'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-5 h-5 rounded-full shadow-inner border border-white/20"
                          style={{ backgroundColor: thm.paintColor }}
                        />
                        <div
                          className="w-4 h-4 rounded-full border border-white/10"
                          style={{ backgroundColor: thm.wallColor }}
                        />
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-pink-600 text-white flex items-center justify-center">
                          <Check size={12} />
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-bold text-slate-200">
                      {thm.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Ball Skins */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Ball Model & Accessories
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {BALL_SKINS.map((sk) => {
                const isSelected = sk.id === currentSkin;
                return (
                  <button
                    key={sk.id}
                    onClick={() => {
                      sound.playClick();
                      onSelectSkin(sk.id);
                    }}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800 border-pink-500 ring-2 ring-pink-500/40'
                        : 'bg-slate-850 hover:bg-slate-800 border-slate-750'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-xl shrink-0">
                      {sk.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white truncate">
                          {sk.name}
                        </span>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-pink-600 text-white flex items-center justify-center shrink-0">
                            <Check size={10} />
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        {sk.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold text-xs shadow-md transition-transform active:scale-95 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
