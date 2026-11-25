import React from 'react';
import { X, Music, Volume2, Check } from 'lucide-react';
import {
  SOUND_PRESETS,
  SoundPresetId,
  amazeGoAudio,
} from '../game/amazeGoAudio';

interface SoundPickerModalProps {
  isOpen: boolean;
  selectedPreset: SoundPresetId;
  onSelectPreset: (preset: SoundPresetId) => void;
  onClose: () => void;
}

export const SoundPickerModal: React.FC<SoundPickerModalProps> = ({
  isOpen,
  selectedPreset,
  onSelectPreset,
  onClose,
}) => {
  if (!isOpen) return null;

  const handlePick = (id: SoundPresetId) => {
    amazeGoAudio.setMuted(false);
    onSelectPreset(id);
    amazeGoAudio.playArrowEscape(id);
  };

  const handleTestBlocked = (e: React.MouseEvent, id: SoundPresetId) => {
    e.stopPropagation();
    amazeGoAudio.setMuted(false);
    amazeGoAudio.playBlocked(id);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/45 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Arrow Sound Styles"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-[#fbf6ea] text-[#5c4b37] rounded-3xl p-4 sm:p-6 shadow-2xl border border-[#e0d2b8] max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#e6d9c0]">
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5 text-[#7c3aed]" />
            <div>
              <h2 className="text-base sm:text-lg font-black text-[#3f3122]">
                Arrow Sound Styles ({SOUND_PRESETS.length})
              </h2>
              <p className="text-[11px] font-semibold text-[#8c7a64]">
                মন মুগ্ধকর ২০টি নতুন সাউন্ড — ট্যাপ করে শুনে সেট করুন
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              amazeGoAudio.playClick();
              onClose();
            }}
            className="p-2 rounded-2xl bg-[#efe4ce] text-[#6b563c] hover:bg-[#e5d5b7] active:scale-95 transition-all"
            aria-label="Close Sound Picker"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-3 grid grid-cols-1 sm:grid-cols-2 gap-2 pr-1">
          {SOUND_PRESETS.map((preset) => {
            const isSelected = preset.id === selectedPreset;
            return (
              <div
                key={preset.id}
                data-testid={`sound-preset-${preset.id}`}
                className={`w-full flex items-center justify-between gap-2 p-2.5 rounded-2xl border-2 transition-all ${
                  isSelected
                    ? 'bg-white border-[#7c3aed] shadow-md'
                    : 'bg-white/75 border-[#e4d6bb] hover:border-[#b9a37e] hover:bg-white'
                }`}
              >
                <button
                  type="button"
                  onClick={() => handlePick(preset.id)}
                  className="flex-1 flex items-center gap-2.5 text-left min-w-0 active:scale-[0.99] transition-transform"
                  aria-label={`Select and test ${preset.name}`}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                    style={{ backgroundColor: preset.accent }}
                  >
                    <Volume2 className="w-4 h-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-xs font-black text-[#3f3122] truncate">
                        {preset.name}
                      </span>
                      <span className="text-[10px] font-bold text-[#7c6951] truncate">
                        ({preset.bnName})
                      </span>
                    </div>
                    <p className="text-[10px] font-medium text-[#8c7a64] truncate">
                      {preset.description}
                    </p>
                  </div>

                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      isSelected
                        ? 'bg-[#7c3aed] text-white shadow-sm'
                        : 'bg-[#efe4ce] text-[#8c7a64]'
                    }`}
                  >
                    {isSelected ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Volume2 className="w-3 h-3" />
                    )}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={(e) => handleTestBlocked(e, preset.id)}
                  className="px-2 py-1.5 rounded-xl bg-[#f3e9d3] hover:bg-[#e8dac0] text-[10px] font-bold text-[#6b563c] shrink-0 transition-all active:scale-95"
                  title="Test Soft Blocked Tap"
                  aria-label={`Test blocked bump sound for ${preset.name}`}
                >
                  Bump
                </button>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => {
            amazeGoAudio.playClick();
            onClose();
          }}
          className="w-full mt-2 py-3 rounded-2xl bg-[#6b563c] hover:bg-[#574530] text-white font-extrabold text-xs shadow-md active:scale-95 transition-all"
        >
          Done (Use Selected Sound)
        </button>
      </div>
    </div>
  );
};
