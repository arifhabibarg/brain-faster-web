import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  LogIn,
  LogOut,
  Camera,
  Check,
  ShieldCheck,
  Award,
  User as UserIcon,
  RotateCcw,
  ExternalLink,
  Users,
  Infinity as InfinityIcon,
  Lock,
} from 'lucide-react';
import { RANK_TIERS, TOTAL_GAME_LEVELS, getRankTier } from '../game/playerProgression';
import { amazeGoAudio } from '../game/amazeGoAudio';
import { isInsideIframe } from '../firebase';

interface PlayerAuthProfileModalProps {
  isOpen: boolean;
  isSignedIn: boolean;
  isAdmin: boolean;
  canPlayUnlimited: boolean;
  isAuthLoading: boolean;
  email: string | null;
  displayName: string;
  photoUrl: string;
  googlePhotoUrl: string | null;
  completedCount: number;
  highestUnlockedLevel: number;
  authError: string | null;
  authErrorCode?: string | null;
  onGoogleLogin: () => Promise<void>;
  onGoogleRedirectLogin?: () => Promise<void>;
  onSaveProfile: (name: string, photoUrl: string) => Promise<void>;
  onSignOut: () => Promise<void>;
  onOpenAdminPanel?: () => void;
  onClose: () => void;
}

/**
 * Resizes an uploaded image file to a crisp 160x160 JPEG data URL (<= 50KB)
 * so it stores cleanly inside Firestore without external storage buckets.
 */
async function compressAvatarFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file'));
      img.onload = () => {
        const size = 160;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas unavailable'));
          return;
        }
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        let quality = 0.78;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        while (dataUrl.length > 72000 && quality > 0.35) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(dataUrl);
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

export const PlayerAuthProfileModal: React.FC<PlayerAuthProfileModalProps> = ({
  isOpen,
  isSignedIn,
  isAdmin,
  canPlayUnlimited,
  isAuthLoading,
  email,
  displayName,
  photoUrl,
  googlePhotoUrl,
  completedCount,
  highestUnlockedLevel,
  authError,
  authErrorCode,
  onGoogleLogin,
  onGoogleRedirectLogin,
  onSaveProfile,
  onSignOut,
  onOpenAdminPanel,
  onClose,
}) => {
  const [draftName, setDraftName] = useState(displayName);
  const [draftPhoto, setDraftPhoto] = useState(photoUrl);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDraftName(displayName);
      setDraftPhoto(photoUrl);
      setLocalError(null);
      setSavedNotice(false);
    }
  }, [isOpen, displayName, photoUrl]);

  if (!isOpen) return null;

  const tier = getRankTier(completedCount);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLocalError(null);
    try {
      const compressed = await compressAvatarFile(file);
      setDraftPhoto(compressed);
      amazeGoAudio.playClick();
    } catch {
      setLocalError('ছবি প্রসেস করা যায়নি—অন্য একটি ছোট ছবি নির্বাচন করুন।');
    }
  };

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = draftName.trim();
    if (!cleaned) {
      setLocalError('দয়া করে আপনার নাম লিখুন।');
      return;
    }
    setLocalError(null);
    setSaving(true);
    try {
      amazeGoAudio.playClick();
      await onSaveProfile(cleaned, draftPhoto);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2200);
    } catch {
      setLocalError('প্রোফাইল সেভ করা যায়নি। আবার চেষ্টা করুন।');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Player Profile"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-[#fbf6ea] text-[#5c4b37] rounded-3xl p-5 sm:p-6 shadow-2xl border border-[#e0d2b8] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#e6d9c0]">
          <div className="flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-[#1d4ed8]" />
            <h2 className="text-lg font-black text-[#3f3122]">
              {isSignedIn ? 'Player Profile & Rank' : 'Google Account Sync'}
            </h2>
          </div>
          <button
            onClick={() => {
              amazeGoAudio.playClick();
              onClose();
            }}
            className="p-2 rounded-2xl bg-[#efe4ce] text-[#6b563c] hover:bg-[#e5d5b7] active:scale-95 transition-all"
            aria-label="Close Profile"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!isSignedIn ? (
          <div className="py-5 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-3xl bg-[#1d4ed8]/10 border border-[#1d4ed8]/25 flex items-center justify-center">
              <LogIn className="w-8 h-8 text-[#1d4ed8]" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-black text-[#3f3122]">
                Google ID দিয়ে লগইন করুন
              </h3>
              <p className="text-xs font-medium text-[#7c6951] leading-relaxed">
                আপনার ইমেইল সিঙ্ক হলে নাম ও প্রোফাইল ছবি সেট করতে পারবেন, সব লেভেলের সময় ও ১ম/২য় রেকর্ড সেভ থাকবে, আর অ্যাডমিন ইমেইল হলে সব ৫০০ লেভেল আনলক থাকবে!
              </p>
            </div>

            {authError && (
              <div
                role="alert"
                className="text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-3 text-left whitespace-pre-line break-words leading-relaxed"
              >
                {authError}
              </div>
            )}

            <button
              onClick={() => {
                amazeGoAudio.playClick();
                void onGoogleLogin();
              }}
              disabled={isAuthLoading}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#18181b] hover:bg-[#27272a] disabled:opacity-60 text-white font-extrabold text-sm shadow-lg flex items-center justify-center gap-2.5 active:scale-95 transition-all"
            >
              <LogIn className="w-4 h-4" />
              <span>{isAuthLoading ? 'Signing in...' : 'Sign in with Google'}</span>
            </button>

            {authError && authErrorCode !== 'auth/unauthorized-domain' && (
              <div className="pt-1">
                {!isInsideIframe() && onGoogleRedirectLogin ? (
                  <button
                    type="button"
                    onClick={() => {
                      amazeGoAudio.playClick();
                      void onGoogleRedirectLogin();
                    }}
                    disabled={isAuthLoading}
                    className="w-full py-2.5 px-4 rounded-2xl bg-[#efe4ce] hover:bg-[#e5d5b7] disabled:opacity-60 text-[#3f3122] font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Redirect দিয়ে Google লগইন করুন</span>
                  </button>
                ) : (
                  <a
                    href={typeof window !== 'undefined' ? window.location.href : '/'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 rounded-2xl bg-[#efe4ce] hover:bg-[#e5d5b7] text-[#3f3122] font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Chrome & Login</span>
                  </a>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="pt-4 space-y-4">
            {/* Avatar & Admin / Email Info */}
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                {draftPhoto ? (
                  <img
                    src={draftPhoto}
                    alt={draftName || 'Player Avatar'}
                    className="w-18 h-18 rounded-2xl object-cover border-2 border-[#d4c09e] shadow-sm"
                  />
                ) : (
                  <div className="w-18 h-18 rounded-2xl bg-[#efe4ce] border-2 border-[#d4c09e] flex items-center justify-center text-2xl font-black text-[#6b563c]">
                    {(draftName || 'P').slice(0, 1).toUpperCase()}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1.5 -right-1.5 p-1.5 rounded-xl bg-[#1d4ed8] text-white shadow-md hover:bg-[#1e40af] active:scale-95 transition-all"
                  title="Change Profile Picture"
                  aria-label="Upload Profile Picture"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-black text-[#3f3122] truncate">
                    {displayName}
                  </span>
                  {isAdmin && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-600/15 text-emerald-800 border border-emerald-600/30">
                      <ShieldCheck className="w-3 h-3" />
                      ADMIN • {TOTAL_GAME_LEVELS} UNLOCKED
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-semibold text-[#8c7a64] truncate mt-0.5">
                  {email}
                </p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border"
                    style={{
                      backgroundColor: tier.badgeBg,
                      color: tier.badgeText,
                      borderColor: tier.badgeBorder,
                    }}
                  >
                    <Award className="w-3 h-3" />
                    {tier.name} ({tier.index + 1}/7)
                  </span>
                  <span className="text-[11px] font-bold text-[#7c6951]">
                    Unlocked: {isAdmin ? TOTAL_GAME_LEVELS : highestUnlockedLevel}/{TOTAL_GAME_LEVELS}
                  </span>
                </div>
                <div className="mt-1.5">
                  {canPlayUnlimited ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-teal-600/12 text-teal-800 border border-teal-600/25">
                      <InfinityIcon className="w-3 h-3" />
                      Unlimited Mode: অনুমতি চালু
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#efe4ce] text-[#7c6951] border border-[#dccaa8]">
                      <Lock className="w-3 h-3" />
                      Unlimited Mode: অ্যাডমিন পারমিশন প্রয়োজন
                    </span>
                  )}
                </div>
              </div>
            </div>

            {isAdmin && onOpenAdminPanel && (
              <button
                type="button"
                onClick={() => {
                  amazeGoAudio.playClick();
                  onClose();
                  onOpenAdminPanel();
                }}
                className="w-full py-2.5 px-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"
              >
                <Users className="w-4 h-4" />
                <span>Admin Panel: লগইন ইউজার ও আনলিমিটেড পারমিশন</span>
              </button>
            )}

            {/* Editable Name + Photo Reset */}
            <form onSubmit={handleSubmitProfile} className="space-y-3 bg-[#f3e9d3] p-3.5 rounded-2xl border border-[#e3d4b8]">
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#7a664c] mb-1">
                  Player Name (এডিট করা যাবে)
                </label>
                <input
                  type="text"
                  maxLength={50}
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#d9c7a7] text-sm font-bold text-[#3f3122] focus:outline-none focus:border-[#1d4ed8]"
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 rounded-xl bg-white hover:bg-[#faf5ea] border border-[#d9c7a7] text-xs font-bold text-[#5c4b37] flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <Camera className="w-3.5 h-3.5 text-[#1d4ed8]" />
                  <span>Add Photo</span>
                </button>

                {googlePhotoUrl && draftPhoto !== googlePhotoUrl && (
                  <button
                    type="button"
                    onClick={() => setDraftPhoto(googlePhotoUrl)}
                    className="px-2.5 py-2 rounded-xl bg-white hover:bg-[#faf5ea] border border-[#d9c7a7] text-[11px] font-bold text-[#7c6951] flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Use Google Photo</span>
                  </button>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="ml-auto px-4 py-2 rounded-xl bg-[#1d4ed8] hover:bg-[#1e40af] disabled:opacity-60 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : savedNotice ? 'Saved!' : 'Save'}</span>
                </button>
              </div>

              {localError && (
                <p className="text-[11px] font-bold text-rose-700">{localError}</p>
              )}
            </form>

            {/* 7 Rank Tiers Ladder */}
            <div className="bg-white/75 p-3 rounded-2xl border border-[#e3d4b8]">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#7a664c] mb-2">
                7 Game Ranks (Bronze → Crown)
              </p>
              <div className="grid grid-cols-7 gap-1">
                {RANK_TIERS.map((t) => {
                  const unlocked = completedCount >= t.minCompleted;
                  const isCurrent = t.index === tier.index;
                  return (
                    <div
                      key={t.name}
                      className={`flex flex-col items-center p-1.5 rounded-xl border text-center transition-all ${
                        isCurrent ? 'ring-2 ring-offset-1 ring-[#1d4ed8]' : ''
                      } ${unlocked ? 'opacity-100' : 'opacity-45 grayscale'}`}
                      style={{
                        backgroundColor: t.badgeBg,
                        borderColor: t.badgeBorder,
                        color: t.badgeText,
                      }}
                      title={`${t.name}: ${t.minCompleted}+ Levels`}
                    >
                      <span className="text-[9px] font-black leading-tight">{t.name}</span>
                      <span className="text-[8px] font-bold mt-0.5">{t.minCompleted}+</span>
                    </div>
                  );
                })}
              </div>
              {tier.nextTier && (
                <p className="text-[10px] font-bold text-[#8c7a64] mt-2 text-center">
                  আরো {tier.levelsToNext} টি লেভেল খেললে <strong>{tier.nextTier.name}</strong> র‍্যাঙ্ক আনলক হবে!
                </p>
              )}
            </div>

            <button
              onClick={() => {
                amazeGoAudio.playClick();
                void onSignOut();
              }}
              className="w-full py-2.5 px-4 rounded-2xl bg-[#efe4ce] hover:bg-[#e5d5b7] text-[#6b563c] font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
