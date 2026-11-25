import React, { useState, useEffect } from 'react';
import { X, Trophy, Clock, Medal, RefreshCw, LogIn } from 'lucide-react';
import {
  CompletedLevelsMap,
  GlobalLeaderboardRow,
  LevelSpeedRecordRow,
  RANK_TIERS,
  formatDurationShort,
} from '../game/playerProgression';
import { fetchGlobalLeaderboard, fetchLevelSpeedRecords } from '../firebase';
import { amazeGoAudio } from '../game/amazeGoAudio';

interface RecordsLeaderboardModalProps {
  isOpen: boolean;
  isSignedIn: boolean;
  currentUid: string | null;
  currentLevelId: number;
  completedLevels: CompletedLevelsMap;
  onRequestLogin: () => void;
  onClose: () => void;
}

type RecordTab = 'GLOBAL' | 'LEVEL' | 'MY_TIMES';

export const RecordsLeaderboardModal: React.FC<RecordsLeaderboardModalProps> = ({
  isOpen,
  isSignedIn,
  currentUid,
  currentLevelId,
  completedLevels,
  onRequestLogin,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<RecordTab>('GLOBAL');
  const [selectedLevelId, setSelectedLevelId] = useState<number>(currentLevelId);
  const [globalRows, setGlobalRows] = useState<(GlobalLeaderboardRow & { rank: number })[]>([]);
  const [levelRows, setLevelRows] = useState<(LevelSpeedRecordRow & { rank: number })[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSelectedLevelId(currentLevelId);
  }, [currentLevelId]);

  useEffect(() => {
    if (!isOpen || !isSignedIn) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        if (activeTab === 'GLOBAL') {
          const rows = await fetchGlobalLeaderboard();
          if (!cancelled) setGlobalRows(rows);
        } else if (activeTab === 'LEVEL') {
          const rows = await fetchLevelSpeedRecords(selectedLevelId);
          if (!cancelled) setLevelRows(rows);
        }
      } catch {
        // Error already logged cleanly in handleFirestoreError
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [isOpen, isSignedIn, activeTab, selectedLevelId]);

  if (!isOpen) return null;

  const myHistoryList = Object.entries(completedLevels)
    .map(([idStr, rec]) => ({
      levelId: Number(idStr),
      ...rec,
    }))
    .sort((a, b) => a.levelId - b.levelId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Records and Leaderboard"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-[#fbf6ea] text-[#5c4b37] rounded-3xl p-4 sm:p-6 shadow-2xl border border-[#e0d2b8] flex flex-col max-h-[88vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#e6d9c0]">
          <div className="flex items-center gap-2 min-w-0">
            <Trophy className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-[#3f3122] truncate">
                Records &amp; Leaderboard
              </h2>
              <p className="text-[11px] font-semibold text-[#8c7a64] truncate">
                ১ম / ২য় র‍্যাঙ্ক ও প্রতি লেভেলের মিনিট-সেকেন্ড রেকর্ড
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              amazeGoAudio.playClick();
              onClose();
            }}
            className="p-2 rounded-2xl bg-[#efe4ce] text-[#6b563c] hover:bg-[#e5d5b7] active:scale-95 transition-all shrink-0"
            aria-label="Close Leaderboard"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-3 gap-1.5 py-3 w-full">
          {[
            { key: 'GLOBAL', label: 'Top 1st/2nd', aria: 'Top Players (1st/2nd)' },
            { key: 'LEVEL', label: 'Level Records', aria: 'Level Records' },
            { key: 'MY_TIMES', label: `My Times (${myHistoryList.length})`, aria: `My Times (${myHistoryList.length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              aria-label={tab.aria}
              data-testid={`records-tab-${tab.key.toLowerCase()}`}
              onClick={() => {
                amazeGoAudio.playClick();
                setActiveTab(tab.key as RecordTab);
              }}
              className={`min-w-0 w-full py-2 px-1.5 rounded-xl text-[11px] sm:text-xs font-extrabold leading-tight text-center transition-all flex items-center justify-center ${
                activeTab === tab.key
                  ? 'bg-[#6b563c] text-white shadow-sm'
                  : 'bg-[#efe4ce] text-[#6b563c] hover:bg-[#e5d6b8]'
              }`}
            >
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-2 pr-0.5">
          {!isSignedIn && activeTab !== 'MY_TIMES' ? (
            <div className="py-8 text-center space-y-3 bg-[#f3e9d3] rounded-2xl p-5 border border-[#e3d4b8]">
              <Medal className="w-10 h-10 text-amber-600 mx-auto" />
              <p className="text-xs font-bold text-[#5c4b37]">
                সবার ১ম / ২য় র‍্যাঙ্ক ও লাইভ লেভেল রেকর্ড দেখতে Google ID দিয়ে লগইন করুন।
              </p>
              <button
                onClick={() => {
                  amazeGoAudio.playClick();
                  onClose();
                  onRequestLogin();
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#18181b] text-white text-xs font-extrabold shadow-md active:scale-95 transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign in with Google</span>
              </button>
            </div>
          ) : activeTab === 'GLOBAL' ? (
            loading ? (
              <div className="py-10 flex flex-col items-center gap-2 text-xs font-bold text-[#8c7a64]">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Loading leaderboard...</span>
              </div>
            ) : globalRows.length === 0 ? (
              <p className="text-center py-8 text-xs font-bold text-[#8c7a64]">
                এখনও কোনো রেকর্ড নেই—একটি লেভেল কমপ্লিট করে ১ম স্থান দখল করুন!
              </p>
            ) : (
              globalRows.map((row) => {
                const tier = RANK_TIERS[Math.min(6, Math.max(0, row.tierIndex))] || RANK_TIERS[0];
                const isMe = row.uid === currentUid;
                return (
                  <div
                    key={row.uid}
                    className={`flex items-center gap-3 p-3 rounded-2xl border ${
                      isMe
                        ? 'bg-[#1d4ed8]/10 border-[#1d4ed8]/40'
                        : 'bg-white/85 border-[#e5d8be]'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                        row.rank === 1
                          ? 'bg-amber-400 text-amber-950 shadow-sm'
                          : row.rank === 2
                          ? 'bg-slate-300 text-slate-800'
                          : row.rank === 3
                          ? 'bg-amber-700/25 text-amber-900'
                          : 'bg-[#efe4ce] text-[#6b563c]'
                      }`}
                    >
                      #{row.rank}
                    </div>

                    {row.photoUrl ? (
                      <img
                        src={row.photoUrl}
                        alt={row.displayName}
                        className="w-9 h-9 rounded-xl object-cover border border-[#dfd1b5] shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-[#efe4ce] flex items-center justify-center font-black text-xs text-[#6b563c] shrink-0">
                        {row.displayName.slice(0, 1).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-[#3f3122] truncate">
                          {row.displayName} {isMe ? '(You)' : ''}
                        </span>
                        <span
                          className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border shrink-0"
                          style={{
                            backgroundColor: tier.badgeBg,
                            color: tier.badgeText,
                            borderColor: tier.badgeBorder,
                          }}
                        >
                          {tier.name}
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-[#8c7a64] mt-0.5">
                        {row.completedCount} Levels &bull; ★ {row.totalStars} &bull; Total{' '}
                        {formatDurationShort(row.totalTimeSeconds)}
                      </p>
                    </div>
                  </div>
                );
              })
            )
          ) : activeTab === 'LEVEL' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 bg-[#f3e9d3] p-2.5 rounded-2xl border border-[#e3d4b8]">
                <span className="text-xs font-extrabold text-[#5c4b37]">
                  Select Level (1–500):
                </span>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={selectedLevelId}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v) && v >= 1 && v <= 500) setSelectedLevelId(v);
                  }}
                  className="w-24 px-2.5 py-1 rounded-xl bg-white border border-[#d9c7a7] text-xs font-black text-center text-[#3f3122]"
                />
              </div>

              {loading ? (
                <div className="py-8 flex flex-col items-center gap-2 text-xs font-bold text-[#8c7a64]">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Loading Level {selectedLevelId} times...</span>
                </div>
              ) : levelRows.length === 0 ? (
                <p className="text-center py-8 text-xs font-bold text-[#8c7a64]">
                  Level {selectedLevelId}-এর কোনো ফাস্ট রেকর্ড এখনও নেই।
                </p>
              ) : (
                levelRows.map((row) => {
                  const isMe = row.uid === currentUid;
                  return (
                    <div
                      key={row.uid}
                      className={`flex items-center gap-3 p-3 rounded-2xl border ${
                        isMe
                          ? 'bg-[#1d4ed8]/10 border-[#1d4ed8]/40'
                          : 'bg-white/85 border-[#e5d8be]'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                          row.rank === 1
                            ? 'bg-amber-400 text-amber-950'
                            : row.rank === 2
                            ? 'bg-slate-300 text-slate-800'
                            : 'bg-[#efe4ce] text-[#6b563c]'
                        }`}
                      >
                        #{row.rank}
                      </div>

                      {row.photoUrl ? (
                        <img
                          src={row.photoUrl}
                          alt={row.displayName}
                          className="w-9 h-9 rounded-xl object-cover border border-[#dfd1b5] shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-[#efe4ce] flex items-center justify-center font-black text-xs text-[#6b563c] shrink-0">
                          {row.displayName.slice(0, 1).toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-[#3f3122] truncate">
                          {row.displayName} {isMe ? '(You)' : ''}
                        </p>
                        <p className="text-[10px] font-bold text-[#8c7a64]">
                          {'★'.repeat(row.stars)} &bull; {row.bestMoves} moves &bull;{' '}
                          {row.minBumps} bumps
                        </p>
                      </div>

                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-600/12 text-emerald-800 font-black text-xs shrink-0">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatDurationShort(row.bestTimeSeconds)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : myHistoryList.length === 0 ? (
            <p className="text-center py-8 text-xs font-bold text-[#8c7a64]">
              আপনি এখনও কোনো লেভেল কমপ্লিট করেননি। Level 1 থেকে শুরু করুন!
            </p>
          ) : (
            myHistoryList.map((item) => (
              <div
                key={item.levelId}
                className="flex items-center justify-between p-3 rounded-2xl bg-white/85 border border-[#e5d8be]"
              >
                <div>
                  <span className="text-xs font-black text-[#3f3122]">
                    Level {item.levelId}
                  </span>
                  <p className="text-[10px] font-bold text-[#8c7a64]">
                    <span className="text-amber-500">{'★'.repeat(item.stars)}</span> &bull;{' '}
                    {item.bestMoves} moves
                  </p>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#efe4ce] text-[#5c4b37] font-black text-xs">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatDurationShort(item.bestTimeSeconds || 0)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
