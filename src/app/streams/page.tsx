"use client";

import React, { useState, useMemo } from "react";
import { useSpotify } from "@/context/SpotifyContext";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";

import {
  getDaysToMilestone as getDaysUntilMilestone,
  getMilestoneForStreams,
  getMilestoneProgressPercent,
  getStreamsRemaining,
} from "@/lib/milestones";
import { calculateForecast } from "@/lib/forecasting";
import StreamChart from "@/components/StreamChart";

import {
  Search,
  Info,
  X,
  RefreshCw,
  ArrowDown,
  ArrowUp,
  Check
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
  spotifyAlbumId?: string;
  streams?: Record<string, { total: number; daily: number | null }>;
}

interface AlbumStat {
  id: string;
  title: string;
  year: string;
  totalStreams: number;
  dailyGain: number;
  coverUrl: string;
  spotifyAlbumId?: string;
  streams?: Record<string, { total: number; daily: number | null }>;
  tracklist?: string[];
}

type StreamTab = "albums" | "tracks" | "milestones";
type SortBy = "daily" | "total" | "pct";

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
    diff,
    pct
  };
};

const getAlbumGainDisplay = (album: AlbumStat, language: string) => {
  const dates = Object.keys(album.streams || {}).sort();
  if (dates.length < 2) {
    return null;
  }

  const todayDate = dates[dates.length - 1];
  const prevDate = dates[dates.length - 2];

  const todayEntry = album.streams![todayDate];
  const prevEntry = album.streams![prevDate];

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
    diff,
    pct
  };
};

const SURPASSED_TARGETS = [
  { value: 50_000_000, label: "50M" },
  { value: 100_000_000, label: "100M" },
  { value: 150_000_000, label: "150M" },
  { value: 200_000_000, label: "200M" },
  { value: 250_000_000, label: "250M" },
  { value: 300_000_000, label: "300M" },
  { value: 400_000_000, label: "400M" },
  { value: 500_000_000, label: "500M" },
  { value: 600_000_000, label: "600M" },
  { value: 700_000_000, label: "700M" },
  { value: 750_000_000, label: "750M" },
  { value: 800_000_000, label: "800M" },
  { value: 900_000_000, label: "900M" },
  { value: 1_000_000_000, label: "1B" },
  { value: 1_250_000_000, label: "1.25B" },
  { value: 1_500_000_000, label: "1.5B" },
  { value: 2_000_000_000, label: "2B" },
  { value: 2_500_000_000, label: "2.5B" },
  { value: 3_000_000_000, label: "3B" },
  { value: 4_000_000_000, label: "4B" },
  { value: 5_000_000_000, label: "5B" },
];

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
  const [albumSortBy, setAlbumSortBy] = useState<"daily" | "total" | "year" | "pct">("total");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  // Selected Track for Milestones Modal
  const [selectedTrack, setSelectedTrack] = useState<TrackStat | null>(null);
  // Selected Album for Milestones Modal
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumStat | null>(null);

  // Milestones Specific Filters
  const [milestoneSubTab, setMilestoneSubTab] = useState<"upcoming" | "surpassed">("upcoming");
  const [selectedSurpassedTarget, setSelectedSurpassedTarget] = useState<number>(100_000_000);

  const globalStats = useMemo(() => {
    if (albums.length === 0 && tracks.length === 0) {
      return {
        globalTotalStreams: 0,
        globalDailyStreams: 0,
        globalChange: null as { diff: number; pctStr: string; isUp: boolean } | null,
        mostStreamedAlbum: null as AlbumStat | null,
        mostStreamedTrack: null as TrackStat | null,
        biggestDailyGainer: null as TrackStat | null,
        biggestPctGainerTrack: null as (TrackStat & { pctChange: number }) | null,
      };
    }

    const globalTotalStreams = tracks.reduce((sum, t) => sum + (t.totalStreams || 0), 0);
    const globalDailyStreams = tracks.reduce((sum, t) => sum + (t.dailyGain || 0), 0);

    let globalChange = null;
    const trackWithHistory = tracks.filter(t => t.streams && Object.keys(t.streams).length >= 2);
    if (trackWithHistory.length > 0) {
      const dates = Object.keys(trackWithHistory[0].streams!).sort();
      if (dates.length >= 2) {
        const todayDate = dates[dates.length - 1];
        const prevDate = dates[dates.length - 2];

        const todaySum = tracks.reduce((sum, t) => {
          const entry = t.streams?.[todayDate];
          return sum + (entry?.daily ?? t.dailyGain ?? 0);
        }, 0);

        const prevSum = tracks.reduce((sum, t) => {
          const entry = t.streams?.[prevDate];
          return sum + (entry?.daily ?? 0);
        }, 0);

        if (prevSum > 0) {
          const diff = todaySum - prevSum;
          const pct = (diff / prevSum) * 100;
          globalChange = {
            diff,
            pctStr: Math.abs(pct).toFixed(1).replace(".", language === "pt" ? "," : "."),
            isUp: diff > 0,
          };
        }
      }
    }

    const mostStreamedAlbum = [...albums].sort((a, b) => b.totalStreams - a.totalStreams)[0] || null;
    const mostStreamedTrack = [...tracks].sort((a, b) => b.totalStreams - a.totalStreams)[0] || null;
    const biggestDailyGainer = [...tracks].sort((a, b) => b.dailyGain - a.dailyGain)[0] || null;

    let biggestPctGainerTrack: (TrackStat & { pctChange: number }) | null = null;
    let maxPct = -Infinity;

    tracks.forEach(t => {
      if (t.streams) {
        const dates = Object.keys(t.streams).sort();
        if (dates.length >= 2) {
          const todayDaily = t.streams[dates[dates.length - 1]].daily ?? 0;
          const prevDaily = t.streams[dates[dates.length - 2]].daily ?? 0;
          if (prevDaily > 0) {
            const pctVal = ((todayDaily - prevDaily) / prevDaily) * 100;
            if (pctVal > maxPct && todayDaily > 1000) {
              maxPct = pctVal;
              biggestPctGainerTrack = { ...t, pctChange: pctVal };
            }
          }
        }
      }
    });

    return {
      globalTotalStreams,
      globalDailyStreams,
      globalChange,
      mostStreamedAlbum,
      mostStreamedTrack,
      biggestDailyGainer,
      biggestPctGainerTrack,
    };
  }, [albums, tracks, language]);

  const upcomingMilestones = useMemo(() => {
    const allItems = tracks.map(t => ({ ...t, type: "track" }));

    return allItems
      .map(item => {
        const milestone = getMilestoneForStreams(item.totalStreams);
        const progressPercent = getMilestoneProgressPercent(item.totalStreams, milestone.milestoneTarget);
        const streamsRemaining = getStreamsRemaining(item.totalStreams, milestone.milestoneTarget);

        const dailyPace = item.dailyGain || item.avgDailyGain || 0;
        const forecast = calculateForecast(
          item.streams,
          item.totalStreams,
          milestone.milestoneTarget,
          dailyPace
        );

        return {
          ...item,
          milestone,
          progressPercent,
          streamsRemaining,
          daysToGoal: forecast.daysToGoal,
          dailyPace: forecast.dailyVelocity,
        };
      })
      .filter(item => item.progressPercent < 100)
      .sort((a, b) => {
        const aDays = a.daysToGoal === null || a.daysToGoal === undefined ? Infinity : a.daysToGoal;
        const bDays = b.daysToGoal === null || b.daysToGoal === undefined ? Infinity : b.daysToGoal;
        if (aDays !== bDays) {
          return aDays - bDays;
        }
        return b.progressPercent - a.progressPercent;
      });
  }, [tracks]);

  const surpassedItems = useMemo(() => {
    const allItems = tracks.map(t => ({ ...t, type: "track" }));

    return allItems
      .filter(item => item.totalStreams >= selectedSurpassedTarget)
      .sort((a, b) => b.totalStreams - a.totalStreams);
  }, [tracks, selectedSurpassedTarget]);

  const formatNumber = (num: any) => {
    if (num === null || num === undefined || isNaN(num)) return "0";
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
      let valA = 0;
      let valB = 0;
      if (sortBy === "daily") {
        valA = a.dailyGain;
        valB = b.dailyGain;
      } else if (sortBy === "pct") {
        const gainA = getTrackGainDisplay(a, language);
        const gainB = getTrackGainDisplay(b, language);
        valA = gainA?.pct ?? 0;
        valB = gainB?.pct ?? 0;
      } else {
        valA = a.totalStreams;
        valB = b.totalStreams;
      }
      return sortDirection === "desc" ? valB - valA : valA - valB;
    });
    return result;
  }, [tracks, searchQuery, sortBy, sortDirection, language]);

  const processedAlbums = useMemo(() => {
    let result = [...albums];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((a) => a.title.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      let valA = 0;
      let valB = 0;
      if (albumSortBy === "daily") {
        valA = a.dailyGain;
        valB = b.dailyGain;
      } else if (albumSortBy === "year") {
        valA = parseInt(a.year, 10) || 0;
        valB = parseInt(b.year, 10) || 0;
      } else if (albumSortBy === "pct") {
        const gainA = getAlbumGainDisplay(a, language);
        const gainB = getAlbumGainDisplay(b, language);
        valA = gainA?.pct ?? 0;
        valB = gainB?.pct ?? 0;
      } else {
        valA = a.totalStreams;
        valB = b.totalStreams;
      }
      return sortDirection === "desc" ? valB - valA : valA - valB;
    });
    return result;
  }, [albums, searchQuery, albumSortBy, sortDirection, language]);

  const getMilestoneDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const selectedTrackMilestone = selectedTrack ? getMilestoneForStreams(selectedTrack.totalStreams) : null;

  const forecast = useMemo(() => {
    if (!selectedTrack || !selectedTrackMilestone) {
      return { daysToGoal: null, dailyVelocity: 0 };
    }
    return calculateForecast(
      selectedTrack.streams,
      selectedTrack.totalStreams,
      selectedTrackMilestone.milestoneTarget,
      selectedTrack.dailyGain || selectedTrack.avgDailyGain || 0
    );
  }, [selectedTrack, selectedTrackMilestone]);

  const selectedTrackDaysToGoal = forecast.daysToGoal;
  const selectedTrackPace = forecast.dailyVelocity;
  const selectedTrackRemainingStreams =
    selectedTrackMilestone && selectedTrack
      ? getStreamsRemaining(selectedTrack.totalStreams, selectedTrackMilestone.milestoneTarget)
      : 0;
  const selectedTrackProgressPercent =
    selectedTrackMilestone && selectedTrack
      ? getMilestoneProgressPercent(selectedTrack.totalStreams, selectedTrackMilestone.milestoneTarget)
      : 0;

  // Selected Album Milestones & Projections
  const selectedAlbumMilestone = selectedAlbum ? getMilestoneForStreams(selectedAlbum.totalStreams) : null;

  const albumForecast = useMemo(() => {
    if (!selectedAlbum || !selectedAlbumMilestone) {
      return { daysToGoal: null, dailyVelocity: 0 };
    }
    return calculateForecast(
      selectedAlbum.streams,
      selectedAlbum.totalStreams,
      selectedAlbumMilestone.milestoneTarget,
      selectedAlbum.dailyGain || 0
    );
  }, [selectedAlbum, selectedAlbumMilestone]);

  const selectedAlbumDaysToGoal = albumForecast.daysToGoal;
  const selectedAlbumPace = albumForecast.dailyVelocity;
  const selectedAlbumRemainingStreams =
    selectedAlbumMilestone && selectedAlbum
      ? getStreamsRemaining(selectedAlbum.totalStreams, selectedAlbumMilestone.milestoneTarget)
      : 0;
  const selectedAlbumProgressPercent =
    selectedAlbumMilestone && selectedAlbum
      ? getMilestoneProgressPercent(selectedAlbum.totalStreams, selectedAlbumMilestone.milestoneTarget)
      : 0;

  const albumTracks = useMemo(() => {
    if (!selectedAlbum) return [];
    if (selectedAlbum.tracklist && Array.isArray(selectedAlbum.tracklist)) {
      return selectedAlbum.tracklist
        .map((id) => tracks.find((t) => t.id === id || t.spotifyTrackId === id))
        .filter((t): t is TrackStat => !!t);
    }
    const albumId = selectedAlbum.spotifyAlbumId || selectedAlbum.id;
    return tracks.filter((t) => t.spotifyAlbumId === albumId);
  }, [selectedAlbum, tracks]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* DYNAMIC HERO STATS BANNER */}
      <div className={`glass-panel p-6 flex flex-col md:flex-row items-center gap-6 ${theme === "light" ? "bg-white border-neutral-200" : "bg-wine-deep/40 border-panel-border/30"}`}>
        {/* Left: Album cover of most streamed album or dynamic artist banner */}
        {/* Left: Artist Image */}
        <div className="relative w-full md:w-44 h-44 flex-shrink-0 overflow-hidden rounded border border-panel-border/10">
          <img
            src="https://i.scdn.co/image/ab67616d0000b273b622d42c30697e1e1414343c"
            alt="Ariana Grande"
            className="w-full h-full object-cover filter brightness-95"
          />
        </div>

        {/* Middle: Global Stats */}
        <div className="flex-1 min-w-0 py-1">
          <span className="text-[10px] font-serif uppercase tracking-widest text-mauve block mb-0.5">
            {language === "pt" ? "estatísticas da artista" : "artist statistics"}
          </span>
          <h2 className="text-2xl md:text-3xl font-serif text-rose font-bold mb-1.5 tracking-wider lowercase">
            ariana grande
          </h2>
          <div className="flex flex-col gap-1 mt-1">
            {/* Daily streams */}
            <div className="flex items-baseline gap-2 font-mono">
              <span className="text-3xl md:text-4xl font-extrabold text-rose">
                {formatNumber(globalStats.globalDailyStreams)}
              </span>
              <span className="text-xs text-mauve font-serif lowercase">
                {language === "pt" ? "streams diários" : "daily streams"}
              </span>
            </div>

            {/* Change */}
            {globalStats.globalChange && (
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs font-mono font-bold ${globalStats.globalChange.isUp ? "text-emerald-500" : "text-rose-hover"}`}>
                  {globalStats.globalChange.isUp ? "+" : ""}{formatNumber(globalStats.globalChange.diff)} ({globalStats.globalChange.isUp ? "+" : ""}{globalStats.globalChange.pctStr}%)
                </span>
                <span className="text-[10px] text-mauve font-serif lowercase">
                  {language === "pt" ? "vs. ontem" : "vs. yesterday"}
                </span>
              </div>
            )}

            {/* Total discography streams */}
            <div className="text-xs text-mauve mt-2 border-t border-panel-border/20 pt-2 flex items-center gap-2 font-mono">
              <span className="font-bold text-rose">{formatNumber(globalStats.globalTotalStreams)}</span>
              <span className="font-serif lowercase">{language === "pt" ? "streams totais" : "total streams"}</span>
            </div>
          </div>
        </div>

        {/* Right: Key highlights cards */}
        <div className="w-full md:w-72 flex flex-col gap-2 flex-shrink-0">
          {/* Highlight 1: Most Streamed Song */}
          {globalStats.mostStreamedTrack && (
            <div className={`p-2.5 rounded border border-panel-border/15 flex items-center gap-3 ${theme === "light" ? "bg-neutral-50/60" : "bg-wine-deep/20"}`}>
              <img src={globalStats.mostStreamedTrack.coverUrl} alt={globalStats.mostStreamedTrack.title} className="w-9 h-9 rounded object-cover border border-panel-border/10" />
              <div className="flex-1 min-w-0">
                <span className="text-[8px] uppercase tracking-widest text-mauve block leading-none">{language === "pt" ? "música mais ouvida" : "most streamed song"}</span>
                <span className="text-xs font-serif font-bold block truncate leading-tight mt-1 text-rose lowercase">{globalStats.mostStreamedTrack.title}</span>
                <span className="text-[10px] font-mono text-mauve leading-none block mt-0.5">{formatNumber(globalStats.mostStreamedTrack.totalStreams)}</span>
              </div>
            </div>
          )}

          {/* Highlight 2: Biggest Daily Gainer */}
          {globalStats.biggestDailyGainer && (
            <div className={`p-2.5 rounded border border-panel-border/15 flex items-center gap-3 ${theme === "light" ? "bg-neutral-50/60" : "bg-wine-deep/20"}`}>
              <img src={globalStats.biggestDailyGainer.coverUrl} alt={globalStats.biggestDailyGainer.title} className="w-9 h-9 rounded object-cover border border-panel-border/10" />
              <div className="flex-1 min-w-0">
                <span className="text-[8px] uppercase tracking-widest text-mauve block leading-none">{language === "pt" ? "maior ganho diário" : "biggest daily gainer"}</span>
                <span className="text-xs font-serif font-bold block truncate leading-tight mt-1 text-rose lowercase">{globalStats.biggestDailyGainer.title}</span>
                <span className="text-[10px] font-mono text-emerald-500 font-semibold leading-none block mt-0.5">+{formatNumber(globalStats.biggestDailyGainer.dailyGain)}</span>
              </div>
            </div>
          )}

          {/* Highlight 3: Biggest % Gainer */}
          {globalStats.biggestPctGainerTrack && (
            <div className={`p-2.5 rounded border border-panel-border/15 flex items-center gap-3 ${theme === "light" ? "bg-neutral-50/60" : "bg-wine-deep/20"}`}>
              <img src={globalStats.biggestPctGainerTrack.coverUrl} alt={globalStats.biggestPctGainerTrack.title} className="w-9 h-9 rounded object-cover border border-panel-border/10" />
              <div className="flex-1 min-w-0">
                <span className="text-[8px] uppercase tracking-widest text-mauve block leading-none">{language === "pt" ? "maior crescimento %" : "biggest % gainer"}</span>
                <span className="text-xs font-serif font-bold block truncate leading-tight mt-1 text-rose lowercase">{globalStats.biggestPctGainerTrack.title}</span>
                <span className="text-[10px] font-mono text-emerald-500 font-semibold leading-none block mt-0.5">+{globalStats.biggestPctGainerTrack.pctChange.toFixed(1)}%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={`glass-panel p-6 lg:p-8 ${theme === "light" ? "bg-white" : "bg-neutral-950/10"}`}>
        {/* Segment control */}
        <div className={`flex p-1 border max-w-sm mb-6 rounded ${theme === "light" ? "bg-neutral-100 border-neutral-200" : "bg-neutral-950 border-neutral-900"}`}>
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
          <button
            onClick={() => setStreamTab("milestones")}
            className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-all cursor-pointer ${streamTab === "milestones"
                ? (theme === "light" ? "bg-black text-white font-extrabold" : "bg-white text-black font-extrabold")
                : (theme === "light" ? "text-neutral-500 hover:text-black" : "text-neutral-400 hover:text-white")
              }`}
          >
            {language === "pt" ? "metas" : "milestones"}
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
        {streamTab !== "milestones" && (
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
            </div>

            {/* Search Bar + Sort Dropdown Container */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto relative z-30">
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

              {/* Custom Sort Dropdown */}
              <div className="relative w-full sm:w-auto flex-shrink-0">
                <button
                  onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                  className={`w-full sm:w-auto px-4 py-2 text-xs font-bold uppercase tracking-wider border rounded flex items-center justify-between sm:justify-start gap-2 transition-all cursor-pointer ${
                    theme === "light" 
                      ? "bg-neutral-50 border-neutral-300 text-neutral-800 hover:border-black hover:text-black" 
                      : "bg-wine-deep/30 border-panel-border/30 text-rose hover:border-rose"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{language === "pt" ? "ORDENAR" : "SORT"}</span>
                    <span className="font-serif lowercase font-normal italic opacity-85">
                      {streamTab === "tracks" 
                        ? (sortBy === "daily" ? (language === "pt" ? "daily" : "daily") : sortBy === "pct" ? "%" : (language === "pt" ? "total" : "total"))
                        : (albumSortBy === "daily" ? (language === "pt" ? "daily" : "daily") : albumSortBy === "year" ? (language === "pt" ? "ano" : "year") : albumSortBy === "pct" ? "%" : (language === "pt" ? "total" : "total"))
                      }
                    </span>
                  </div>
                  {sortDirection === "desc" ? <ArrowDown className="w-3.5 h-3.5" /> : <ArrowUp className="w-3.5 h-3.5" />}
                </button>

                {isSortDropdownOpen && (
                  <>
                    {/* Overlay backdrop to close dropdown */}
                    <div className="fixed inset-0 z-10" onClick={() => setIsSortDropdownOpen(false)} />
                    
                    <div className={`absolute right-0 mt-2 w-48 rounded border shadow-lg z-20 p-3 animate-fade-in ${
                      theme === "light" 
                        ? "bg-white border-neutral-200 text-neutral-900" 
                        : "bg-wine-deep border-panel-border text-rose"
                    }`}>
                      <span className={`text-[9px] font-bold uppercase tracking-widest block mb-2 ${theme === "light" ? "text-neutral-400" : "text-mauve"}`}>
                        {language === "pt" ? "ORDENAR POR" : "SORT BY"}
                      </span>
                      <div className="space-y-1.5 mb-3 pb-3 border-b border-panel-border/20">
                        {streamTab === "tracks" ? (
                          <>
                            {/* Tracks sorting options */}
                            <button
                              onClick={() => {
                                setSortBy("total");
                                setIsSortDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between text-xs py-1.5 px-2 rounded transition-all cursor-pointer ${
                                sortBy === "total" 
                                  ? (theme === "light" ? "bg-neutral-100 font-bold" : "bg-wine-deep-light font-bold text-rose") 
                                  : "hover:bg-neutral-50/50 dark:hover:bg-wine-deep-light/40"
                              }`}
                            >
                              <span>{language === "pt" ? "Total" : "Total"}</span>
                              {sortBy === "total" && <Check className="w-3 h-3" />}
                            </button>
                            <button
                              onClick={() => {
                                setSortBy("daily");
                                setIsSortDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between text-xs py-1.5 px-2 rounded transition-all cursor-pointer ${
                                sortBy === "daily" 
                                  ? (theme === "light" ? "bg-neutral-100 font-bold" : "bg-wine-deep-light font-bold text-rose") 
                                  : "hover:bg-neutral-50/50 dark:hover:bg-wine-deep-light/40"
                              }`}
                            >
                              <span>{language === "pt" ? "Daily" : "Daily"}</span>
                              {sortBy === "daily" && <Check className="w-3 h-3" />}
                            </button>
                            <button
                              onClick={() => {
                                setSortBy("pct");
                                setIsSortDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between text-xs py-1.5 px-2 rounded transition-all cursor-pointer ${
                                sortBy === "pct" 
                                  ? (theme === "light" ? "bg-neutral-100 font-bold" : "bg-wine-deep-light font-bold text-rose") 
                                  : "hover:bg-neutral-50/50 dark:hover:bg-wine-deep-light/40"
                              }`}
                            >
                              <span>{language === "pt" ? "% de ganho" : "% gain"}</span>
                              {sortBy === "pct" && <Check className="w-3 h-3" />}
                            </button>
                          </>
                        ) : (
                          <>
                            {/* Albums sorting options */}
                            <button
                              onClick={() => {
                                setAlbumSortBy("total");
                                setIsSortDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between text-xs py-1.5 px-2 rounded transition-all cursor-pointer ${
                                albumSortBy === "total" 
                                  ? (theme === "light" ? "bg-neutral-100 font-bold" : "bg-wine-deep-light font-bold text-rose") 
                                  : "hover:bg-neutral-50/50 dark:hover:bg-wine-deep-light/40"
                              }`}
                            >
                              <span>{language === "pt" ? "Total" : "Total"}</span>
                              {albumSortBy === "total" && <Check className="w-3 h-3" />}
                            </button>
                            <button
                              onClick={() => {
                                setAlbumSortBy("daily");
                                setIsSortDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between text-xs py-1.5 px-2 rounded transition-all cursor-pointer ${
                                albumSortBy === "daily" 
                                  ? (theme === "light" ? "bg-neutral-100 font-bold" : "bg-wine-deep-light font-bold text-rose") 
                                  : "hover:bg-neutral-50/50 dark:hover:bg-wine-deep-light/40"
                              }`}
                            >
                              <span>{language === "pt" ? "Daily" : "Daily"}</span>
                              {albumSortBy === "daily" && <Check className="w-3 h-3" />}
                            </button>
                            <button
                              onClick={() => {
                                setAlbumSortBy("pct");
                                setIsSortDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between text-xs py-1.5 px-2 rounded transition-all cursor-pointer ${
                                albumSortBy === "pct" 
                                  ? (theme === "light" ? "bg-neutral-100 font-bold" : "bg-wine-deep-light font-bold text-rose") 
                                  : "hover:bg-neutral-50/50 dark:hover:bg-wine-deep-light/40"
                              }`}
                            >
                              <span>{language === "pt" ? "% de ganho" : "% gain"}</span>
                              {albumSortBy === "pct" && <Check className="w-3 h-3" />}
                            </button>
                            <button
                              onClick={() => {
                                setAlbumSortBy("year");
                                setIsSortDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between text-xs py-1.5 px-2 rounded transition-all cursor-pointer ${
                                albumSortBy === "year" 
                                  ? (theme === "light" ? "bg-neutral-100 font-bold" : "bg-wine-deep-light font-bold text-rose") 
                                  : "hover:bg-neutral-50/50 dark:hover:bg-wine-deep-light/40"
                              }`}
                            >
                              <span>{language === "pt" ? "Release Year" : "Release Year"}</span>
                              {albumSortBy === "year" && <Check className="w-3 h-3" />}
                            </button>
                          </>
                        )}
                      </div>

                      <span className={`text-[9px] font-bold uppercase tracking-widest block mb-2 ${theme === "light" ? "text-neutral-400" : "text-mauve"}`}>
                        {language === "pt" ? "DIREÇÃO" : "DIRECTION"}
                      </span>
                      <div className="space-y-1">
                        <button
                          onClick={() => {
                            setSortDirection("desc");
                            setIsSortDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between text-xs py-1.5 px-2 rounded transition-all cursor-pointer ${
                            sortDirection === "desc" 
                              ? (theme === "light" ? "bg-neutral-100 font-bold" : "bg-wine-deep-light font-bold text-rose") 
                              : "hover:bg-neutral-50/50 dark:hover:bg-wine-deep-light/40"
                          }`}
                        >
                          <span>{language === "pt" ? "Maior para menor" : "High to low"}</span>
                          {sortDirection === "desc" && <Check className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={() => {
                            setSortDirection("asc");
                            setIsSortDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between text-xs py-1.5 px-2 rounded transition-all cursor-pointer ${
                            sortDirection === "asc" 
                              ? (theme === "light" ? "bg-neutral-100 font-bold" : "bg-wine-deep-light font-bold text-rose") 
                              : "hover:bg-neutral-50/50 dark:hover:bg-wine-deep-light/40"
                          }`}
                        >
                          <span>{language === "pt" ? "Menor para maior" : "Low to high"}</span>
                          {sortDirection === "asc" && <Check className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Milestones Sub-tabs & Target Filters */}
        {streamTab === "milestones" && (
          <div className="space-y-6 mb-6 pb-6 border-b border-panel-border/20">
            {/* Milestones Sub-tabs */}
            <div className="flex gap-4">
              <button
                onClick={() => setMilestoneSubTab("upcoming")}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border transition-all cursor-pointer ${
                  milestoneSubTab === "upcoming"
                    ? (theme === "light" ? "bg-black border-black text-white" : "bg-rose border-rose text-floral-bg")
                    : (theme === "light" ? "border-neutral-350 text-neutral-500 hover:text-black" : "border-neutral-850 text-mauve hover:text-white")
                }`}
              >
                {language === "pt" ? "próximas" : "upcoming"}
              </button>
              <button
                onClick={() => setMilestoneSubTab("surpassed")}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border transition-all cursor-pointer ${
                  milestoneSubTab === "surpassed"
                    ? (theme === "light" ? "bg-black border-black text-white" : "bg-rose border-rose text-floral-bg")
                    : (theme === "light" ? "border-neutral-350 text-neutral-500 hover:text-black" : "border-neutral-850 text-mauve hover:text-white")
                }`}
              >
                {language === "pt" ? "superadas" : "surpassed"}
              </button>
            </div>

            {/* If Surpassed is active, show milestone threshold selector pills */}
            {milestoneSubTab === "surpassed" && (
              <div className="space-y-3">
                <span className={`text-[10px] font-bold uppercase tracking-wider block ${theme === "light" ? "text-neutral-500" : "text-mauve"}`}>
                  {language === "pt" ? "filtrar por meta:" : "filter by milestone target:"}
                </span>
                <div className="flex flex-wrap gap-2 pt-1">
                  {SURPASSED_TARGETS.map((pill) => (
                    <button
                      key={pill.value}
                      onClick={() => setSelectedSurpassedTarget(pill.value)}
                      className={`px-3 py-1.5 font-mono text-xs border rounded transition-all cursor-pointer ${
                        selectedSurpassedTarget === pill.value
                          ? (theme === "light" ? "bg-black border-black text-white font-bold" : "bg-rose border-rose text-floral-bg font-bold")
                          : (theme === "light" ? "bg-transparent border-neutral-300 text-neutral-600 hover:border-black hover:text-black" : "bg-transparent border-neutral-800 text-mauve hover:border-white hover:text-rose")
                      }`}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

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
              <span className="text-right">{language === "pt" ? "streams / ganho (dif)" : "streams / gain (diff)"}</span>
            </div>

            {processedAlbums.length === 0 ? (
              <div className={`text-center py-12 text-xs ${theme === "light" ? "text-neutral-500" : "text-neutral-500"}`}>
                {language === "pt" ? "nenhum álbum encontrado." : "no albums match your search."}
              </div>
            ) : (
              processedAlbums.map((album) => (
                <div
                  key={album.id}
                  onClick={() => setSelectedAlbum(album)}
                  className={`flex items-center justify-between p-4 rounded border transition-all cursor-pointer group ${theme === "light" ? "border-transparent hover:border-neutral-300 hover:bg-neutral-50" : "border-transparent hover:border-neutral-800 hover:bg-neutral-950/60"}`}
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={album.coverUrl}
                      alt={album.title}
                      className={`w-14 h-14 rounded object-cover border ${theme === "light" ? "border-neutral-200" : "border-neutral-900"}`}
                    />
                    <div>
                      <span className={`text-base md:text-lg font-bold block leading-tight group-hover:underline ${theme === "light" ? "text-neutral-950" : "text-white"}`}>
                        {album.title}
                      </span>
                      <span className={`text-xs block mt-1 ${theme === "light" ? "text-neutral-600" : "text-neutral-400"}`}>{album.year}</span>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <span className={`text-base md:text-lg font-bold block ${theme === "light" ? "text-neutral-950" : "text-white"}`}>
                      {formatNumber(album.totalStreams)}
                    </span>
                    <div className="flex items-center justify-end gap-2 mt-1">
                      <span className={`text-xs font-semibold ${theme === "light" ? "text-neutral-700" : "text-neutral-300"}`}>
                        +{formatNumber(album.dailyGain)}
                      </span>
                      {(() => {
                        const gainDisplay = getAlbumGainDisplay(album, language);
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

        {/* MILESTONES LIST */}
        {streamTab === "milestones" && (
          <div className="space-y-4">
            {milestoneSubTab === "upcoming" ? (
              <div className="space-y-3">
                <div className={`flex justify-between text-[10px] font-bold uppercase tracking-wider px-4 pb-3 border-b ${theme === "light" ? "text-neutral-500 border-neutral-200" : "text-neutral-500 border-neutral-900/60"}`}>
                  <span>{language === "pt" ? "música" : "track"}</span>
                  <span className="text-right">{language === "pt" ? "meta / previsão" : "target / forecast"}</span>
                </div>

                {upcomingMilestones.length === 0 ? (
                  <div className={`text-center py-12 text-xs ${theme === "light" ? "text-neutral-500" : "text-neutral-500"}`}>
                    {language === "pt" ? "nenhuma meta futura encontrada." : "no upcoming milestones found."}
                  </div>
                ) : (
                  upcomingMilestones.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedTrack(item as any)}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded border transition-all cursor-pointer gap-4 group ${theme === "light" ? "border-transparent hover:border-neutral-305 hover:bg-neutral-50" : "border-transparent hover:border-neutral-805 hover:bg-neutral-950/60"}`}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <img
                          src={item.coverUrl}
                          alt={item.title}
                          className={`w-14 h-14 rounded object-cover border flex-shrink-0 ${theme === "light" ? "border-neutral-205" : "border-neutral-905"}`}
                        />
                        <div className="flex-1 min-w-0">
                          <span className={`text-base md:text-lg font-bold block leading-tight group-hover:shop-underline-hover truncate ${theme === "light" ? "text-neutral-950" : "text-white"}`}>
                            {item.title}
                          </span>
                          <span className={`text-[10px] uppercase font-bold tracking-wider ${theme === "light" ? "text-neutral-500" : "text-mauve"} block mt-1`}>
                            {language === "pt" ? "música" : "track"} • {item.artist}
                          </span>
                          
                          {/* Progress bar */}
                          <div className="flex items-center gap-3 mt-2">
                            <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${theme === "light" ? "bg-neutral-200" : "bg-neutral-900"}`}>
                              <div
                                className={`h-full rounded-full ${theme === "light" ? "bg-black" : "bg-rose"}`}
                                style={{ width: `${item.progressPercent}%` }}
                              />
                            </div>
                            <span className="font-mono text-xs font-bold leading-none">{item.progressPercent.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-left sm:text-right flex sm:flex-col justify-between sm:justify-center items-center sm:items-end font-mono">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${theme === "light" ? "bg-black text-white" : "bg-rose text-floral-bg"}`}>
                            {SURPASSED_TARGETS.find(t => t.value === item.milestone.milestoneTarget)?.label || "target"}
                          </span>
                          <span className={`text-xs ${theme === "light" ? "text-neutral-500" : "text-mauve"}`}>
                            {language === "pt" ? "falta " : ""}{formatNumber(item.streamsRemaining)}{language === "pt" ? "" : " to go"}
                          </span>
                        </div>
                        <span className={`text-xs font-serif lowercase mt-1 block ${theme === "light" ? "text-neutral-700" : "text-neutral-400"}`}>
                          {item.daysToGoal === null ? (
                            "velocity unknown"
                          ) : (
                            <>
                              {getMilestoneDate(item.daysToGoal)}
                              <span className="text-[10px] font-mono ml-1.5 opacity-80">
                                ({item.daysToGoal}d)
                              </span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className={`flex items-baseline justify-between border-b pb-2 ${theme === "light" ? "border-neutral-200" : "border-neutral-900"}`}>
                  <h3 className="text-lg font-serif text-rose font-bold mb-1 tracking-wide lowercase">
                    {language === "pt"
                      ? `o clube de ${SURPASSED_TARGETS.find(t => t.value === selectedSurpassedTarget)?.label || ""}`
                      : `the ${SURPASSED_TARGETS.find(t => t.value === selectedSurpassedTarget)?.label || ""} club`}
                  </h3>
                  <span className={`text-xs font-mono font-bold ${theme === "light" ? "text-neutral-500" : "text-mauve"}`}>
                    {surpassedItems.length} {language === "pt" ? "membros" : "members"}
                  </span>
                </div>

                {surpassedItems.length === 0 ? (
                  <div className={`text-center py-12 text-xs ${theme === "light" ? "text-neutral-500" : "text-neutral-500"}`}>
                    {language === "pt" ? "nenhuma música superou esta meta ainda." : "no tracks have surpassed this milestone yet."}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {surpassedItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedTrack(item as any)}
                        className={`flex items-center justify-between p-3.5 rounded border transition-all cursor-pointer group ${
                          theme === "light" 
                            ? "border-neutral-200 hover:border-black bg-neutral-50/50" 
                            : "border-neutral-900 hover:border-rose bg-wine-deep/30"
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <img
                            src={item.coverUrl}
                            alt={item.title}
                            className={`w-12 h-12 rounded object-cover border flex-shrink-0 ${theme === "light" ? "border-neutral-200" : "border-neutral-900"}`}
                          />
                          <div className="min-w-0">
                            <span className={`text-sm md:text-base font-bold block leading-snug group-hover:underline truncate ${theme === "light" ? "text-neutral-950" : "text-white"}`}>
                              {item.title}
                            </span>
                            <span className={`text-[9px] uppercase font-bold tracking-wider ${theme === "light" ? "text-neutral-500" : "text-mauve"} block mt-0.5`}>
                              {language === "pt" ? "música" : "track"}
                            </span>
                          </div>
                        </div>

                        <div className="text-right font-mono flex-shrink-0 flex items-center gap-2">
                          <span className={`text-xs font-bold ${theme === "light" ? "text-neutral-950" : "text-rose"}`}>
                            {formatNumber(item.totalStreams)}
                          </span>
                          <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded ${theme === "light" ? "bg-black text-white" : "bg-rose text-floral-bg"}`}>
                            {SURPASSED_TARGETS.find(t => t.value === selectedSurpassedTarget)?.label || "passed"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MILESTONE PROGRESS MODAL POPUP */}
      {selectedTrack && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className={`w-full max-w-2xl rounded-lg p-4 md:p-8 relative animate-slide-up max-h-[90vh] overflow-y-auto ${theme === "light" ? "bg-white border border-neutral-200 text-neutral-950" : "bg-wine border border-panel-border text-rose"}`}>
            <button
              onClick={() => setSelectedTrack(null)}
              className={`absolute top-4 right-4 md:top-6 md:right-6 p-2 rounded-full transition-all cursor-pointer ${theme === "light" ? "hover:bg-neutral-100 text-neutral-500 hover:text-black" : "hover:bg-wine-deep text-mauve hover:text-rose"}`}
            >
              <X className="w-5 h-5 md:w-6 md:h-6" />
            </button>

            <div className={`flex flex-col sm:flex-row gap-4 sm:gap-6 mb-6 items-center sm:items-start border-b pb-6 text-center sm:text-left ${theme === "light" ? "border-neutral-200" : "border-panel-border"}`}>
              <img
                src={selectedTrack.coverUrl}
                alt={selectedTrack.title}
                className={`w-20 h-20 rounded-md object-cover border shadow-md ${theme === "light" ? "border-neutral-200" : "border-panel-border"}`}
              />
              <div className="flex-1 min-w-0">
                <h3 className={`text-xl md:text-3xl font-serif tracking-wide leading-tight ${theme === "light" ? "text-neutral-950" : "text-rose"}`}>{selectedTrack.title}</h3>
                <p className={`text-xs md:text-sm mt-1.5 font-serif uppercase tracking-wider ${theme === "light" ? "text-neutral-500" : "text-mauve"}`}>{selectedTrack.artist}</p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <div className={`flex justify-between text-[10px] md:text-xs font-bold uppercase tracking-wider mb-2.5 ${theme === "light" ? "text-neutral-500" : "text-mauve"}`}>
                  <span>{language === "pt" ? "progresso para" : "progress to"} {selectedTrackMilestone?.milestoneName ?? selectedTrack.milestoneName}</span>
                  <span className={`font-extrabold text-xs md:text-sm ${theme === "light" ? "text-neutral-950" : "text-rose"}`}>
                    {Math.round(selectedTrackProgressPercent * 10) / 10}%
                  </span>
                </div>

                <div className={`w-full h-2.5 border rounded-full overflow-hidden ${theme === "light" ? "bg-neutral-100 border-neutral-200" : "bg-wine-deep border-panel-border"}`}>
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${theme === "light" ? "bg-black" : "bg-rose"}`}
                    style={{
                      width: `${selectedTrackProgressPercent}%`,
                    }}
                  />
                </div>
              </div>

              <div className={`p-4 md:p-6 rounded border space-y-3 md:space-y-3.5 text-xs md:text-sm font-mono ${theme === "light" ? "bg-neutral-50 border-neutral-200" : "bg-wine-deep border-panel-border"}`}>
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
                  <span className={`font-bold ${theme === "light" ? "text-neutral-950" : "text-rose"}`}>+{formatNumber(selectedTrackPace)}</span>
                </div>
                <div className={`flex justify-between border-t pt-3 mt-3 ${theme === "light" ? "border-neutral-200" : "border-panel-border"}`}>
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

              {/* Interactive Stream Chart */}
              {selectedTrack.streams && (
                <div className={`p-3.5 md:p-5 rounded border ${theme === "light" ? "bg-neutral-50 border-neutral-200" : "bg-wine-deep/40 border-panel-border"}`}>
                  <h4 className={`text-[10px] md:text-xs font-bold uppercase tracking-wider mb-3 font-sans ${theme === "light" ? "text-neutral-500" : "text-mauve"}`}>
                    {language === "pt" ? "gráfico de desempenho histórico" : "historical performance chart"}
                  </h4>
                  <StreamChart streams={selectedTrack.streams} theme={theme} language={language} />
                </div>
              )}
            </div>

            <div className="mt-6 md:mt-8 flex justify-end">
              <button
                onClick={() => setSelectedTrack(null)}
                className={`w-full sm:w-auto px-6 py-3 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border ${theme === "light" ? "bg-black hover:bg-neutral-800 text-white border-black" : "bg-rose hover:opacity-90 text-floral-bg border-rose"}`}
              >
                {t("streams.close")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ALBUM MILESTONE PROGRESS MODAL POPUP */}
      {selectedAlbum && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className={`w-full max-w-2xl rounded-lg p-4 md:p-8 relative animate-slide-up max-h-[90vh] overflow-y-auto ${theme === "light" ? "bg-white border border-neutral-200 text-neutral-950" : "bg-wine border border-panel-border text-rose"}`}>
            <button
              onClick={() => setSelectedAlbum(null)}
              className={`absolute top-4 right-4 md:top-6 md:right-6 p-2 rounded-full transition-all cursor-pointer ${theme === "light" ? "hover:bg-neutral-100 text-neutral-500 hover:text-black" : "hover:bg-wine-deep text-mauve hover:text-rose"}`}
            >
              <X className="w-5 h-5 md:w-6 md:h-6" />
            </button>

            <div className={`flex flex-col sm:flex-row gap-4 sm:gap-6 mb-6 items-center sm:items-start border-b pb-6 text-center sm:text-left ${theme === "light" ? "border-neutral-200" : "border-panel-border"}`}>
              <img
                src={selectedAlbum.coverUrl}
                alt={selectedAlbum.title}
                className={`w-20 h-20 rounded-md object-cover border shadow-md ${theme === "light" ? "border-neutral-200" : "border-panel-border"}`}
              />
              <div className="flex-1 min-w-0">
                <h3 className={`text-xl md:text-3xl font-serif tracking-wide leading-tight ${theme === "light" ? "text-neutral-950" : "text-rose"}`}>{selectedAlbum.title}</h3>
                <p className={`text-xs md:text-sm mt-1.5 font-serif uppercase tracking-wider ${theme === "light" ? "text-neutral-500" : "text-mauve"}`}>Ariana Grande</p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <div className={`flex justify-between text-[10px] md:text-xs font-bold uppercase tracking-wider mb-2.5 ${theme === "light" ? "text-neutral-500" : "text-mauve"}`}>
                  <span>{language === "pt" ? "progresso para" : "progress to"} {selectedAlbumMilestone?.milestoneName}</span>
                  <span className={`font-extrabold text-xs md:text-sm ${theme === "light" ? "text-neutral-950" : "text-rose"}`}>
                    {Math.round(selectedAlbumProgressPercent * 10) / 10}%
                  </span>
                </div>

                <div className={`w-full h-2.5 border rounded-full overflow-hidden ${theme === "light" ? "bg-neutral-100 border-neutral-200" : "bg-wine-deep border-panel-border"}`}>
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${theme === "light" ? "bg-black" : "bg-rose"}`}
                    style={{
                      width: `${selectedAlbumProgressPercent}%`,
                    }}
                  />
                </div>
              </div>

              <div className={`p-4 md:p-6 rounded border space-y-3 md:space-y-3.5 text-xs md:text-sm font-mono ${theme === "light" ? "bg-neutral-50 border-neutral-200" : "bg-wine-deep border-panel-border"}`}>
                <div className="flex justify-between">
                  <span className={theme === "light" ? "text-neutral-500" : "text-mauve"}>{language === "pt" ? "streams totais:" : "total streams:"}</span>
                  <span className={`font-bold ${theme === "light" ? "text-neutral-950" : "text-rose"}`}>{formatNumber(selectedAlbum.totalStreams)}</span>
                </div>
                <div className="flex justify-between">
                  <span className={theme === "light" ? "text-neutral-500" : "text-mauve"}>{language === "pt" ? "streams necessários:" : "streams needed:"}</span>
                  <span className={`font-bold ${theme === "light" ? "text-neutral-950" : "text-rose"}`}>
                    {formatNumber(selectedAlbumRemainingStreams)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={theme === "light" ? "text-neutral-500" : "text-mauve"}>{language === "pt" ? "ganho diário:" : "daily gain velocity:"}</span>
                  <span className={`font-bold ${theme === "light" ? "text-neutral-950" : "text-rose"}`}>+{formatNumber(selectedAlbumPace)}</span>
                </div>
                <div className={`flex justify-between border-t pt-3 mt-3 ${theme === "light" ? "border-neutral-200" : "border-panel-border"}`}>
                  <span className={theme === "light" ? "text-neutral-500" : "text-mauve"}>{language === "pt" ? "dias estimados para a meta:" : "est. days to goal:"}</span>
                  <span className={`font-bold ${theme === "light" ? "text-neutral-950" : "text-rose"}`}>
                    {selectedAlbumDaysToGoal === null ? "—" : `${selectedAlbumDaysToGoal} ${language === "pt" ? "dias" : "days"}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={theme === "light" ? "text-neutral-500" : "text-mauve"}>{language === "pt" ? "data prevista:" : "target date:"}</span>
                  <span className={`font-bold ${theme === "light" ? "text-neutral-950" : "text-rose"}`}>
                    {selectedAlbumDaysToGoal === null ? "—" : getMilestoneDate(selectedAlbumDaysToGoal)}
                  </span>
                </div>
              </div>

              {/* Album Tracklist */}
              {albumTracks.length > 0 && (
                <div className={`p-3.5 md:p-5 rounded border ${theme === "light" ? "bg-neutral-50 border-neutral-200" : "bg-wine-deep/40 border-panel-border"}`}>
                  <h4 className={`text-[10px] md:text-xs font-bold uppercase tracking-wider mb-3 font-sans ${theme === "light" ? "text-neutral-500" : "text-mauve"}`}>
                    {language === "pt" ? "faixas do álbum" : "album tracks"} ({albumTracks.length})
                  </h4>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-neutral-800">
                    {albumTracks.map((track, idx) => (
                      <div
                        key={track.id}
                        onClick={() => {
                          setSelectedAlbum(null);
                          setSelectedTrack(track);
                        }}
                        className={`grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-2.5 items-center p-2 rounded transition-all cursor-pointer border ${
                          theme === "light"
                            ? "hover:bg-neutral-100 border-transparent hover:border-neutral-200 text-neutral-900"
                            : "hover:bg-wine-deep/60 border-transparent hover:border-panel-border text-rose"
                        }`}
                      >
                        <span className={`text-[10px] font-mono w-4 text-right ${theme === "light" ? "text-neutral-400" : "text-mauve/60"}`}>
                          {idx + 1}
                        </span>
                        <div className="flex items-center gap-2 min-w-0">
                          <img src={track.coverUrl} className="w-7 h-7 rounded object-cover flex-shrink-0" alt="" />
                          <p className="text-xs font-bold truncate">
                            {track.title}
                          </p>
                        </div>
                        <span className="font-mono text-[10px] w-20 sm:w-24 text-right">
                          {formatNumber(track.totalStreams)}
                        </span>
                        <span className={`font-mono text-[10px] w-16 sm:w-20 text-right font-semibold ${theme === "light" ? "text-neutral-500" : "text-mauve"}`}>
                          +{formatNumber(track.dailyGain)}
                        </span>
                        <span className="font-mono text-[9px] w-14 sm:w-16 text-right font-bold flex items-center justify-end">
                          {(() => {
                            const gainDisplay = getTrackGainDisplay(track, language);
                            if (!gainDisplay || gainDisplay.diff === 0) {
                              return <span className={theme === "light" ? "text-neutral-400" : "text-mauve/40"}>—</span>;
                            }
                            return (
                              <span className={`flex items-center gap-0.5 ${gainDisplay.isUp ? "text-green-500" : "text-red-400"}`}>
                                <span>{gainDisplay.isUp ? "▲" : "▼"}</span>
                                <span>{gainDisplay.pctStr}%</span>
                              </span>
                            );
                          })()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Interactive Stream Chart */}
              {selectedAlbum.streams && (
                <div className={`p-3.5 md:p-5 rounded border ${theme === "light" ? "bg-neutral-50 border-neutral-200" : "bg-wine-deep/40 border-panel-border"}`}>
                  <h4 className={`text-[10px] md:text-xs font-bold uppercase tracking-wider mb-3 font-sans ${theme === "light" ? "text-neutral-500" : "text-mauve"}`}>
                    {language === "pt" ? "gráfico de desempenho histórico" : "historical performance chart"}
                  </h4>
                  <StreamChart streams={selectedAlbum.streams} theme={theme} language={language} />
                </div>
              )}
            </div>

            <div className="mt-6 md:mt-8 flex justify-end">
              <button
                onClick={() => setSelectedAlbum(null)}
                className={`w-full sm:w-auto px-6 py-3 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border ${theme === "light" ? "bg-black hover:bg-neutral-800 text-white border-black" : "bg-rose hover:opacity-90 text-floral-bg border-rose"}`}
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
