import React, { useState } from 'react';
import {
  ArrowLeft,
  Volume2,
  Music,
  Grid3X3,
  User,
  ThumbsUp,
  Headset,
  FileText,
  FileCheck2,
  ChevronRight,
  Play,
  Star,
  Check,
  X,
  Send,
  Palette,
  LayoutGrid,
  HelpCircle,
  Users,
} from 'lucide-react';
import {
  SOUND_PRESETS,
  SoundPresetId,
  BACKGROUND_MUSIC_TRACKS,
  MusicTrackId,
  amazeGoAudio,
} from '../game/amazeGoAudio';
import { LEVEL_MONOCHROME_COLORS, PURE_BLACK_COLOR } from '../game/amazeGoGenerator';

interface SettingsModalProps {
  isOpen: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  musicEnabled: boolean;
  guidelineEnabled: boolean;
  soundPreset: SoundPresetId;
  musicTrack: MusicTrackId;
  customArrowColor: string | null;
  isSignedIn: boolean;
  isAdmin?: boolean;
  displayName: string;
  onToggleSound: () => void;
  onToggleVibration: () => void;
  onToggleMusic: () => void;
  onToggleGuideline: () => void;
  onChangeMusicTrack: (track: MusicTrackId) => void;
  onSelectArrowColor: (color: string | null) => void;
  onOpenSoundPicker: () => void;
  onOpenLevelSelect: () => void;
  onOpenProfile: () => void;
  onOpenAdminPanel?: () => void;
  onClose: () => void;
}

type InfoSheet = 'music' | 'color' | 'howto' | 'rate' | 'feedback' | 'privacy' | 'terms' | null;

function SettingsSwitch({
  checked,
  label,
  onToggle,
}: {
  checked: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => {
        amazeGoAudio.playClick();
        onToggle();
      }}
      className={`relative inline-flex h-[28px] w-[50px] shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0c7b88]/50 ${
        checked ? 'bg-[#0c7b88]' : 'bg-[#9ca3af]'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-[22px] w-[22px] transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-[25px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  );
}

/**
 * Custom crisp SVG icons matching the attached reference screenshot for Vibration & Voice
 */
function VibrationIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="7" y="4" width="10" height="16" rx="2" />
      <path d="M3.5 8l-1 1.5 1 1.5-1 1.5 1 1.5" />
      <path d="M20.5 8l1 1.5-1 1.5 1 1.5-1 1.5" />
    </svg>
  );
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  soundEnabled,
  vibrationEnabled,
  musicEnabled,
  guidelineEnabled,
  soundPreset,
  musicTrack,
  customArrowColor,
  isSignedIn,
  isAdmin = false,
  displayName,
  onToggleSound,
  onToggleVibration,
  onToggleMusic,
  onToggleGuideline,
  onChangeMusicTrack,
  onSelectArrowColor,
  onOpenSoundPicker,
  onOpenLevelSelect,
  onOpenProfile,
  onOpenAdminPanel,
  onClose,
}) => {
  const [activeSheet, setActiveSheet] = useState<InfoSheet>(null);
  const [ratingStars, setRatingStars] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem('amazego_user_rating') || '5');
      return saved >= 1 && saved <= 5 ? saved : 5;
    } catch {
      return 5;
    }
  });
  const [ratingSaved, setRatingSaved] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);

  if (!isOpen) return null;

  const activePresetInfo =
    SOUND_PRESETS.find((p) => p.id === soundPreset) || SOUND_PRESETS[0];
  const activeMusicInfo =
    BACKGROUND_MUSIC_TRACKS.find((t) => t.id === musicTrack) ||
    BACKGROUND_MUSIC_TRACKS[0];

  const handleSubmitRating = () => {
    amazeGoAudio.playPraise();
    try {
      localStorage.setItem('amazego_user_rating', String(ratingStars));
    } catch {
      // Ignore
    }
    setRatingSaved(true);
    setTimeout(() => {
      setRatingSaved(false);
      setActiveSheet(null);
    }, 1100);
  };

  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;
    amazeGoAudio.playClick();
    try {
      const prev = JSON.parse(localStorage.getItem('amazego_feedback_log') || '[]');
      localStorage.setItem(
        'amazego_feedback_log',
        JSON.stringify([...prev, { text: feedbackText.trim(), at: Date.now() }])
      );
    } catch {
      // Ignore
    }
    setFeedbackSent(true);
    setFeedbackText('');
    setTimeout(() => {
      setFeedbackSent(false);
      setActiveSheet(null);
    }, 1200);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-[#d8f3e4] via-[#dff5e9] to-[#d2efe0] text-[#243b2f] overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col px-4 pt-3 pb-6">
        {/* Top Back Header */}
        <header className="flex items-center gap-3 pb-3.5">
          <button
            type="button"
            onClick={() => {
              amazeGoAudio.playClick();
              onClose();
            }}
            className="p-2 -ml-2 rounded-full text-[#243b2f] hover:bg-black/5 active:scale-95 transition-all"
            aria-label="Back from Settings"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-[21px] font-bold tracking-tight text-[#1e352a]">
            Settings
          </h1>
        </header>

        <div className="space-y-3">
          {/* Card 1: Core Toggles matching screenshot order */}
          <section className="bg-white rounded-[20px] shadow-[0_2px_12px_rgba(16,45,32,0.05)] px-4 py-0.5 divide-y divide-[#eef3f0]">
            {/* Sound */}
            <div className="flex items-center justify-between py-3 gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                <Volume2 className="w-[21px] h-[21px] text-[#6d7c75] shrink-0" strokeWidth={1.75} />
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="text-[15px] font-medium text-[#3c4a43]">
                    Sound
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      amazeGoAudio.playClick();
                      onOpenSoundPicker();
                    }}
                    className="px-2 py-0.5 rounded-full bg-[#e8f6f7] text-[#0c7b88] text-[11px] font-bold hover:bg-[#d7eff1] active:scale-95 transition-all"
                    aria-label="Change Arrow Sound Style"
                  >
                    {activePresetInfo.name} ▾
                  </button>
                </div>
              </div>
              <SettingsSwitch
                checked={soundEnabled}
                label="Toggle Sound"
                onToggle={onToggleSound}
              />
            </div>

            {/* Vibration */}
            <div className="flex items-center justify-between py-3 gap-3">
              <div className="flex items-center gap-3.5 text-[#6d7c75]">
                <VibrationIcon />
                <span className="text-[15px] font-medium text-[#3c4a43]">
                  Vibration
                </span>
              </div>
              <SettingsSwitch
                checked={vibrationEnabled}
                label="Toggle Vibration"
                onToggle={onToggleVibration}
              />
            </div>

            {/* Music */}
            <div className="flex items-center justify-between py-3 gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                <Music className="w-[21px] h-[21px] text-[#6d7c75] shrink-0" strokeWidth={1.75} />
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="text-[15px] font-medium text-[#3c4a43]">
                    Music
                  </span>
                  <button
                    type="button"
                    data-testid="music-picker-button"
                    onClick={() => {
                      amazeGoAudio.playClick();
                      setActiveSheet('music');
                    }}
                    className="px-2 py-0.5 rounded-full bg-[#e6f7ef] text-[#059669] text-[11px] font-bold hover:bg-[#d1f0e1] active:scale-95 transition-all"
                    aria-label="Choose Background Music Track"
                  >
                    {activeMusicInfo.name} ▾
                  </button>
                </div>
              </div>
              <SettingsSwitch
                checked={musicEnabled}
                label="Toggle Music"
                onToggle={onToggleMusic}
              />
            </div>

            {/* Guideline */}
            <div className="flex items-center justify-between py-3 gap-3">
              <div className="flex items-center gap-3.5">
                <Grid3X3 className="w-[21px] h-[21px] text-[#6d7c75] shrink-0" strokeWidth={1.75} />
                <span className="text-[15px] font-medium text-[#3c4a43]">
                  Guideline
                </span>
              </div>
              <SettingsSwitch
                checked={guidelineEnabled}
                label="Toggle Guideline"
                onToggle={onToggleGuideline}
              />
            </div>
          </section>

          {/* Card 2: Save Your Progress, Levels, Arrow Color & How to Play */}
          <section className="bg-white rounded-[20px] shadow-[0_2px_12px_rgba(16,45,32,0.05)] px-4 divide-y divide-[#eef3f0]">
            <button
              type="button"
              onClick={() => {
                amazeGoAudio.playClick();
                onOpenProfile();
              }}
              className="w-full flex items-center justify-between py-3 text-left hover:opacity-85 active:scale-[0.99] transition-all"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <User className="w-[21px] h-[21px] text-[#6d7c75] shrink-0" strokeWidth={1.75} />
                <div className="min-w-0">
                  <span className="text-[15px] font-medium text-[#3c4a43] block">
                    Save Your Progress
                  </span>
                  {isSignedIn && (
                    <span className="text-[11px] font-semibold text-[#0c7b88] truncate block">
                      Synced: {displayName}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#6d7c75] shrink-0" />
            </button>

            {isAdmin && onOpenAdminPanel && (
              <button
                type="button"
                onClick={() => {
                  amazeGoAudio.playClick();
                  onClose();
                  onOpenAdminPanel();
                }}
                className="w-full flex items-center justify-between py-3 text-left hover:opacity-85 active:scale-[0.99] transition-all"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <Users className="w-[21px] h-[21px] text-emerald-700 shrink-0" strokeWidth={1.75} />
                  <div className="min-w-0">
                    <span className="text-[15px] font-bold text-emerald-800 block">
                      Admin: Users &amp; Unlimited Mode
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-700/80 block">
                      লগইন সংখ্যা দেখুন ও আনলিমিটেড পারমিশন দিন
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-emerald-700 shrink-0" />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                amazeGoAudio.playClick();
                onClose();
                onOpenLevelSelect();
              }}
              className="w-full flex items-center justify-between py-3 text-left hover:opacity-85 active:scale-[0.99] transition-all"
            >
              <div className="flex items-center gap-3.5">
                <LayoutGrid className="w-[21px] h-[21px] text-[#6d7c75] shrink-0" strokeWidth={1.75} />
                <span className="text-[15px] font-medium text-[#3c4a43]">
                  Levels (1–500)
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-[#6d7c75] shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => {
                amazeGoAudio.playClick();
                setActiveSheet('color');
              }}
              className="w-full flex items-center justify-between py-3 text-left hover:opacity-85 active:scale-[0.99] transition-all"
            >
              <div className="flex items-center gap-3.5">
                <Palette className="w-[21px] h-[21px] text-[#6d7c75] shrink-0" strokeWidth={1.75} />
                <span className="text-[15px] font-medium text-[#3c4a43]">
                  Arrow Color
                </span>
                <span
                  className="w-4 h-4 rounded-full border border-[#cbd5e1] shrink-0"
                  style={{ backgroundColor: customArrowColor || PURE_BLACK_COLOR }}
                />
              </div>
              <ChevronRight className="w-5 h-5 text-[#6d7c75] shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => {
                amazeGoAudio.playClick();
                setActiveSheet('howto');
              }}
              className="w-full flex items-center justify-between py-3 text-left hover:opacity-85 active:scale-[0.99] transition-all"
            >
              <div className="flex items-center gap-3.5">
                <HelpCircle className="w-[21px] h-[21px] text-[#6d7c75] shrink-0" strokeWidth={1.75} />
                <span className="text-[15px] font-medium text-[#3c4a43]">
                  How to Play
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-[#6d7c75] shrink-0" />
            </button>
          </section>

          {/* Card 3: Rate Us & Feedback */}
          <section className="bg-white rounded-[20px] shadow-[0_2px_12px_rgba(16,45,32,0.05)] px-4 divide-y divide-[#eef3f0]">
            <button
              type="button"
              onClick={() => {
                amazeGoAudio.playClick();
                setActiveSheet('rate');
              }}
              className="w-full flex items-center justify-between py-3 text-left hover:opacity-85 active:scale-[0.99] transition-all"
            >
              <div className="flex items-center gap-3.5">
                <ThumbsUp className="w-[21px] h-[21px] text-[#6d7c75] shrink-0" strokeWidth={1.75} />
                <span className="text-[15px] font-medium text-[#3c4a43]">
                  Rate Us
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-[#6d7c75] shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => {
                amazeGoAudio.playClick();
                setActiveSheet('feedback');
              }}
              className="w-full flex items-center justify-between py-3 text-left hover:opacity-85 active:scale-[0.99] transition-all"
            >
              <div className="flex items-center gap-3.5">
                <Headset className="w-[21px] h-[21px] text-[#6d7c75] shrink-0" strokeWidth={1.75} />
                <span className="text-[15px] font-medium text-[#3c4a43]">
                  Feedback
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-[#6d7c75] shrink-0" />
            </button>
          </section>

          {/* Card 4: Privacy Policy & Terms of Service */}
          <section className="bg-white rounded-[20px] shadow-[0_2px_12px_rgba(16,45,32,0.05)] px-4 divide-y divide-[#eef3f0]">
            <button
              type="button"
              onClick={() => {
                amazeGoAudio.playClick();
                setActiveSheet('privacy');
              }}
              className="w-full flex items-center justify-between py-3 text-left hover:opacity-85 active:scale-[0.99] transition-all"
            >
              <div className="flex items-center gap-3.5">
                <FileText className="w-[21px] h-[21px] text-[#6d7c75] shrink-0" strokeWidth={1.75} />
                <span className="text-[15px] font-medium text-[#3c4a43]">
                  Privacy Policy
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-[#6d7c75] shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => {
                amazeGoAudio.playClick();
                setActiveSheet('terms');
              }}
              className="w-full flex items-center justify-between py-3 text-left hover:opacity-85 active:scale-[0.99] transition-all"
            >
              <div className="flex items-center gap-3.5">
                <FileCheck2 className="w-[21px] h-[21px] text-[#6d7c75] shrink-0" strokeWidth={1.75} />
                <span className="text-[15px] font-medium text-[#3c4a43]">
                  Terms of Service
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-[#6d7c75] shrink-0" />
            </button>
          </section>
        </div>
      </div>

      {/* Sub-modal for AI Voice Studio / Rate Us / Feedback / Privacy / Terms */}
      {activeSheet && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          onClick={() => setActiveSheet(null)}
        >
          <div
            className="w-full max-w-sm bg-white text-[#243b2f] rounded-3xl p-4 sm:p-5 shadow-2xl border border-[#d6ede0] max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {activeSheet === 'music' && (
              <div>
                <div className="flex items-center justify-between pb-2.5 border-b border-[#eaf3ee]">
                  <div className="flex items-center gap-2">
                    <Music className="w-5 h-5 text-[#059669]" />
                    <div>
                      <h2 className="text-base font-black text-[#1e352a]">
                        Background Music ({BACKGROUND_MUSIC_TRACKS.length} Tracks · 30s+)
                      </h2>
                      <p className="text-[11px] font-medium text-[#5f7268]">
                        দীর্ঘ ৩০+ সেকেন্ডের প্রশান্তিময় মিউজিক — ট্যাপ করে সেট করুন
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      amazeGoAudio.playClick();
                      setActiveSheet(null);
                    }}
                    className="p-1.5 rounded-full bg-[#f0f6f3] text-[#4d6257]"
                    aria-label="Close Music Picker"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  {BACKGROUND_MUSIC_TRACKS.map((track) => {
                    const selected = track.id === musicTrack;
                    return (
                      <button
                        key={track.id}
                        type="button"
                        data-testid={`music-track-${track.id}`}
                        onClick={() => {
                          amazeGoAudio.playClick();
                          onChangeMusicTrack(track.id);
                        }}
                        className={`flex items-center justify-between p-2 rounded-2xl border-2 text-left transition-all ${
                          selected
                            ? 'border-[#059669] bg-[#eefaf4]'
                            : 'border-[#e7efe9] bg-[#fafcfb] hover:border-[#a7e3c4]'
                        }`}
                      >
                        <div className="min-w-0 pr-1">
                          <div className="flex items-center gap-1">
                            <p className="text-xs font-extrabold text-[#1e352a] truncate">
                              {track.name}
                            </p>
                            <span className="text-[9px] font-black text-[#059669] shrink-0">
                              {track.durationSeconds}s
                            </span>
                          </div>
                          <p className="text-[10px] font-semibold text-[#059669] truncate">
                            {track.bnName}
                          </p>
                          <p className="text-[9px] font-medium text-[#75857c] truncate">
                            {track.description}
                          </p>
                        </div>
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-white ${
                            selected ? 'bg-[#059669]' : 'bg-[#e9eef0] text-[#6d7c75]'
                          }`}
                        >
                          {selected ? <Check className="w-3 h-3" /> : <Play className="w-2.5 h-2.5" />}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    amazeGoAudio.playClick();
                    setActiveSheet(null);
                  }}
                  className="w-full mt-4 py-2.5 rounded-2xl bg-[#0c7b88] text-white font-bold text-xs shadow-sm"
                >
                  Done (Use {activeMusicInfo.name})
                </button>
              </div>
            )}

            {activeSheet === 'rate' && (
              <div className="text-center">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      amazeGoAudio.playClick();
                      setActiveSheet(null);
                    }}
                    className="p-1.5 rounded-full bg-[#f0f6f3] text-[#4d6257]"
                    aria-label="Close Rate Us"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <h2 className="text-lg font-black text-[#1e352a]">
                  Rate Brain Faster
                </h2>
                <p className="text-xs text-[#64746b] mt-1">
                  খেলাটি আপনার কেমন লাগছে? রেটিং দিন!
                </p>
                <div className="flex items-center justify-center gap-2 my-4">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => {
                        amazeGoAudio.playClick();
                        setRatingStars(n);
                      }}
                      className="p-1 active:scale-90 transition-transform"
                      aria-label={`Rate ${n} stars`}
                    >
                      <Star
                        className={`w-8 h-8 ${
                          n <= ratingStars
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-[#d1dbd5]'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {ratingSaved ? (
                  <p className="text-xs font-bold text-[#0c7b88] py-2">
                    ধন্যবাদ! আপনার {ratingStars}★ রেটিং সেভ হয়েছে।
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmitRating}
                    className="w-full py-2.5 rounded-2xl bg-[#0c7b88] text-white font-bold text-xs shadow-sm"
                  >
                    Submit {ratingStars} Stars
                  </button>
                )}
              </div>
            )}

            {activeSheet === 'feedback' && (
              <form onSubmit={handleSubmitFeedback}>
                <div className="flex items-center justify-between pb-2">
                  <h2 className="text-base font-black text-[#1e352a]">
                    Send Feedback
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      amazeGoAudio.playClick();
                      setActiveSheet(null);
                    }}
                    className="p-1.5 rounded-full bg-[#f0f6f3] text-[#4d6257]"
                    aria-label="Close Feedback"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-[#64746b] mb-3">
                  আপনার মতামত বা পরামর্শ লিখুন — Habib Gaming টিম এটি গুরুত্ব দিয়ে দেখবে।
                </p>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  rows={4}
                  placeholder="Write your feedback..."
                  className="w-full rounded-2xl border border-[#d6e5dc] p-3 text-xs text-[#243b2f] focus:outline-none focus:border-[#0c7b88]"
                />
                {feedbackSent ? (
                  <p className="text-xs font-bold text-[#0c7b88] text-center py-2">
                    ধন্যবাদ! আপনার মতামত গ্রহণ করা হয়েছে।
                  </p>
                ) : (
                  <button
                    type="submit"
                    className="w-full mt-3 py-2.5 rounded-2xl bg-[#0c7b88] text-white font-bold text-xs flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Feedback</span>
                  </button>
                )}
              </form>
            )}

            {activeSheet === 'privacy' && (
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-[#eaf3ee]">
                  <h2 className="text-base font-black text-[#1e352a]">
                    Privacy Policy
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      amazeGoAudio.playClick();
                      setActiveSheet(null);
                    }}
                    className="p-1.5 rounded-full bg-[#f0f6f3] text-[#4d6257]"
                    aria-label="Close Privacy Policy"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-xs text-[#4d6257] space-y-2 mt-3 leading-relaxed">
                  <p>
                    <strong>Brain Faster (Habib Gaming)</strong> stores your game
                    progress, sound/music preferences, and level speed records locally
                    and, if you choose to sign in with Google, syncs your profile
                    name, avatar, and best times securely via Firebase Firestore.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    amazeGoAudio.playClick();
                    setActiveSheet(null);
                  }}
                  className="w-full mt-4 py-2.5 rounded-2xl bg-[#0c7b88] text-white font-bold text-xs"
                >
                  Close
                </button>
              </div>
            )}

            {activeSheet === 'color' && (
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#eaf3ee]">
                  <div className="flex items-center gap-2">
                    <Palette className="w-5 h-5 text-[#0c7b88]" />
                    <h2 className="text-base font-black text-[#1e352a]">
                      Arrow Color
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      amazeGoAudio.playClick();
                      setActiveSheet(null);
                    }}
                    className="p-1.5 rounded-full bg-[#f0f6f3] text-[#4d6257]"
                    aria-label="Close Arrow Color Picker"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-[#5f7268] mt-3 mb-3">
                  তীরগুলোর পছন্দের রঙ বেছে নিন:
                </p>
                <div className="flex items-center gap-2.5 flex-wrap">
                  {[
                    PURE_BLACK_COLOR,
                    ...LEVEL_MONOCHROME_COLORS.filter((c) => c !== PURE_BLACK_COLOR),
                  ].map((clr) => (
                    <button
                      key={clr}
                      type="button"
                      onClick={() => {
                        amazeGoAudio.playClick();
                        onSelectArrowColor(clr);
                      }}
                      className={`w-9 h-9 rounded-full border-2 transition-transform hover:scale-110 ${
                        customArrowColor === clr
                          ? 'border-[#0c7b88] scale-110 ring-2 ring-[#0c7b88]/30'
                          : 'border-[#e2e8f0]'
                      }`}
                      style={{ backgroundColor: clr }}
                      aria-label={`Select arrow color ${clr}`}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      amazeGoAudio.playClick();
                      onSelectArrowColor(null);
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border ${
                      customArrowColor === null
                        ? 'bg-[#0c7b88] text-white border-[#0c7b88]'
                        : 'bg-[#f0f6f3] text-[#243b2f] border-[#d6e5dc]'
                    }`}
                  >
                    Level Default
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    amazeGoAudio.playClick();
                    setActiveSheet(null);
                  }}
                  className="w-full mt-5 py-2.5 rounded-2xl bg-[#0c7b88] text-white font-bold text-xs"
                >
                  Done
                </button>
              </div>
            )}

            {activeSheet === 'howto' && (
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-[#eaf3ee]">
                  <div>
                    <h2 className="text-base font-black text-[#1e352a]">
                      How to Play Brain Faster
                    </h2>
                    <p className="text-[11px] font-bold text-[#0c7b88]">
                      Habib Gaming
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      amazeGoAudio.playClick();
                      setActiveSheet(null);
                    }}
                    className="p-1.5 rounded-full bg-[#f0f6f3] text-[#4d6257]"
                    aria-label="Close How to Play"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2.5 text-xs font-medium mt-3 text-[#3c4a43]">
                  <div className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-[#eef8f2]">
                    <span className="w-5 h-5 rounded-full bg-[#18181b] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                      1
                    </span>
                    <p>
                      <strong>Step-by-Step Unlock:</strong> Level 1 জিতলে Level 2 ওপেন হবে—এভাবে একটার পর একটা আনলক হবে। অ্যাডমিন ইমেইল দিয়ে লগইন করলে সব ৫০০ লেভেল আনলক থাকবে!
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-[#eef8f2]">
                    <span className="w-5 h-5 rounded-full bg-[#0284c7] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                      2
                    </span>
                    <p>
                      <strong>7 Ranks &amp; Soothing Audio:</strong> যত বেশি লেভেল কমপ্লিট করবেন, Bronze থেকে Crown পর্যন্ত র‍্যাঙ্ক বাড়বে এবং পছন্দের ন্যাচারাল মিউজিক ও তীরের সাউন্ড উপভোগ করতে পারবেন।
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-[#eef8f2]">
                    <span className="w-5 h-5 rounded-full bg-[#993b3b] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                      3
                    </span>
                    <p>
                      <strong>Google Sync &amp; Speed Records:</strong> গুগল দিয়ে সাইন-ইন করলে নাম/ছবি এডিট করতে পারবেন এবং প্রতিটি লেভেলের ১ম/২য়/৩য় স্পিড রেকর্ড সেভ হবে।
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    amazeGoAudio.playClick();
                    setActiveSheet(null);
                  }}
                  className="w-full mt-4 py-2.5 rounded-2xl bg-[#0c7b88] text-white font-bold text-xs"
                >
                  Got it, Let&apos;s Play!
                </button>
              </div>
            )}

            {activeSheet === 'terms' && (
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-[#eaf3ee]">
                  <h2 className="text-base font-black text-[#1e352a]">
                    Terms of Service
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      amazeGoAudio.playClick();
                      setActiveSheet(null);
                    }}
                    className="p-1.5 rounded-full bg-[#f0f6f3] text-[#4d6257]"
                    aria-label="Close Terms of Service"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-xs text-[#4d6257] space-y-2 mt-3 leading-relaxed">
                  <p>
                    Brain Faster is created by <strong>Habib Gaming</strong> for
                    personal entertainment and puzzle mastery across 500 handcrafted &amp;
                    procedural levels.
                  </p>
                  <p>
                    Leaderboard rankings reflect verified completion counts and fastest
                    clear times. Please use respectful display names on public charts.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    amazeGoAudio.playClick();
                    setActiveSheet(null);
                  }}
                  className="w-full mt-4 py-2.5 rounded-2xl bg-[#0c7b88] text-white font-bold text-xs"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
