import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Users,
  ShieldCheck,
  Infinity as InfinityIcon,
  Lock,
  Search,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { AdminPlayerRow } from '../game/playerProgression';
import { fetchAllLoggedInPlayers, setPlayerUnlimitedPermission } from '../firebase';
import { amazeGoAudio } from '../game/amazeGoAudio';

interface AdminUsersModalProps {
  isOpen: boolean;
  isAdmin: boolean;
  currentUid: string | null;
  onClose: () => void;
}

function formatLastSeen(ms: number): string {
  if (!ms) return 'সম্প্রতি';
  try {
    return new Date(ms).toLocaleDateString('bn-BD', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'সক্রিয়';
  }
}

export const AdminUsersModal: React.FC<AdminUsersModalProps> = ({
  isOpen,
  isAdmin,
  currentUid,
  onClose,
}) => {
  const [players, setPlayers] = useState<AdminPlayerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);

  const loadPlayers = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const list = await fetchAllLoggedInPlayers();
      setPlayers(list);
    } catch (err) {
      console.error('Admin failed to load users:', err);
      setError('লগইন করা ইউজারদের তালিকা লোড করা যায়নি।');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isOpen && isAdmin) {
      void loadPlayers();
    }
  }, [isOpen, isAdmin, loadPlayers]);

  if (!isOpen || !isAdmin) return null;

  const q = searchQuery.trim().toLowerCase();
  const filteredPlayers = q
    ? players.filter(
        (p) =>
          p.displayName.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q)
      )
    : players;

  const permittedCount = players.filter((p) => p.unlimitedModeAllowed).length;

  const handleToggleUnlimited = async (player: AdminPlayerRow) => {
    if (player.uid === currentUid) return;
    const nextAllowed = !player.unlimitedModeAllowed;
    amazeGoAudio.playClick();
    setUpdatingUid(player.uid);
    setError(null);
    try {
      await setPlayerUnlimitedPermission(player.uid, nextAllowed);
      setPlayers((prev) =>
        prev.map((row) =>
          row.uid === player.uid
            ? { ...row, unlimitedModeAllowed: nextAllowed, updatedAtMs: Date.now() }
            : row
        )
      );
    } catch (err) {
      console.error('Failed to update unlimited mode permission:', err);
      setError('পারমিশন আপডেট করা যায়নি। আবার চেষ্টা করুন।');
    } finally {
      setUpdatingUid(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Admin Users & Unlimited Mode Control"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-[#fbf6ea] text-[#5c4b37] rounded-3xl p-5 shadow-2xl border border-[#e0d2b8] max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#e6d9c0]">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-emerald-600/15 border border-emerald-600/30 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#3f3122]">
                Admin User Control
              </h2>
              <p className="text-[11px] font-bold text-[#7c6951]">
                লগইন ইউজার ও আনলিমিটেড মোড পারমিশন
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                amazeGoAudio.playClick();
                void loadPlayers();
              }}
              disabled={loading}
              className="p-2 rounded-2xl bg-[#efe4ce] text-[#6b563c] hover:bg-[#e5d5b7] active:scale-95 transition-all"
              title="Refresh Users"
              aria-label="Refresh Logged-in Users"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => {
                amazeGoAudio.playClick();
                onClose();
              }}
              className="p-2 rounded-2xl bg-[#efe4ce] text-[#6b563c] hover:bg-[#e5d5b7] active:scale-95 transition-all"
              aria-label="Close Admin Panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Summary Counters */}
        <div className="grid grid-cols-2 gap-2.5 my-3">
          <div className="p-3 rounded-2xl bg-white border border-[#e3d4b8] flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1d4ed8]/10 text-[#1d4ed8] flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#8c7a64]">
                মোট লগইন
              </p>
              <p
                data-testid="admin-total-logins"
                className="text-lg font-black text-[#3f3122] leading-tight"
              >
                {players.length} জন
              </p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white border border-[#e3d4b8] flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-600/12 text-teal-700 flex items-center justify-center shrink-0">
              <InfinityIcon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#8c7a64]">
                অনুমতি প্রাপ্ত
              </p>
              <p
                data-testid="admin-unlimited-count"
                className="text-lg font-black text-teal-800 leading-tight"
              >
                {permittedCount} জন
              </p>
            </div>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative mb-2.5">
          <Search className="w-4 h-4 text-[#8c7a64] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="নাম বা ইমেইল দিয়ে খুঁজুন..."
            className="w-full pl-9 pr-3 py-2 rounded-2xl bg-white border border-[#dccaa8] text-xs font-bold text-[#3f3122] focus:outline-none focus:border-[#1d4ed8]"
          />
        </div>

        {error && (
          <div className="mb-2.5 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
            {error}
          </div>
        )}

        {/* Logged-in Players List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 min-h-[180px]">
          {loading && players.length === 0 ? (
            <div className="py-10 text-center text-xs font-bold text-[#8c7a64]">
              লগইন করা ইউজারদের তথ্য আনা হচ্ছে...
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="py-10 text-center text-xs font-bold text-[#8c7a64]">
              কোনো লগইন করা ইউজার পাওয়া যায়নি।
            </div>
          ) : (
            filteredPlayers.map((player) => {
              const isSelfAdmin = player.uid === currentUid;
              const isUpdating = updatingUid === player.uid;
              return (
                <div
                  key={player.uid}
                  className="p-2.5 rounded-2xl bg-white border border-[#e3d4b8] flex items-center justify-between gap-2.5 shadow-2xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {player.photoUrl ? (
                      <img
                        src={player.photoUrl}
                        alt={player.displayName}
                        className="w-9 h-9 rounded-xl object-cover border border-[#dccaa8] shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-[#efe4ce] text-[#5c4b37] font-black text-xs flex items-center justify-center shrink-0">
                        {player.displayName.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-black text-[#3f3122] truncate">
                          {player.displayName}
                        </p>
                        {isSelfAdmin && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-600/15 text-emerald-800 shrink-0">
                            ADMIN
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-semibold text-[#7c6951] truncate">
                        {player.email || 'No email'}
                      </p>
                      <p className="text-[10px] font-bold text-[#9a866e]">
                        Cleared: {player.completedCount} &bull; {formatLastSeen(player.updatedAtMs)}
                      </p>
                    </div>
                  </div>

                  {isSelfAdmin ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600/12 text-emerald-800 border border-emerald-600/25 text-[10px] font-black shrink-0">
                      <CheckCircle2 className="w-3 h-3" />
                      সদা চালু
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => void handleToggleUnlimited(player)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-black border transition-all active:scale-95 shrink-0 disabled:opacity-60 ${
                        player.unlimitedModeAllowed
                          ? 'bg-teal-600 text-white border-teal-700 hover:bg-teal-700'
                          : 'bg-[#f4ebd9] text-[#6b563c] border-[#dccaa8] hover:bg-[#eadbc0]'
                      }`}
                      aria-label={`Toggle Unlimited Mode for ${player.displayName}`}
                    >
                      {player.unlimitedModeAllowed ? (
                        <>
                          <InfinityIcon className="w-3.5 h-3.5" />
                          <span>{isUpdating ? 'সেভ হচ্ছে...' : 'অনুমতি চালু'}</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3" />
                          <span>{isUpdating ? 'সেভ হচ্ছে...' : 'অনুমতি দিন'}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
