"use client";

import React, { useState, useMemo } from "react";
import { useSpotify } from "@/context/SpotifyContext";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import PreMadePlaylists from "@/components/PreMadePlaylists";

import {
  getDaysToMilestone as getDaysUntilMilestone,
  getMilestoneForStreams,
  getMilestoneProgressPercent,
  getStreamsRemaining,
} from "@/lib/milestones";

import {
  Search,
  Info,
  X,
  RefreshCw
} from "lucide-react";

interface TrackStat {
  id: string;
  title: string;
  artist: string;
  totalStreams: number;
  dailyGain: number;
  gainDiff: number;
  coverUrl: string;
  milestoneName: string;
  milestoneTarget: number;
  avgDailyGain: number;
  alternativeIds?: string[];
  spotifyTrackId?: string;
  streams?: Record<string, { total: number; daily: number | null }>;
}

interface AlbumStat {
  id: string;
  title: string;
  year: string;
  totalStreams: number;
  dailyGain: number;
  coverUrl: string;
}

type StreamTab = "albums" | "tracks";
type SortBy = "daily" | "total";

const getTrackGainDisplay = (track: TrackStat, language: string) => {
  const dates = Object.keys(track.streams || {}).sort();
  if (dates.length < 2) {
    return null;
  }

  const todayDate = dates[dates.length - 1];
  const prevDate = dates[dates.length - 2];

  const todayEntry = track.streams![todayDate];
  const prevEntry = track.streams![prevDate];

  if (!todayEntry || !prevEntry) {
    return null;
  }

  const todayDaily = todayEntry.daily ?? 0;
  const prevDaily = prevEntry.daily ?? 0;

  if (prevDaily <= 0 || prevDaily === prevEntry.total) {
    return null;
  }

  const diff = todayDaily - prevDaily;
  const pct = (diff / prevDaily) * 100;

  const pctStr = Math.abs(pct).toFixed(1).replace(".", language === "pt" ? "," : ".");

  return {
    isUp: diff > 0,
    isDown: diff < 0,
    pctStr,
    diff
  };
};

export default function StreamsPage() {
  const { isAdmin } = useSpotify();
  const { theme } = useTheme();
  const { language, t } = useLanguage();

  // Dynamic tracks/albums state
  const [tracks, setTracks] = useState<TrackStat[]>([]);
  const [albums, setAlbums] = useState<AlbumStat[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const loadAdminConfig = React.useCallback(async (bypass = false) => {
    try {
      const response = await fetch("/api/catalog" + (bypass ? "?bypass=true" : ""));
      if (!response.ok) throw new Error("Failed to load catalog");
      const data = await response.json();
      setTracks(data.tracks || []);
      setAlbums(data.albums || []);
      setLastUpdated(data.updatedAt || new Date().toISOString());
    } catch (error) {
      console.error("Failed to load public catalog:", error);
    }
  }, []);

  const handleRefresh = React.useCallback(async () => {
    setIsRefreshing(true);
    await loadAdminConfig(true);
    setIsRefreshing(false);
  }, [loadAdminConfig]);

  React.useEffect(() => {
    void loadAdminConfig(false);
    const refreshCatalog = () => { void loadAdminConfig(true); };
    window.addEventListener("storage_admin_update", refreshCatalog);
    return () => window.removeEventListener("storage_admin_update", refreshCatalog);
  }, [loadAdminConfig]);

  // Streams View Sub-Tabs and Filter States
  const [streamTab, setStreamTab] = useState<StreamTab>("tracks");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("daily");
  const [albumSortBy, setAlbumSortBy] = useState<"daily" | "total" | "year">("total");

  // Selected Track for Milestones Modal
  const [selectedTrack, setSelectedTrack] = useState<TrackStat | null>(null);

  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const processedTracks = useMemo(() => {
    let result = [...tracks];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      if (sortBy === "daily") {
        return b.dailyGain - a.dailyGain;
      } else {
        return b.totalStreams - a.totalStreams;
      }
    });
    return result;
  }, [tracks, searchQuery, sortBy]);

  const processedAlbums = useMemo(() => {
    let result = [...albums];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((a) => a.title.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      if (albumSortBy === "daily") {
        return b.dailyGain - a.dailyGain;
      } else if (albumSortBy === "year") {
        const yearA = parseInt(a.year, 10) || 0;
        const yearB = parseInt(b.year, 10) || 0;
        return yearB - yearA;
      } else {
        return b.totalStreams - a.totalStreams;
      }
    });
    return result;
  }, [albums, searchQuery, albumSortBy]);

  const getMilestoneDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const selectedTrackMilestone = selectedTrack ? getMilestoneForStreams(selectedTrack.totalStreams) : null;
  const selectedTrackPace =
    selectedTrack && selectedTrack.avgDailyGain > 0
      ? selectedTrack.avgDailyGain
      : selectedTrack?.dailyGain ?? 0;
  const selectedTrackDaysToGoal = selectedTrackMilestone && selectedTrack
    ? getDaysUntilMilestone(
      selectedTrack.totalStreams,
      selectedTrackMilestone.milestoneTarget,
      selectedTrackPace
    )
    : null;
  const selectedTrackRemainingStreams =
    selectedTrackMilestone && selectedTrack
      ? getStreamsRemaining(selectedTrack.totalStreams, selectedTrackMilestone.milestoneTarget)
      : 0;
  const selectedTrackProgressPercent =
    selectedTrackMilestone && selectedTrack
      ? getMilestoneProgressPercent(selectedTrack.totalStreams, selectedTrackMilestone.milestoneTarget)
      : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className={`glass-panel p-6 lg:p-8 ${theme === "light" ? "bg-white" : "bg-neutral-950/10"}`}>
        {/* Segment control */}
        <div className={`flex p-1 border max-w-xs mb-6 rounded ${theme === "light" ? "bg-neutral-100 border-neutral-200" : "bg-neutral-950 border-neutral-900"}`}>
          <button
            onClick={() => setStreamTab("albums")}
            className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-all cursor-pointer ${streamTab === "albums"
                ? (theme === "light" ? "bg-black text-white font-extrabold" : "bg-white text-black font-extrabold")
                : (theme === "light" ? "text-neutral-500 hover:text-black" : "text-neutral-400 hover:text-white")
              }`}
          >
            {language === "pt" ? "álbuns" : "albums"}
          </button>
          <button
            onClick={() => setStreamTab("tracks")}
            className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-all cursor-pointer ${streamTab === "tracks"
                ? (theme === "light" ? "bg-black text-white font-extrabold" : "bg-white text-black font-extrabold")
                : (theme === "light" ? "text-neutral-500 hover:text-black" : "text-neutral-400 hover:text-white")
              }`}
          >
            {language === "pt" ? "músicas" : "tracks"}
          </button>
        </div>

        {/* Announcement-style info bar */}
        <div className={`p-4 border rounded flex items-start gap-3 mb-6 text-xs md:text-sm leading-relaxed ${theme === "light" ? "bg-neutral-50 border-neutral-200 text-neutral-600" : "bg-neutral-950 border-neutral-900 text-neutral-400"}`}>
          <Info className={`w-4 h-4 flex-shrink-0 mt-0.5 ${theme === "light" ? "text-black" : "text-white"}`} />
          <div>
            {language === "pt"
              ? "clique em qualquer música para ver as metas e estimativas de conclusão."
              : "click on any track to view milestone progress and target completion dates."}
          </div>
        </div>

        {/* Last Updated + Search Bar + Sort controls */}
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b ${theme === "light" ? "border-neutral-200" : "border-neutral-900"}`}>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold uppercase tracking-wider ${theme === "light" ? "text-neutral-500" : "text-neutral-400"}`}>
                {lastUpdated
                  ? (language === "pt" ? "atualizado: " : "updated: ") + new Date(lastUpdated).toLocaleTimeString()
                  : (language === "pt" ? "carregando..." : "loading...")}
              </span>
              {isAdmin && (
                <button
                  id="streams-refresh-btn"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  title={language === "pt" ? "Recarregar dados" : "Refresh data"}
                  className={`p-1.5 rounded border transition-all cursor-pointer disabled:opacity-40 ${theme === "light" ? "border-neutral-300 text-neutral-500 hover:border-black hover:text-black" : "border-neutral-800 text-neutral-500 hover:border-white hover:text-white"}`}
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />
                </button>
              )}
            </div>

            {streamTab === "tracks" && (
              <div className="flex items-center gap-2 mt-3">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${theme === "light" ? "text-neutral-500" : "text-neutral-500"}`}>
                  {language === "pt" ? "ordenar por:" : "sort by:"}
                </span>
                <button
                  onClick={() => setSortBy("daily")}
                  className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border ${sortBy === "daily"
                      ? (theme === "light" ? "bg-black border-black text-white" : "bg-white border-white text-black")
                      : (theme === "light" ? "border-neutral-300 text-neutral-500 hover:text-black" : "border-neutral-900 text-neutral-400 hover:text-white")
                    }`}
                >
                  {language === "pt" ? "streams diários" : "daily streams"}
                </button>
                <button
                  onClick={() => setSortBy("total")}
                  className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border ${sortBy === "total"
                      ? (theme === "light" ? "bg-black border-black text-white" : "bg-white border-white text-black")
                      : (theme === "light" ? "border-neutral-300 text-neutral-500 hover:text-black" : "border-neutral-900 text-neutral-400 hover:text-white")
                    }`}
                >
                  {language === "pt" ? "streams totais" : "total streams"}
                </button>
              </div>
            )}

            {streamTab === "albums" && (
              <div className="flex items-center gap-2 mt-3">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${theme === "light" ? "text-neutral-500" : "text-neutral-500"}`}>
                  {language === "pt" ? "ordenar por:" : "sort by:"}
                </span>
                <button
                  onClick={() => setAlbumSortBy("total")}
                  className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border ${albumSortBy === "total"
                      ? (theme === "light" ? "bg-black border-black text-white" : "bg-white border-white text-black")
                      : (theme === "light" ? "border-neutral-300 text-neutral-500 hover:text-black" : "border-neutral-900 text-neutral-400 hover:text-white")
                    }`}
                >
                  {language === "pt" ? "streams totais" : "total streams"}
                </button>
                <button
                  onClick={() => setAlbumSortBy("daily")}
                  className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border ${albumSortBy === "daily"
                      ? (theme === "light" ? "bg-black border-black text-white" : "bg-white border-white text-black")
                      : (theme === "light" ? "border-neutral-300 text-neutral-500 hover:text-black" : "border-neutral-900 text-neutral-400 hover:text-white")
                    }`}
                >
                  {language === "pt" ? "ganho diário" : "daily gain"}
                </button>
                <button
                  onClick={() => setAlbumSortBy("year")}
                  className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border ${albumSortBy === "year"
                      ? (theme === "light" ? "bg-black border-black text-white" : "bg-white border-white text-black")
                      : (theme === "light" ? "border-neutral-300 text-neutral-500 hover:text-black" : "border-neutral-900 text-neutral-400 hover:text-white")
                    }`}
                >
                  {language === "pt" ? "ano de lançamento" : "release year"}
                </button>
              </div>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative max-w-sm w-full">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder={
                streamTab === "tracks"
                  ? (language === "pt" ? "buscar faixas..." : "search tracks...")
                  : (language === "pt" ? "buscar álbuns..." : "search albums...")
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 border rounded text-xs focus:outline-none ${theme === "light" ? "bg-white border-neutral-300 text-neutral-950 focus:border-black placeholder-neutral-400" : "bg-neutral-950 border-neutral-900 focus:border-white text-white placeholder-neutral-600"}`}
            />
          </div>
        </div>

        {/* TRACKS LIST */}
        {streamTab === "tracks" && (
          <div className="space-y-2">
            <div className={`flex justify-between text-[10px] font-bold uppercase tracking-wider px-4 pb-3 border-b ${theme === "light" ? "text-neutral-500 border-neutral-200" : "text-neutral-500 border-neutral-900/60"}`}>
              <span>{language === "pt" ? "música" : "track"}</span>
              <span className="text-right">{language === "pt" ? "streams / ganho (dif)" : "streams / gain (diff)"}</span>
            </div>

            {processedTracks.length === 0 ? (
              <div className={`text-center py-12 text-xs ${theme === "light" ? "text-neutral-500" : "text-neutral-500"}`}>
                {language === "pt" ? "nenhuma música encontrada." : "no tracks match your search."}
              </div>
            ) : (
              processedTracks.map((track) => (
                <div
                  key={track.id}
                  onClick={() => setSelectedTrack(track)}
                  className={`flex items-center justify-between p-4 rounded border transition-all cursor-pointer group ${theme === "light" ? "border-transparent hover:border-neutral-300 hover:bg-neutral-50" : "border-transparent hover:border-neutral-800 hover:bg-neutral-950/60"}`}
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={track.coverUrl}
                      alt={track.title}
                      className={`w-14 h-14 rounded object-cover border ${theme === "light" ? "border-neutral-200" : "border-neutral-900"}`}
                    />
                    <div>
                      <span className={`text-base md:text-lg font-bold block leading-tight group-hover:underline ${theme === "light" ? "text-neutral-950" : "text-white"}`}>
                        {track.title}
                      </span>
                      <span className={`text-xs block mt-1 ${theme === "light" ? "text-neutral-600" : "text-neutral-400"}`}>{track.artist}</span>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <span className={`text-base md:text-lg font-bold block ${theme === "light" ? "text-neutral-950" : "text-white"}`}>
                      {formatNumber(track.totalStreams)}
                    </span>
                    <div className="flex items-center justify-end gap-2 mt-1">
                      <span className={`text-xs font-semibold ${theme === "light" ? "text-neutral-700" : "text-neutral-300"}`}>
                        +{formatNumber(track.dailyGain)}
                      </span>
                      {(() => {
                        const gainDisplay = getTrackGainDisplay(track, language);
                        if (!gainDisplay || gainDisplay.diff === 0) return null;
                        return (
                          <span className={`text-[10px] font-semibold flex items-center ${gainDisplay.isUp ? "text-green-500" : "text-red-400"}`}>
                            {gainDisplay.isUp ? "▲" : "▼"} {gainDisplay.pctStr}%
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ALBUMS LIST */}
        {streamTab === "albums" && (
          <div className="space-y-2">
            <div className={`flex justify-between text-[10px] font-bold uppercase tracking-wider px-4 pb-3 border-b ${theme === "light" ? "text-neutral-500 border-neutral-200" : "text-neutral-500 border-neutral-900/60"}`}>
              <span>{language === "pt" ? "álbum" : "album"}</span>
              <span className="text-right">{language === "pt" ? "streams / ganho diário" : "streams / daily gain"}</span>
            </div>

            {processedAlbums.length === 0 ? (
              <div className={`text-center py-12 text-xs ${theme === "light" ? "text-neutral-500" : "text-neutral-500"}`}>
                {language === "pt" ? "nenhum álbum encontrado." : "no albums match your search."}
              </div>
            ) : (
              processedAlbums.map((album) => (
                <div
                  key={album.id}
                  className={`flex items-center justify-between p-4 rounded border transition-all ${theme === "light" ? "border-transparent hover:border-neutral-300 hover:bg-neutral-50" : "border-transparent hover:border-neutral-800 hover:bg-neutral-950/60"}`}
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={album.coverUrl}
                      alt={album.title}
                      className={`w-14 h-14 rounded object-cover border ${theme === "light" ? "border-neutral-200" : "border-neutral-900"}`}
                    />
                    <div>
                      <span className={`text-base md:text-lg font-bold block leading-tight ${theme === "light" ? "text-neutral-950" : "text-white"}`}>
                        {album.title}
                      </span>
                      <span className={`text-xs block mt-1 ${theme === "light" ? "text-neutral-600" : "text-neutral-400"}`}>{album.year}</span>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <span className={`text-base md:text-lg font-bold block ${theme === "light" ? "text-neutral-950" : "text-white"}`}>
                      {formatNumber(album.totalStreams)}
                    </span>
                    <span className={`text-xs font-semibold block mt-1 ${theme === "light" ? "text-neutral-700" : "text-neutral-300"}`}>
                      +{formatNumber(album.dailyGain)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* PRE-MADE PLAYLISTS */}
      <PreMadePlaylists />

      {/* MILESTONE PROGRESS MODAL POPUP */}
      {selectedTrack && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className={`w-full max-w-2xl rounded-lg p-8 relative animate-slide-up ${theme === "light" ? "bg-white border border-neutral-200 text-neutral-950" : "bg-wine border border-panel-border text-rose"}`}>
            <button
              onClick={() => setSelectedTrack(null)}
              className={`absolute top-6 right-6 p-2 rounded-full transition-all cursor-pointer ${theme === "light" ? "hover:bg-neutral-100 text-neutral-500 hover:text-black" : "hover:bg-wine-deep text-mauve hover:text-rose"}`}
            >
              <X className="w-6 h-6" />
            </button>

            <div className={`flex gap-6 mb-8 items-center border-b pb-6 ${theme === "light" ? "border-neutral-200" : "border-panel-border"}`}>
              <img
                src={selectedTrack.coverUrl}
                alt={selectedTrack.title}
                className={`w-20 h-20 rounded-md object-cover border shadow-md ${theme === "light" ? "border-neutral-200" : "border-panel-border"}`}
              />
              <div>
                <h3 className={`text-2xl md:text-3xl font-serif tracking-wide leading-tight ${theme === "light" ? "text-neutral-950" : "text-rose"}`}>{selectedTrack.title}</h3>
                <p className={`text-sm mt-1.5 font-serif uppercase tracking-wider ${theme === "light" ? "text-neutral-500" : "text-mauve"}`}>{selectedTrack.artist}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <div className={`flex justify-between text-xs font-bold uppercase tracking-wider mb-2.5 ${theme === "light" ? "text-neutral-500" : "text-mauve"}`}>
                  <span>{language === "pt" ? "progresso para" : "progress to"} {selectedTrackMilestone?.milestoneName ?? selectedTrack.milestoneName}</span>
                  <span className={`font-extrabold text-sm ${theme === "light" ? "text-neutral-950" : "text-rose"}`}>
                    {Math.round(selectedTrackProgressPercent * 10) / 10}%
                  </span>
                </div>

                <div className={`w-full h-3 border rounded-full overflow-hidden ${theme === "light" ? "bg-neutral-100 border-neutral-200" : "bg-wine-deep border-panel-border"}`}>
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${theme === "light" ? "bg-black" : "bg-rose"}`}
                    style={{
                      width: `${selectedTrackProgressPercent}%`,
                    }}
                  />
                </div>
              </div>

              <div className={`p-6 rounded border space-y-3.5 text-sm md:text-base font-mono ${theme === "light" ? "bg-neutral-50 border-neutral-200" : "bg-wine-deep border-panel-border"}`}>
                <div className="flex justify-between">
                  <span className={theme === "light" ? "text-neutral-500" : "text-mauve"}>{language === "pt" ? "streams totais:" : "total streams:"}</span>
                  <span className={`font-bold ${theme === "light" ? "text-neutral-950" : "text-rose"}`}>{formatNumber(selectedTrack.totalStreams)}</span>
                </div>
                <div className="flex justify-between">
                  <span className={theme === "light" ? "text-neutral-500" : "text-mauve"}>{language === "pt" ? "streams necessários:" : "streams needed:"}</span>
                  <span className={`font-bold ${theme === "light" ? "text-neutral-950" : "text-rose"}`}>
                    {formatNumber(selectedTrackRemainingStreams)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={theme === "light" ? "text-neutral-500" : "text-mauve"}>{language === "pt" ? "ganho diário:" : "daily gain velocity:"}</span>
                  <span className={`font-bold ${theme === "light" ? "text-neutral-950" : "text-rose"}`}>+{formatNumber(selectedTrack.dailyGain)}</span>
                </div>
                <div className={`flex justify-between border-t pt-3.5 mt-3.5 ${theme === "light" ? "border-neutral-200" : "border-panel-border"}`}>
                  <span className={theme === "light" ? "text-neutral-500" : "text-mauve"}>{language === "pt" ? "dias estimados para a meta:" : "est. days to goal:"}</span>
                  <span className={`font-bold ${theme === "light" ? "text-neutral-950" : "text-rose"}`}>
                    {selectedTrackDaysToGoal === null ? "—" : `${selectedTrackDaysToGoal} ${language === "pt" ? "dias" : "days"}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={theme === "light" ? "text-neutral-500" : "text-mauve"}>{language === "pt" ? "data prevista:" : "target date:"}</span>
                  <span className={`font-bold ${theme === "light" ? "text-neutral-950" : "text-rose"}`}>
                    {selectedTrackDaysToGoal === null ? "—" : getMilestoneDate(selectedTrackDaysToGoal)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setSelectedTrack(null)}
                className={`px-6 py-3 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border ${theme === "light" ? "bg-black hover:bg-neutral-800 text-white border-black" : "bg-rose hover:opacity-90 text-floral-bg border-rose"}`}
              >
                {t("streams.close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
