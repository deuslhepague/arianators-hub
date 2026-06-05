"use client";

import React, { useState, useMemo } from "react";
import { useSpotify } from "@/context/SpotifyContext";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import StreamingGuide from "@/components/StreamingGuide";
import PlaylistGenerator from "@/components/PlaylistGenerator";
import Leaderboard from "@/components/Leaderboard";
import PlayThermometer from "@/components/PlayThermometer";
import PreMadePlaylists from "@/components/PreMadePlaylists";
import AdminPanel from "@/components/AdminPanel";
import RemoveUserRequest from "@/components/RemoveUserRequest";
import {
  getDaysToMilestone as getDaysUntilMilestone,
  getMilestoneForStreams,
  getMilestoneProgressPercent,
  getStreamsRemaining,
} from "@/lib/milestones";

import {
  Music,
  Flame,
  Trophy,
  BookOpen,
  Search,
  Sun,
  Moon,
  ExternalLink,
  CheckCircle2,
  Info,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  LogOut,
  User,
  Radio,
  X,
  Compass,
  Settings
} from "lucide-react";

// Mock data based on real Spotify stream counts for Ariana Grande's Eternal Sunshine era
interface TrackStat {
  id: string;
  title: string;
  artist: string;
  totalStreams: number;
  dailyGain: number;
  gainDiff: number; // Daily difference
  coverUrl: string;
  milestoneName: string;
  milestoneTarget: number;
  avgDailyGain: number;
}

interface AlbumStat {
  id: string;
  title: string;
  year: string;
  totalStreams: number;
  dailyGain: number;
  coverUrl: string;
}

const DEFAULT_MOCK_TRACKS: TrackStat[] = [
  {
    id: "we-cant-be-friends",
    title: "we can't be friends (wait for your love)",
    artist: "Ariana Grande",
    totalStreams: 942088830,
    dailyGain: 3450477,
    gainDiff: 120450,
    coverUrl: "/petal.jpg",
    milestoneName: "1 Billion Streams",
    milestoneTarget: 1000000000,
    avgDailyGain: 3300000,
  },
  {
    id: "yes-and",
    title: "yes, and?",
    artist: "Ariana Grande",
    totalStreams: 428192663,
    dailyGain: 1037113,
    gainDiff: 50477,
    coverUrl: "/petal.jpg",
    milestoneName: "500 Million Streams",
    milestoneTarget: 500000000,
    avgDailyGain: 1100000,
  },
  {
    id: "the-boy-is-mine",
    title: "the boy is mine",
    artist: "Ariana Grande",
    totalStreams: 187103217,
    dailyGain: 1565651,
    gainDiff: 329831,
    coverUrl: "/petal.jpg",
    milestoneName: "200 Million Streams",
    milestoneTarget: 200000000,
    avgDailyGain: 1500000,
  },
  {
    id: "supernatural",
    title: "supernatural",
    artist: "Ariana Grande",
    totalStreams: 113842120,
    dailyGain: 820450,
    gainDiff: 12300,
    coverUrl: "/petal.jpg",
    milestoneName: "150 Million Streams",
    milestoneTarget: 150000000,
    avgDailyGain: 800000,
  },
  {
    id: "eternal-sunshine",
    title: "eternal sunshine",
    artist: "Ariana Grande",
    totalStreams: 155190539,
    dailyGain: 1346980,
    gainDiff: 335907,
    coverUrl: "/petal.jpg",
    milestoneName: "200 Million Streams",
    milestoneTarget: 200000000,
    avgDailyGain: 1300000,
  },
  {
    id: "bye",
    title: "bye",
    artist: "Ariana Grande",
    totalStreams: 144486928,
    dailyGain: 1359931,
    gainDiff: 368119,
    coverUrl: "/petal.jpg",
    milestoneName: "200 Million Streams",
    milestoneTarget: 200000000,
    avgDailyGain: 1300000,
  },
  {
    id: "intro-end-of-the-world",
    title: "intro (end of the world)",
    artist: "Ariana Grande",
    totalStreams: 87420150,
    dailyGain: 520410,
    gainDiff: -14500,
    coverUrl: "/petal.jpg",
    milestoneName: "100 Million Streams",
    milestoneTarget: 100000000,
    avgDailyGain: 500000,
  },
  {
    id: "dont-wanna-break-up-again",
    title: "don't wanna break up again",
    artist: "Ariana Grande",
    totalStreams: 98340280,
    dailyGain: 710190,
    gainDiff: 5210,
    coverUrl: "/petal.jpg",
    milestoneName: "100 Million Streams",
    milestoneTarget: 100000000,
    avgDailyGain: 700000,
  },
  {
    id: "ordinary-things",
    title: "ordinary things (feat. Nonna)",
    artist: "Ariana Grande",
    totalStreams: 76104910,
    dailyGain: 450800,
    gainDiff: 18200,
    coverUrl: "/petal.jpg",
    milestoneName: "100 Million Streams",
    milestoneTarget: 100000000,
    avgDailyGain: 420000,
  },
  {
    id: "imperfect-for-you",
    title: "imperfect for you",
    artist: "Ariana Grande",
    totalStreams: 102350600,
    dailyGain: 910320,
    gainDiff: 45100,
    coverUrl: "/petal.jpg",
    milestoneName: "150 Million Streams",
    milestoneTarget: 150000000,
    avgDailyGain: 880000,
  },
];

const DEFAULT_MOCK_ALBUMS: AlbumStat[] = [
  {
    id: "eternal-sunshine-album",
    title: "eternal sunshine",
    year: "2024",
    totalStreams: 2420926308,
    dailyGain: 12833674,
    coverUrl: "/petal.jpg",
  },
  {
    id: "positions-album",
    title: "Positions",
    year: "2020",
    totalStreams: 3950180290,
    dailyGain: 4120300,
    coverUrl: "/petal.jpg",
  },
  {
    id: "thank-u-next-album",
    title: "thank u, next",
    year: "2019",
    totalStreams: 7680450912,
    dailyGain: 5890200,
    coverUrl: "/petal.jpg",
  },
  {
    id: "sweetener-album",
    title: "Sweetener",
    year: "2018",
    totalStreams: 4420310901,
    dailyGain: 2950300,
    coverUrl: "/petal.jpg",
  },
];

type ActiveView = "streams" | "thermometer" | "generator" | "leaderboard" | "guide" | "admin" | "remove-user";
type StreamTab = "albums" | "tracks";
type SortBy = "daily" | "total";

export default function Home() {
  const { user, login, logout, isLoading: isAuthLoading } = useSpotify();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  // Navigation State
  const [activeView, setActiveView] = useState<ActiveView>("streams");

  // Dynamic tracks/albums state
  const [tracks, setTracks] = useState<TrackStat[]>([]);
  const [albums, setAlbums] = useState<AlbumStat[]>([]);

  const loadAdminConfig = React.useCallback(async (bypass = false) => {
    try {
      const url = bypass ? "/api/catalog?bypass=true" : "/api/catalog";
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to load catalog");
      }

      const data = await response.json();
      setTracks(data.tracks || []);
      setAlbums(data.albums || []);
    } catch (error) {
      console.error("Failed to load public catalog:", error);
      setTracks([]);
      setAlbums([]);
    }
  }, []);

  React.useEffect(() => {
    void loadAdminConfig(false);
    const refreshCatalog = () => {
      void loadAdminConfig(true);
    };
    window.addEventListener("storage_admin_update", refreshCatalog);
    return () => window.removeEventListener("storage_admin_update", refreshCatalog);
  }, [loadAdminConfig]);

  // Header Dropdown States
  const [chartsDropdownOpen, setChartsDropdownOpen] = useState(false);
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false);

  // Streams View Sub-Tabs and Filter States
  const [streamTab, setStreamTab] = useState<StreamTab>("tracks");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("daily");

  // Selected Track for Milestones Modal
  const [selectedTrack, setSelectedTrack] = useState<TrackStat | null>(null);

  // Format Helper: 123.456.789
  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  // Filter and Sort Tracks
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

  // Filter and Sort Albums
  const processedAlbums = useMemo(() => {
    let result = [...albums];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((a) => a.title.toLowerCase().includes(q));
    }
    result.sort((a, b) => b.totalStreams - a.totalStreams);
    return result;
  }, [albums, searchQuery]);

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
    <div className="flex-1 flex flex-col min-h-screen bg-floral-bg text-floral-fg transition-colors duration-200 pb-28">

      {/* TOP UTILITY BAR (Login / Theme) */}
      <div className="w-full bg-wine-deep px-4 md:px-8 py-2.5 flex justify-between items-center text-xs text-mauve border-b border-panel-border">
        <div>
          <span>{t("subtitle.tagline")}</span>
        </div>
        <div className="flex items-center gap-4">
          {/* Data Removal Request Link */}
          <button
            onClick={() => setActiveView("remove-user")}
            className="hover:text-rose transition-colors cursor-pointer uppercase font-bold tracking-wider text-[10px]"
          >
            {language === "pt" ? "remover dados" : "remove data"}
          </button>

          {isAuthLoading ? (
            <span className="animate-pulse pl-2 border-l border-panel-border">{t("auth.connecting")}</span>
          ) : user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-panel-border">
              <span className="truncate max-w-[100px] text-rose font-semibold">
                {user.display_name}
              </span>
            </div>
          ) : (
            <button
              onClick={() => setActiveView("thermometer")}
              className="hover:text-rose uppercase font-bold tracking-wider text-[10px] cursor-pointer pl-2 border-l border-panel-border"
            >
              {t("auth.connect")}
            </button>
          )}
        </div>
      </div>

      {/* SIGNATURE SHOP-STYLE CENTERED HEADER */}
      <header className="w-full pt-10 pb-8 flex flex-col items-center justify-center border-b border-panel-border bg-wine/20">
        <span
          onClick={() => setActiveView("streams")}
          className="text-3xl md:text-4xl font-serif text-rose tracking-widest lowercase cursor-pointer hover:opacity-80 transition-opacity"
        >
          arianators hub
        </span>
        <span className="text-[10px] text-mauve font-serif tracking-widest lowercase mt-1.5 border-t border-panel-border pt-1.5 px-6">
          {t("brand.subtitle")}
        </span>
      </header>

      {/* CENTERED TAB NAVIGATION */}
      <nav className="border-b border-panel-border bg-wine/40 sticky top-0 z-40 transition-colors">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex justify-center flex-wrap gap-x-8 gap-y-2 text-xs font-bold uppercase tracking-widest text-mauve">
          <button
            onClick={() => setActiveView("guide")}
            className={`hover:text-rose transition-colors cursor-pointer ${activeView === "guide" ? "text-rose underline underline-offset-8 decoration-1" : ""
              }`}
          >
            {t("nav.guide")}
          </button>
          <button
            onClick={() => setActiveView("thermometer")}
            className={`hover:text-rose transition-colors cursor-pointer ${activeView === "thermometer" ? "text-rose underline underline-offset-8 decoration-1" : ""
              }`}
          >
            {t("nav.tracker")}
          </button>
          <button
            onClick={() => setActiveView("streams")}
            className={`hover:text-rose transition-colors cursor-pointer ${activeView === "streams" ? "text-rose underline underline-offset-8 decoration-1" : ""
              }`}
          >
            {t("nav.streams")}
          </button>
          <button
            onClick={() => setActiveView("generator")}
            className={`hover:text-rose transition-colors cursor-pointer ${activeView === "generator" ? "text-rose underline underline-offset-8 decoration-1" : ""
              }`}
          >
            {t("nav.generator")}
          </button>
          <button
            onClick={() => setActiveView("leaderboard")}
            className={`hover:text-rose transition-colors cursor-pointer ${activeView === "leaderboard" ? "text-rose underline underline-offset-8 decoration-1" : ""
              }`}
          >
            {t("nav.leaderboard")}
          </button>
          <button
            onClick={() => setActiveView("admin")}
            className={`hover:text-rose transition-colors cursor-pointer ${activeView === "admin" ? "text-rose underline underline-offset-8 decoration-1" : ""
              }`}
          >
            {t("nav.admin")}
          </button>
        </div>
      </nav>

      {/* MAIN VIEW CONTROLLER */}
      <main className="max-w-6xl mx-auto px-4 md:px-8 pt-8 pb-16 flex-1 w-full">

        {/* VIEW 1: SPOTIFY TRACK STREAMS */}
        {activeView === "streams" && (
          <div className="space-y-6 animate-fade-in">
            <div className={`glass-panel p-6 lg:p-8 ${theme === "light" ? "bg-white" : "bg-neutral-950/10"}`}>

              {/* Segment control inside card (Albums / Tracks) */}
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
                    ? "clique em qualquer música para ver o histórico detalhado de streams, metas e estimativas de conclusão."
                    : "click on any track to view detailed stream history, milestone progress, and target completion dates."}
                </div>
              </div>

              {/* Last Updated + Search Bar + Sort controls */}
              <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b ${theme === "light" ? "border-neutral-200" : "border-neutral-900"}`}>
                <div>
                  <span className={`text-xs font-semibold uppercase tracking-wider ${theme === "light" ? "text-neutral-500" : "text-neutral-400"}`}>
                    {language === "pt" ? "última atualização: 1 de junho de 2026" : "last updated: jun 1, 2026"}
                  </span>

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

              {/* TAB CONTENT 1: TRACKS LIST */}
              {streamTab === "tracks" && (
                <div className="space-y-2">
                  {/* Table Header */}
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
                            <span className={`text-[10px] font-semibold flex items-center ${track.gainDiff >= 0 ? (theme === "light" ? "text-neutral-600" : "text-neutral-300") : "text-red-400"}`}>
                              {track.gainDiff >= 0 ? "▲" : "▼"} {formatNumber(Math.abs(track.gainDiff))}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB CONTENT 2: ALBUMS LIST */}
              {streamTab === "albums" && (
                <div className="space-y-2">
                  {/* Table Header */}
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

            {/* PRE-MADE FANBASE PLAYLISTS DISPLAYED IN STREAMS TABS */}
            <PreMadePlaylists />
          </div>
        )}

        {/* VIEW 2: PLAY THERMOMETER */}
        {activeView === "thermometer" && (
          <div className="max-w-3xl mx-auto animate-fade-in">
            <PlayThermometer />
          </div>
        )}

        {/* VIEW 3: SMART PLAYLIST GENERATOR */}
        {activeView === "generator" && (
          <div className="max-w-4xl mx-auto animate-fade-in">
            <PlaylistGenerator />
          </div>
        )}

        {/* VIEW 4: LEADERBOARD */}
        {activeView === "leaderboard" && (
          <div className="max-w-3xl mx-auto animate-fade-in">
            <Leaderboard />
          </div>
        )}

        {/* VIEW 5: STREAMING GUIDE / FAQ */}
        {activeView === "guide" && (
          <div className="space-y-6 animate-fade-in">
            <StreamingGuide />
          </div>
        )}

        {/* VIEW 6: ADMIN CONSOLE */}
        {activeView === "admin" && (
          <div className="max-w-4xl mx-auto animate-fade-in">
            <AdminPanel />
          </div>
        )}

        {activeView === "remove-user" && (
          <div className="max-w-md mx-auto animate-fade-in">
            <RemoveUserRequest />
          </div>
        )}

      </main>

      {/* MILESTONE PROGRESS MODAL POPUP */}
      {selectedTrack && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className={`w-full max-w-2xl rounded-lg p-8 relative animate-slide-up ${theme === "light" ? "bg-white border border-neutral-200 text-neutral-950" : "bg-wine border border-panel-border text-rose"}`}>

            {/* Close Button */}
            <button
              onClick={() => setSelectedTrack(null)}
              className={`absolute top-6 right-6 p-2 rounded-full transition-all cursor-pointer ${theme === "light" ? "hover:bg-neutral-100 text-neutral-500 hover:text-black" : "hover:bg-wine-deep text-mauve hover:text-rose"}`}
            >
              <X className="w-6 h-6" />
            </button>

            {/* Track Info */}
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

            {/* Calculations & Progress */}
            <div className="space-y-6">
              <div>
                <div className={`flex justify-between text-xs font-bold uppercase tracking-wider mb-2.5 ${theme === "light" ? "text-neutral-500" : "text-mauve"}`}>
                  <span>{language === "pt" ? "progresso para" : "progress to"} {selectedTrackMilestone?.milestoneName ?? selectedTrack.milestoneName}</span>
                  <span className={`font-extrabold text-sm ${theme === "light" ? "text-neutral-950" : "text-rose"}`}>
                    {Math.round(selectedTrackProgressPercent * 10) / 10}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className={`w-full h-3 border rounded-full overflow-hidden ${theme === "light" ? "bg-neutral-100 border-neutral-200" : "bg-wine-deep border-panel-border"}`}>
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${theme === "light" ? "bg-black" : "bg-rose"}`}
                    style={{
                      width: `${selectedTrackProgressPercent}%`,
                    }}
                  />
                </div>
              </div>

              {/* Data Table details */}
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

      {/* FLOATING MOBILE/DESKTOP BOTTOM NAVIGATION BAR */}
      <div className="floating-bottom-nav px-6 py-3 flex items-center gap-6 md:gap-10">
        {[
          { id: "guide", label: t("nav.guide"), icon: BookOpen },
          { id: "thermometer", label: t("nav.tracker"), icon: Flame },
          { id: "streams", label: t("nav.streams"), icon: Music },
          { id: "generator", label: t("nav.generator"), icon: Compass },
          { id: "leaderboard", label: t("nav.leaderboard"), icon: Trophy },
          { id: "admin", label: t("nav.admin"), icon: Settings },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as any)}
              className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${isActive
                  ? (theme === "light" ? "text-black scale-110 font-bold" : "text-white scale-110 font-bold")
                  : (theme === "light" ? "text-neutral-500 hover:text-black" : "text-neutral-400 hover:text-white")
                }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] font-bold uppercase tracking-widest">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* FLOATING QUICK SETTINGS DOCK */}
      <div className="fixed right-4 bottom-24 md:bottom-8 z-50 flex flex-col gap-3">
        {/* Language button */}
        <button
          onClick={() => setLanguage(language === "en" ? "pt" : "en")}
          className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-xs uppercase tracking-wider shadow-lg border backdrop-blur-md transition-all duration-250 hover:scale-110 cursor-pointer bg-white/95 border-neutral-300 text-neutral-900 hover:bg-neutral-100 dark:bg-neutral-900/95 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-800"
          title={language === "pt" ? "Alterar para Inglês" : "Change to Portuguese"}
        >
          {language === "en" ? "pt" : "en"}
        </button>

        {/* Theme button */}
        <button
          onClick={toggleTheme}
          className="w-11 h-11 rounded-full flex items-center justify-center shadow-lg border backdrop-blur-md transition-all duration-250 hover:scale-110 cursor-pointer bg-white/95 border-neutral-300 text-neutral-900 hover:bg-neutral-100 dark:bg-neutral-900/95 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-800"
          title={language === "pt" ? "Alternar tema claro/escuro" : "Toggle theme light/dark"}
        >
          {theme === "dark" ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-650" />}
        </button>

        {/* Logout button */}
        {user && (
          <button
            onClick={logout}
            className="w-11 h-11 rounded-full flex items-center justify-center shadow-lg border backdrop-blur-md transition-all duration-250 hover:scale-110 cursor-pointer bg-white/95 border-neutral-300 text-neutral-900 hover:bg-red-50 hover:text-red-650 dark:bg-neutral-900/95 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-red-950/40 dark:hover:text-red-400"
            title={language === "pt" ? "Sair da conta" : "Logout"}
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>

    </div>
  );
}
