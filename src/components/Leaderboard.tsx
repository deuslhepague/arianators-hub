"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSpotify } from "@/context/SpotifyContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { dbOperations } from "@/lib/firebase";
import { Trophy, RefreshCw, Users, Music2, Award, Clock, AlertTriangle } from "lucide-react";

interface LeaderboardUser {
  userId: string;
  displayName: string;
  avatarUrl: string;
  streamsToday: number;
}

interface LeaderboardSong {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  cycleDate: string;
  fanbaseStreams: number;   // all plays this cycle (confirmed + pending_merge)
  pendingStreams: number;   // subset: plays from IDs not yet confirmed by admin
  isPending: boolean;       // true = this whole entry is not yet in catalog
}

/** Returns the current cycle date label */
function getCycleDateLabel(): string {
  return new Date().toISOString().split("T")[0];
}

/** Returns past 7 days UTC dates */
function getPast7Days(): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

/** Returns ms until next midnight GMT reset */
function msUntilNextCycle(): number {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0); // next midnight UTC
  return next.getTime() - now.getTime();
}

/** Format ms into "Xh Ym" */
function formatCountdown(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function Leaderboard() {
  const { user, isAdmin } = useSpotify();
  const { language, t } = useLanguage();
  const { theme } = useTheme();

  const [boardData, setBoardData] = useState<LeaderboardUser[]>([]);
  const [songBoardData, setSongBoardData] = useState<LeaderboardSong[]>([]);
  const [leaderboardTab, setLeaderboardTab] = useState<"fans" | "songs">("fans");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(formatCountdown(msUntilNextCycle()));
  const [selectedDate, setSelectedDate] = useState<string>(getCycleDateLabel());

  const fetchLeaderboard = useCallback(async (bypass: any = false) => {
    setIsRefreshing(true);
    const shouldBypass = bypass === true || (bypass && (
      bypass instanceof Event ||
      bypass.type === "storage_admin_update" ||
      bypass.type === "click" ||
      bypass.nativeEvent
    ));
    try {
      const usersData = await dbOperations.getLeaderboard(20, selectedDate, shouldBypass);
      setBoardData(usersData);

      const songsData = await dbOperations.getSongLeaderboard(selectedDate, shouldBypass);
      setSongBoardData(songsData);
    } catch (err) {
      console.error("Failed to load leaderboard data:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchLeaderboard(false);

    window.addEventListener("storage_admin_update", fetchLeaderboard);

    // Auto refresh every 3 minutes
    const interval = setInterval(() => fetchLeaderboard(false), 180_000);

    // Countdown ticker — updates every minute
    const ticker = setInterval(() => {
      setCountdown(formatCountdown(msUntilNextCycle()));
    }, 60_000);

    return () => {
      window.removeEventListener("storage_admin_update", fetchLeaderboard);
      clearInterval(interval);
      clearInterval(ticker);
    };
  }, [fetchLeaderboard]);

  const formatNumber = (num: number) =>
    num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  const totalFanbaseStreams = boardData.reduce((sum, item) => sum + item.streamsToday, 0);
  const totalActiveUsers = boardData.length;
  const cycleLabel = getCycleDateLabel();

  // ---- style helpers ----
  const card = theme === "light"
    ? "bg-white border-neutral-200 text-neutral-900"
    : "bg-wine-deep border-panel-border text-white";

  const cardAlt = theme === "light"
    ? "bg-neutral-50 border-neutral-200"
    : "bg-wine-dark/40 border-panel-border";

  const textMain = theme === "light" ? "text-neutral-950" : "text-white";
  const textSub  = theme === "light" ? "text-neutral-600" : "text-neutral-400";
  const textMuted = theme === "light" ? "text-neutral-500" : "text-neutral-450";
  const border   = theme === "light" ? "border-neutral-200" : "border-panel-border";
  const tabBg    = theme === "light" ? "bg-neutral-100 border-neutral-200" : "bg-neutral-950 border-neutral-900";
  const tabActive = theme === "light" ? "bg-black text-white" : "bg-white text-black";
  const tabInactive = theme === "light" ? "text-neutral-500 hover:text-black" : "text-neutral-400 hover:text-white";
  const iconBox  = theme === "light" ? "bg-neutral-100 border-neutral-200 text-black" : "bg-neutral-900 border-neutral-800 text-white";
  const refreshBtn = theme === "light"
    ? "bg-neutral-100 border-neutral-200 hover:border-black text-black disabled:opacity-50"
    : "bg-neutral-900 border-neutral-800 hover:border-white text-white disabled:opacity-50";

  return (
    <div className={`glass-panel p-6 lg:p-10 animate-fade-in flex flex-col justify-between h-full`} id="leaderboard">
      <div>
        {/* Header */}
        <div className={`flex items-center justify-between border-b ${border} pb-4 mb-6`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded border ${iconBox}`}>
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h3 className={`font-bold text-xl md:text-2xl tracking-wider uppercase ${textMain}`}>
                {t("leaderboard.title")}
              </h3>
              <p className={`text-xs font-mono ${textSub}`}>
                {t("leaderboard.subtitle")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Cycle countdown badge */}
            {selectedDate === getCycleDateLabel() ? (
              <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-mono ${theme === "light" ? "bg-neutral-50 border-neutral-200 text-neutral-600" : "bg-neutral-900 border-neutral-800 text-neutral-400"}`}>
                <Clock className="w-3.5 h-3.5" />
                {language === "pt" ? "próximo ciclo:" : "next cycle:"} <strong className={textMain}>{countdown}</strong>
              </div>
            ) : (
              <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-mono ${theme === "light" ? "bg-neutral-100 border-neutral-200 text-neutral-500" : "bg-neutral-950 border-neutral-900 text-neutral-550"}`}>
                {language === "pt" ? "dados históricos" : "historical data"}
              </div>
            )}
            {isAdmin && (
              <button
                onClick={fetchLeaderboard}
                disabled={isRefreshing}
                className={`p-2.5 rounded border cursor-pointer ${refreshBtn}`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              </button>
            )}
          </div>
        </div>

        {/* Cycle Selector & Date Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 text-xs font-mono">
          <div className={`${textMuted}`}>
            {selectedDate === getCycleDateLabel() ? (
              <>
                {language === "pt" ? "ciclo ativo:" : "active cycle:"}{" "}
                <span className={`font-bold ${textMain}`}>{selectedDate}</span>
                {language === "pt" ? " (reinicia à meia-noite GMT)" : " (resets 12am GMT)"}
              </>
            ) : (
              <>
                {language === "pt" ? "ciclo histórico:" : "historical cycle:"}{" "}
                <span className={`font-bold ${textMain}`}>{selectedDate}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={textSub}>{language === "pt" ? "ver ciclo:" : "view cycle:"}</span>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={`border rounded px-2.5 py-1 text-xs focus:outline-none cursor-pointer font-sans font-semibold ${
                theme === "light" 
                  ? "bg-white border-neutral-350 text-neutral-950 hover:border-black" 
                  : "bg-neutral-900 border-neutral-800 text-white hover:border-white"
              }`}
            >
              {getPast7Days().map((d) => {
                const isToday = d === getCycleDateLabel();
                let label = d;
                if (isToday) {
                  label = language === "pt" ? `${d} (ativo)` : `${d} (active)`;
                } else if (d === getPast7Days()[1]) {
                  label = language === "pt" ? `${d} (ontem)` : `${d} (yesterday)`;
                }
                return (
                  <option key={d} value={d}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Tab Controls */}
        <div className={`flex p-1 border max-w-sm mb-6 rounded text-xs font-bold uppercase tracking-wider ${tabBg}`}>
          <button
            onClick={() => setLeaderboardTab("fans")}
            className={`flex-1 py-2 rounded transition-all cursor-pointer ${leaderboardTab === "fans" ? tabActive + " font-extrabold" : tabInactive}`}
          >
            {t("leaderboard.fans")}
          </button>
          <button
            onClick={() => setLeaderboardTab("songs")}
            className={`flex-1 py-2 rounded transition-all cursor-pointer ${leaderboardTab === "songs" ? tabActive + " font-extrabold" : tabInactive}`}
          >
            {t("leaderboard.songs")}
          </button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className={`p-4 rounded border text-center flex flex-col justify-center ${card}`}>
            <span className={`text-xs uppercase tracking-wider block mb-1 ${textMuted}`}>
              {t("leaderboard.fanbase_total")}
            </span>
            <span className={`font-serif text-xl md:text-2xl font-bold flex items-center justify-center gap-1.5 ${textMain}`}>
              <Music2 className="w-4 h-4" />
              {formatNumber(totalFanbaseStreams)}
            </span>
          </div>
          <div className={`p-4 rounded border text-center flex flex-col justify-center ${card}`}>
            <span className={`text-xs uppercase tracking-wider block mb-1 ${textMuted}`}>
              {t("leaderboard.active_fans")}
            </span>
            <span className={`font-serif text-xl md:text-2xl font-bold flex items-center justify-center gap-1.5 ${textMain}`}>
              <Users className="w-4 h-4" />
              {totalActiveUsers}
            </span>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <p className={`text-xs ${textMuted}`}>{language === "pt" ? "sincronizando rankings..." : "syncing rankings..."}</p>
          </div>
        ) : leaderboardTab === "fans" ? (
          boardData.length === 0 ? (
            <div className={`text-center py-16 text-xs ${textMuted}`}>
              {t("leaderboard.empty")}
            </div>
          ) : (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {boardData.map((item, index) => {
                const isCurrentUser = user && item.userId === user.id;
                const rank = index + 1;

                let badgeClass = theme === "light"
                  ? "bg-neutral-100 text-neutral-500 border border-neutral-200"
                  : "bg-wine-deep text-neutral-450 border border-panel-border";
                if (rank === 1) badgeClass = "bg-black text-white border border-black";
                if (rank === 2) badgeClass = theme === "light" ? "bg-neutral-200 text-neutral-800 border border-neutral-300" : "bg-wine-deep text-rose border border-panel-border";
                if (rank === 3) badgeClass = theme === "light" ? "bg-neutral-100 text-neutral-700 border border-neutral-200" : "bg-wine-deep text-rose border border-panel-border";

                return (
                  <div
                    key={item.userId}
                    className={`flex items-center justify-between p-3.5 rounded border transition-all ${
                      isCurrentUser
                        ? (theme === "light" ? "bg-neutral-100 border-black" : "bg-wine border-rose")
                        : (theme === "light" ? "bg-white border-neutral-200 hover:border-black" : "bg-wine-dark/40 border-panel-border hover:border-rose/40")
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold ${badgeClass}`}>
                        {rank <= 3 ? <Award className="w-4 h-4" /> : rank}
                      </div>

                      {item.avatarUrl ? (
                        <img
                          src={item.avatarUrl}
                          alt={item.displayName}
                          className={`w-9 h-9 rounded-full object-cover border ${border}`}
                        />
                      ) : (
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border ${theme === "light" ? "bg-neutral-100 border-neutral-200 text-neutral-800" : "bg-wine text-rose border-panel-border"}`}>
                          {item.displayName.slice(0, 2).toLowerCase()}
                        </div>
                      )}

                      <div>
                        <span className={`text-xs md:text-sm block font-semibold ${isCurrentUser ? (theme === "light" ? "text-black underline" : "text-rose underline") : textSub}`}>
                          {item.displayName} {isCurrentUser && t("leaderboard.you")}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`font-serif text-sm md:text-base font-bold block ${textMain}`}>
                        {formatNumber(item.streamsToday)}
                      </span>
                      <span className={`text-[9px] block uppercase tracking-wider mt-0.5 ${textMuted}`}>
                        {t("leaderboard.streams")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* SONG LEADERBOARD */
          songBoardData.length === 0 ? (
            <div className={`text-center py-16 text-xs ${textMuted}`}>
              {language === "pt" ? "nenhuma música registrada neste ciclo." : "no songs tracked this cycle yet."}
            </div>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {/* Column header */}
              <div className={`flex justify-between items-center text-[10px] font-mono uppercase tracking-wider px-1 pb-1 border-b ${border} ${textMuted}`}>
                <span>{language === "pt" ? "música" : "song"}</span>
                <div className="flex gap-4 text-right">
                  <span>{language === "pt" ? "plays (ciclo)" : "plays (cycle)"}</span>
                  <span className="w-20">{language === "pt" ? "não confirmados" : "unconfirmed"}</span>
                </div>
              </div>

              {songBoardData.map((item, index) => {
                const rank = index + 1;
                let badgeClass = theme === "light"
                  ? "bg-neutral-100 text-neutral-500 border border-neutral-200"
                  : "bg-wine-deep text-neutral-450 border border-panel-border";
                if (rank === 1) badgeClass = "bg-black text-white border border-black";
                if (rank === 2) badgeClass = theme === "light" ? "bg-neutral-200 text-neutral-800 border border-neutral-300" : "bg-wine-deep text-rose border border-panel-border";
                if (rank === 3) badgeClass = theme === "light" ? "bg-neutral-100 text-neutral-700 border border-neutral-200" : "bg-wine-deep text-rose border border-panel-border";

                const hasUnconfirmed = item.pendingStreams > 0;
                const confirmedStreams = item.fanbaseStreams - item.pendingStreams;

                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3.5 rounded border transition-all ${
                      item.isPending
                        ? (theme === "light" ? "bg-amber-50 border-amber-200" : "bg-amber-900/10 border-amber-700/40")
                        : (theme === "light" ? "bg-white border-neutral-200 hover:border-black" : "bg-wine-dark/40 border-panel-border hover:border-rose/40")
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-7 h-7 flex-shrink-0 rounded flex items-center justify-center text-xs font-bold ${badgeClass}`}>
                        {rank <= 3 ? <Award className="w-4 h-4" /> : rank}
                      </div>

                      {item.coverUrl ? (
                        <img
                          src={item.coverUrl}
                          alt={item.title}
                          className={`w-9 h-9 flex-shrink-0 rounded object-cover border ${border}`}
                        />
                      ) : (
                        <div className={`w-9 h-9 flex-shrink-0 rounded flex items-center justify-center border ${theme === "light" ? "bg-neutral-100 border-neutral-200" : "bg-neutral-900 border-neutral-800"}`}>
                          <Music2 className={`w-4 h-4 ${textMuted}`} />
                        </div>
                      )}

                      <div className="min-w-0">
                        <span className={`text-xs md:text-sm font-semibold block truncate ${textMain}`}>
                          {item.title}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {item.isPending && (
                            <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${theme === "light" ? "bg-amber-100 text-amber-700" : "bg-amber-500/20 text-amber-400"}`}>
                              <AlertTriangle className="w-2.5 h-2.5" />
                              {language === "pt" ? "pendente" : "pending"}
                            </span>
                          )}
                          {hasUnconfirmed && !item.isPending && (
                            <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${theme === "light" ? "bg-orange-100 text-orange-600" : "bg-orange-500/20 text-orange-400"}`}>
                              <AlertTriangle className="w-2.5 h-2.5" />
                              {language === "pt" ? "IDs pendentes" : "pending IDs"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Play counts */}
                    <div className="text-right ml-3 flex-shrink-0">
                      <span className={`font-serif text-sm md:text-base font-bold block ${textMain}`}>
                        {formatNumber(item.fanbaseStreams)}
                      </span>
                      <div className={`text-[9px] font-mono mt-0.5 flex flex-col items-end gap-0.5`}>
                        {item.fanbaseStreams > 0 && (
                          <span className={`${textMuted}`}>
                            ✓ {formatNumber(confirmedStreams >= 0 ? confirmedStreams : item.fanbaseStreams)}
                          </span>
                        )}
                        {hasUnconfirmed && (
                          <span className={`font-bold ${theme === "light" ? "text-orange-600" : "text-orange-400"}`}>
                            ⚠ {formatNumber(item.pendingStreams)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      <div className={`border-t mt-6 pt-4 text-xs font-mono text-center ${border} ${textMuted}`}>
        🏆 {t("leaderboard.updates")} · {language === "pt" ? "ciclo:" : "cycle:"} {selectedDate} · {language === "pt" ? "reseta meia-noite GMT" : "resets 12am GMT"}
      </div>
    </div>
  );
}
