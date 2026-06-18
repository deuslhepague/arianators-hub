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
  Check,
  ChevronLeft,
  ChevronRight
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
  rank?: number;
  rankShift?: number | "new" | null;
  daysToGoal?: number | null;
  dailyPace?: number;
}

interface AlbumStat {
  id: string;
  title: string;
  year: string;
  totalStreams: number;
  dailyGain: number;
  coverUrl: string;
  spotifyAlbumId?: string;
  isParticipation?: boolean;
  type?: string;
  streams?: Record<string, { total: number; daily: number | null }>;
  tracklist?: string[];
  rank?: number;
  rankShift?: number | "new" | null;
  daysToGoal?: number | null;
  dailyPace?: number;
}

type StreamTab = "albums" | "tracks" | "milestones" | "projections";
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
  { value: 100_000, label: "100k" },
  { value: 500_000, label: "500k" },
  { value: 1_000_000, label: "1M" },
  { value: 5_000_000, label: "5M" },
  { value: 10_000_000, label: "10M" },
  { value: 20_000_000, label: "20M" },
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

const getDaysDifference = (d1: Date, d2: Date) => {
  const date1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const date2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());
  const diffTime = date2.getTime() - date1.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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

  // In-memory cache for full track/album details
  const [tracksCache, setTracksCache] = useState<Record<string, TrackStat>>({});
  const [albumsCache, setAlbumsCache] = useState<Record<string, AlbumStat>>({});

  const loadAdminConfig = React.useCallback(async (bypass = false) => {
    try {
      const response = await fetch("/api/catalog" + (bypass ? "?bypass=true" : ""));
      if (!response.ok) throw new Error("Failed to load catalog");
      const data = await response.json();
      setTracks(data.tracks || []);
      setAlbums(data.albums || []);
      setLastUpdated(data.updatedAt || new Date().toISOString());
      // Reset cache when catalog updates
      setTracksCache({});
      setAlbumsCache({});
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
  const [albumTypeFilter, setAlbumTypeFilter] = useState<"all" | "studio" | "ep" | "compilation" | "other">("studio");

  // Visible item counts (10 by default)
  const [visibleTracksCount, setVisibleTracksCount] = useState(10);
  const [visibleAlbumsCount, setVisibleAlbumsCount] = useState(10);
  const [visibleMilestonesCount, setVisibleMilestonesCount] = useState(10);

  // Reset visible counts when search query, sorting, or tab changes
  React.useEffect(() => {
    setVisibleTracksCount(10);
  }, [searchQuery, sortBy, sortDirection, streamTab]);

  React.useEffect(() => {
    setVisibleAlbumsCount(10);
  }, [searchQuery, albumSortBy, sortDirection, streamTab, albumTypeFilter]);

  // Selected Track for Milestones Modal
  const [selectedTrack, setSelectedTrack] = useState<TrackStat | null>(null);
  // Selected Album for Milestones Modal
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumStat | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Projections Tab States
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d;
  });
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d;
  });
  const [isMonthYearSelectorOpen, setIsMonthYearSelectorOpen] = useState(false);
  const [projectionType, setProjectionType] = useState<"tracks" | "albums">("tracks");

  const monthNamesPT = useMemo(() => [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ], []);

  const monthNamesEN = useMemo(() => [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ], []);

  const monthAbbrPT = useMemo(() => [
    "jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"
  ], []);

  const monthAbbrEN = useMemo(() => [
    "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"
  ], []);

  const weekdayHeadersPT = useMemo(() => ["D", "S", "T", "Q", "Q", "S", "S"], []);
  const weekdayHeadersEN = useMemo(() => ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"], []);

  const handleMonthSelect = (monthIndex: number) => {
    setCurrentCalendarDate(prev => {
      const next = new Date(prev);
      next.setMonth(monthIndex);
      return next;
    });
    setIsMonthYearSelectorOpen(false);
  };

  const handleYearChange = (delta: number) => {
    setCurrentCalendarDate(prev => {
      const next = new Date(prev);
      next.setFullYear(prev.getFullYear() + delta);
      return next;
    });
  };

  const handlePrevMonth = () => {
    setCurrentCalendarDate(prev => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() - 1);
      return next;
    });
  };

  const handleNextMonth = () => {
    setCurrentCalendarDate(prev => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + 1);
      return next;
    });
  };

  const handleDayClick = (dayDate: Date) => {
    setSelectedDate(dayDate);
  };

  const daysInMonth = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    return { firstDayIndex, totalDays };
  }, [currentCalendarDate]);

  const refDate = useMemo(() => {
    for (const t of tracks) {
      if (t.streams) {
        const dates = Object.keys(t.streams).sort();
        if (dates.length > 0) {
          const latestDate = dates[dates.length - 1];
          if (latestDate) {
            const [yr, mo, dy] = latestDate.split("-").map(Number);
            return new Date(yr, mo - 1, dy);
          }
        }
      }
    }
    if (lastUpdated) {
      return new Date(lastUpdated);
    }
    return new Date();
  }, [tracks, lastUpdated]);

  const daysDiff = useMemo(() => {
    const d1 = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
    const d2 = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    const diffTime = d2.getTime() - d1.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [refDate, selectedDate]);

  const calendarCells = useMemo(() => {
    const cells = [];
    const { firstDayIndex, totalDays } = daysInMonth;
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ type: "empty", value: i });
    }
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    for (let day = 1; day <= totalDays; day++) {
      cells.push({
        type: "day",
        value: day,
        date: new Date(year, month, day),
      });
    }
    return cells;
  }, [daysInMonth, currentCalendarDate]);

  const projectedTracksList = useMemo(() => {
    const diff = daysDiff > 0 ? daysDiff : 0;
    
    // Determine today's rank based on current totalStreams sorted descending
    const todaySorted = [...tracks].sort((a, b) => b.totalStreams - a.totalStreams);

    const projectedList = tracks.map(track => {
      const currentMilestone = getMilestoneForStreams(track.totalStreams);
      const dailyVelocity = track.dailyPace || track.dailyGain || 0;
      const projectedTotal = track.totalStreams + diff * dailyVelocity;
      const gained = diff * dailyVelocity;
      const isMilestoneReached = projectedTotal >= currentMilestone.milestoneTarget;
      
      const todayRank = todaySorted.findIndex(x => x.id === track.id) + 1;

      return {
        ...track,
        dailyVelocity,
        projectedTotal,
        gained,
        isMilestoneReached,
        milestoneTarget: currentMilestone.milestoneTarget,
        milestoneName: currentMilestone.milestoneName,
        todayRank
      };
    }).sort((a, b) => b.projectedTotal - a.projectedTotal);

    // Calculate rank shift
    return projectedList.map((track, projectedIdx) => {
      const projectedRank = projectedIdx + 1;
      const rankShift = track.todayRank - projectedRank;
      return {
        ...track,
        projectedRank,
        rankShift
      };
    });
  }, [tracks, daysDiff]);

  const projectedAlbumsList = useMemo(() => {
    const diff = daysDiff > 0 ? daysDiff : 0;
    
    const filteredAlbums = albums.filter(album => {
      const type = (
        album.type === "studio" ? "studio" :
        album.type === "ep" ? "ep" :
        album.type === "compilation" ? "compilation" :
        (
          album.title.toLowerCase().includes("live") ||
          album.title.toLowerCase().includes("sped up") ||
          album.title.toLowerCase().includes("slowed") ||
          album.title.toLowerCase().includes("acapella")
        ) ? "other" : "studio"
      );
      return type === "studio";
    });

    // Determine today's rank based on current totalStreams sorted descending
    const todaySorted = [...filteredAlbums].sort((a, b) => b.totalStreams - a.totalStreams);

    const projectedList = filteredAlbums.map(album => {
      const currentMilestone = getMilestoneForStreams(album.totalStreams);
      const dailyVelocity = album.dailyPace || album.dailyGain || 0;
      const projectedTotal = album.totalStreams + diff * dailyVelocity;
      const gained = diff * dailyVelocity;
      const isMilestoneReached = projectedTotal >= currentMilestone.milestoneTarget;

      const todayRank = todaySorted.findIndex(x => x.id === album.id) + 1;

      return {
        ...album,
        dailyVelocity,
        projectedTotal,
        gained,
        isMilestoneReached,
        milestoneTarget: currentMilestone.milestoneTarget,
        milestoneName: currentMilestone.milestoneName,
        todayRank
      };
    }).sort((a, b) => b.projectedTotal - a.projectedTotal);

    // Calculate rank shift
    return projectedList.map((album, projectedIdx) => {
      const projectedRank = projectedIdx + 1;
      const rankShift = album.todayRank - projectedRank;
      return {
        ...album,
        projectedRank,
        rankShift
      };
    });
  }, [albums, daysDiff]);

  const projectedGlobalDailyVelocity = useMemo(() => {
    return projectedTracksList.reduce((sum, t) => sum + (t.dailyVelocity || 0), 0);
  }, [projectedTracksList]);

  const currentGlobalTotal = useMemo(() => {
    return tracks.reduce((sum, t) => sum + (t.totalStreams || 0), 0);
  }, [tracks]);

  const projectedGlobalTotal = useMemo(() => {
    return projectedTracksList.reduce((sum, t) => sum + t.projectedTotal, 0);
  }, [projectedTracksList]);

  const globalGained = useMemo(() => {
    return projectedGlobalTotal - currentGlobalTotal;
  }, [projectedGlobalTotal, currentGlobalTotal]);

  const currentMonthName = useMemo(() => {
    return language === "pt"
      ? monthNamesPT[currentCalendarDate.getMonth()]
      : monthNamesEN[currentCalendarDate.getMonth()];
  }, [language, currentCalendarDate, monthNamesPT, monthNamesEN]);

  const handleSelectTrack = async (track: TrackStat) => {
    if (tracksCache[track.id]) {
      setSelectedTrack(tracksCache[track.id]);
      return;
    }
    setIsLoadingDetail(true);
    try {
      const res = await fetch(`/api/catalog/detail?type=track&id=${track.id}`);
      if (!res.ok) throw new Error("Failed to fetch track details");
      const result = await res.json();
      if (result.success && result.data) {
        const fullTrack = { ...track, ...result.data };
        setTracksCache(prev => ({ ...prev, [track.id]: fullTrack }));
        setSelectedTrack(fullTrack);
      } else {
        setSelectedTrack(track);
      }
    } catch (err) {
      console.error(err);
      setSelectedTrack(track);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleSelectAlbum = async (album: AlbumStat) => {
    if (albumsCache[album.id]) {
      setSelectedAlbum(albumsCache[album.id]);
      return;
    }
    setIsLoadingDetail(true);
    try {
      const res = await fetch(`/api/catalog/detail?type=album&id=${album.id}`);
      if (!res.ok) throw new Error("Failed to fetch album details");
      const result = await res.json();
      if (result.success && result.data) {
        const fullAlbum = { ...album, ...result.data };
        setAlbumsCache(prev => ({ ...prev, [album.id]: fullAlbum }));
        setSelectedAlbum(fullAlbum);
      } else {
        setSelectedAlbum(album);
      }
    } catch (err) {
      console.error(err);
      setSelectedAlbum(album);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Milestones Specific Filters
  const [milestoneSubTab, setMilestoneSubTab] = useState<"upcoming" | "surpassed">("upcoming");
  const [selectedSurpassedTarget, setSelectedSurpassedTarget] = useState<number>(100_000_000);

  React.useEffect(() => {
    setVisibleMilestonesCount(10);
  }, [searchQuery, streamTab, milestoneSubTab, selectedSurpassedTarget]);

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
    const trackItems = tracks.map(t => ({ ...t, type: "track" }));
    const albumItems = albums.map(a => ({ ...a, type: "album", artist: "Ariana Grande", avgDailyGain: a.dailyGain }));
    const allItems = [...trackItems, ...albumItems];

    return allItems
      .map(item => {
        const milestone = getMilestoneForStreams(item.totalStreams);
        const progressPercent = getMilestoneProgressPercent(item.totalStreams, milestone.milestoneTarget);
        const streamsRemaining = getStreamsRemaining(item.totalStreams, milestone.milestoneTarget);

        const dailyPace = item.dailyGain || item.avgDailyGain || 0;
        
        let finalDaysToGoal = item.daysToGoal;
        let finalDailyPace = item.dailyPace;

        if (finalDaysToGoal === undefined || finalDailyPace === undefined) {
          const forecast = calculateForecast(
            item.streams,
            item.totalStreams,
            milestone.milestoneTarget,
            dailyPace
          );
          if (finalDaysToGoal === undefined) finalDaysToGoal = forecast.daysToGoal;
          if (finalDailyPace === undefined) finalDailyPace = forecast.dailyVelocity;
        }

        return {
          ...item,
          milestone,
          progressPercent,
          streamsRemaining,
          daysToGoal: finalDaysToGoal,
          dailyPace: finalDailyPace,
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
  }, [tracks, albums]);

  const surpassedItems = useMemo(() => {
    return tracks
      .map(t => ({ ...t, type: "track" }))
      .filter(item => item.totalStreams >= selectedSurpassedTarget)
      .sort((a, b) => b.totalStreams - a.totalStreams);
  }, [tracks, selectedSurpassedTarget]);

  const formatNumber = (num: any) => {
    if (num === null || num === undefined || isNaN(num)) return "0";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const rankedTracks = useMemo(() => {
    const todaySorted = [...tracks];
    todaySorted.sort((a, b) => {
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

    const allDates = new Set<string>();
    tracks.forEach(t => {
      if (t.streams) {
        Object.keys(t.streams).forEach(d => allDates.add(d));
      }
    });
    const sortedDates = Array.from(allDates).sort();

    let yesterdaySorted: TrackStat[] = [];
    let hasHistory = false;
    if (sortedDates.length >= 2) {
      hasHistory = true;
      const prevDate = sortedDates[sortedDates.length - 2];
      const prevPrevDate = sortedDates.length >= 3 ? sortedDates[sortedDates.length - 3] : null;

      yesterdaySorted = [...tracks];
      yesterdaySorted.sort((a, b) => {
        let valA = 0;
        let valB = 0;
        if (sortBy === "daily") {
          valA = a.streams?.[prevDate]?.daily ?? 0;
          valB = b.streams?.[prevDate]?.daily ?? 0;
        } else if (sortBy === "pct") {
          if (prevPrevDate) {
            const gainA = a.streams?.[prevDate]?.daily ?? 0;
            const prevA = a.streams?.[prevPrevDate]?.daily ?? 0;
            const pctA = prevA > 0 ? ((gainA - prevA) / prevA) * 100 : 0;

            const gainB = b.streams?.[prevDate]?.daily ?? 0;
            const prevB = b.streams?.[prevPrevDate]?.daily ?? 0;
            const pctB = prevB > 0 ? ((gainB - prevB) / prevB) * 100 : 0;

            valA = pctA;
            valB = pctB;
          } else {
            valA = 0;
            valB = 0;
          }
        } else {
          valA = a.streams?.[prevDate]?.total ?? 0;
          valB = b.streams?.[prevDate]?.total ?? 0;
        }
        return sortDirection === "desc" ? valB - valA : valA - valB;
      });
    }

    return todaySorted.map((track, todayIdx) => {
      const todayRank = todayIdx + 1;
      let yesterdayRank = null;
      let rankShift: number | "new" | null = null;

      if (hasHistory) {
        const yesterdayIdx = yesterdaySorted.findIndex(t => t.id === track.id);
        if (yesterdayIdx !== -1) {
          yesterdayRank = yesterdayIdx + 1;
          rankShift = yesterdayRank - todayRank;
        } else {
          rankShift = "new";
        }
      }

      return {
        ...track,
        rank: todayRank,
        rankShift
      };
    });
  }, [tracks, sortBy, sortDirection, language]);

  const rankedAlbums = useMemo(() => {
    let filteredList = [...albums];
    if (albumTypeFilter !== "all") {
      filteredList = filteredList.filter((a) => {
        const type = a.type || (
          a.isParticipation ? "compilation" :
          (
            a.title.toLowerCase().includes("a cappella") ||
            a.title.toLowerCase().includes("instrumental") ||
            a.title.toLowerCase().includes("remix") ||
            a.title.toLowerCase().includes("live") ||
            a.title.toLowerCase().includes("sped up") ||
            a.title.toLowerCase().includes("slowed") ||
            a.title.toLowerCase().includes("acapella")
          ) ? "other" : "studio"
        );
        return type === albumTypeFilter;
      });
    }

    const todaySorted = [...filteredList];
    todaySorted.sort((a, b) => {
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

    const allDates = new Set<string>();
    filteredList.forEach(a => {
      if (a.streams) {
        Object.keys(a.streams).forEach(d => allDates.add(d));
      }
    });
    const sortedDates = Array.from(allDates).sort();

    let yesterdaySorted: AlbumStat[] = [];
    let hasHistory = false;
    if (sortedDates.length >= 2) {
      hasHistory = true;
      const prevDate = sortedDates[sortedDates.length - 2];
      const prevPrevDate = sortedDates.length >= 3 ? sortedDates[sortedDates.length - 3] : null;

      yesterdaySorted = [...filteredList];
      yesterdaySorted.sort((a, b) => {
        let valA = 0;
        let valB = 0;
        if (albumSortBy === "daily") {
          valA = a.streams?.[prevDate]?.daily ?? 0;
          valB = b.streams?.[prevDate]?.daily ?? 0;
        } else if (albumSortBy === "year") {
          valA = parseInt(a.year, 10) || 0;
          valB = parseInt(b.year, 10) || 0;
        } else if (albumSortBy === "pct") {
          if (prevPrevDate) {
            const gainA = a.streams?.[prevDate]?.daily ?? 0;
            const prevA = a.streams?.[prevPrevDate]?.daily ?? 0;
            const pctA = prevA > 0 ? ((gainA - prevA) / prevA) * 100 : 0;

            const gainB = b.streams?.[prevDate]?.daily ?? 0;
            const prevB = b.streams?.[prevPrevDate]?.daily ?? 0;
            const pctB = prevB > 0 ? ((gainB - prevB) / prevB) * 100 : 0;

            valA = pctA;
            valB = pctB;
          } else {
            valA = 0;
            valB = 0;
          }
        } else {
          valA = a.streams?.[prevDate]?.total ?? 0;
          valB = b.streams?.[prevDate]?.total ?? 0;
        }
        return sortDirection === "desc" ? valB - valA : valA - valB;
      });
    }

    return todaySorted.map((album, todayIdx) => {
      const todayRank = todayIdx + 1;
      let yesterdayRank = null;
      let rankShift: number | "new" | null = null;

      if (hasHistory) {
        const yesterdayIdx = yesterdaySorted.findIndex(a => a.id === album.id);
        if (yesterdayIdx !== -1) {
          yesterdayRank = yesterdayIdx + 1;
          rankShift = yesterdayRank - todayRank;
        } else {
          rankShift = "new";
        }
      }

      return {
        ...album,
        rank: todayRank,
        rankShift
      };
    });
  }, [albums, albumSortBy, sortDirection, language, albumTypeFilter]);

  const processedTracks = useMemo(() => {
    let result = [...rankedTracks];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)
      );
    }
    return result;
  }, [rankedTracks, searchQuery]);

  const processedAlbums = useMemo(() => {
    let result = [...rankedAlbums];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((a) => a.title.toLowerCase().includes(q));
    }
    return result;
  }, [rankedAlbums, searchQuery]);

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
      <div className="neobrutal-card-rose p-6 flex flex-col md:flex-row items-center gap-6">
        {/* Left: Album cover of most streamed album or dynamic artist banner */}
        {/* Left: Artist Image */}
        <div className="relative w-full md:w-44 h-44 flex-shrink-0 overflow-hidden border-2 border-black dark:border-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]">
          {/* Mobile Image */}
          <img
            src="https://i.scdn.co/image/ab67618600001016e1732cadcb123dede061baa1"
            alt="Ariana Grande"
            className="w-full h-full object-cover filter brightness-95 md:hidden"
          />
          {/* Desktop Image */}
          <img
            src="https://i.scdn.co/image/ab67616d0000b273b622d42c30697e1e1414343c"
            alt="Ariana Grande"
            className="w-full h-full object-cover filter brightness-95 hidden md:block"
          />
        </div>

        {/* Middle: Global Stats */}
        <div className="flex-1 min-w-0 py-1">
          <div className="mb-2">
            <span className="neobrutal-sticker neobrutal-sticker-rose">
              {language === "pt" ? "estatísticas da artista" : "artist statistics"}
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-serif text-rose font-bold mb-1.5 tracking-wider">
            Ariana Grande
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
                <span className={`text-xs font-mono font-bold ${globalStats.globalChange.diff > 0
                  ? "text-emerald-500"
                  : globalStats.globalChange.diff < 0
                    ? "text-red-500"
                    : "text-mauve"
                  }`}>
                  {globalStats.globalChange.diff > 0 ? "+" : ""}{formatNumber(globalStats.globalChange.diff)} ({globalStats.globalChange.diff > 0 ? "+" : (globalStats.globalChange.diff < 0 ? "-" : "")}{globalStats.globalChange.pctStr}%)
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
        <div className="w-full md:w-72 flex flex-col gap-3 flex-shrink-0">
          {/* Highlight 1: Most Streamed Song */}
          {globalStats.mostStreamedTrack && (
            <div className="p-2.5 border-2 border-black dark:border-white bg-panel-bg flex items-center gap-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
              <img src={globalStats.mostStreamedTrack.coverUrl} alt={globalStats.mostStreamedTrack.title} className="w-9 h-9 object-cover border border-black dark:border-white" />
              <div className="flex-1 min-w-0">
                <span className="text-[8px] uppercase tracking-widest text-mauve block leading-none font-bold">{language === "pt" ? "música mais ouvida" : "most streamed song"}</span>
                <span className="text-xs font-serif font-bold block truncate leading-tight mt-1 text-rose lowercase">{globalStats.mostStreamedTrack.title}</span>
                <span className="text-[10px] font-mono text-mauve leading-none block mt-0.5">{formatNumber(globalStats.mostStreamedTrack.totalStreams)}</span>
              </div>
            </div>
          )}

          {/* Highlight 2: Biggest Daily Gainer */}
          {globalStats.biggestDailyGainer && (
            <div className="p-2.5 border-2 border-black dark:border-white bg-panel-bg flex items-center gap-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
              <img src={globalStats.biggestDailyGainer.coverUrl} alt={globalStats.biggestDailyGainer.title} className="w-9 h-9 object-cover border border-black dark:border-white" />
              <div className="flex-1 min-w-0">
                <span className="text-[8px] uppercase tracking-widest text-mauve block leading-none font-bold">{language === "pt" ? "maior ganho diário" : "biggest daily gainer"}</span>
                <span className="text-xs font-serif font-bold block truncate leading-tight mt-1 text-rose">{globalStats.biggestDailyGainer.title}</span>
                <span className="text-[10px] font-mono text-emerald-500 font-semibold leading-none block mt-0.5">+{formatNumber(globalStats.biggestDailyGainer.dailyGain)}</span>
              </div>
            </div>
          )}

          {/* Highlight 3: Biggest % Gainer */}
          {globalStats.biggestPctGainerTrack && (
            <div className="p-2.5 border-2 border-black dark:border-white bg-panel-bg flex items-center gap-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
              <img src={globalStats.biggestPctGainerTrack.coverUrl} alt={globalStats.biggestPctGainerTrack.title} className="w-9 h-9 object-cover border border-black dark:border-white" />
              <div className="flex-1 min-w-0">
                <span className="text-[8px] uppercase tracking-widest text-mauve block leading-none font-bold">{language === "pt" ? "maior crescimento %" : "biggest % gainer"}</span>
                <span className="text-xs font-serif font-bold block truncate leading-tight mt-1 text-rose lowercase">{globalStats.biggestPctGainerTrack.title}</span>
                <span className="text-[10px] font-mono text-emerald-500 font-semibold leading-none block mt-0.5">+{globalStats.biggestPctGainerTrack.pctChange.toFixed(1)}%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-2 border-black dark:border-white p-6 lg:p-8 bg-panel-bg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
        {/* Segment control */}
        <div className="flex border-2 border-black dark:border-white max-w-md mb-6 bg-panel-bg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]">
          <button
            onClick={() => setStreamTab("albums")}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border-r-2 border-black dark:border-white ${streamTab === "albums"
              ? "bg-black text-white dark:bg-white dark:text-black font-extrabold"
              : "text-neutral-500 dark:text-mauve hover:bg-neutral-100 dark:hover:bg-neutral-900"
              }`}
          >
            {language === "pt" ? "álbuns" : "albums"}
          </button>
          <button
            onClick={() => setStreamTab("tracks")}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border-r-2 border-black dark:border-white ${streamTab === "tracks"
              ? "bg-black text-white dark:bg-white dark:text-black font-extrabold"
              : "text-neutral-500 dark:text-mauve hover:bg-neutral-100 dark:hover:bg-neutral-900"
              }`}
          >
            {language === "pt" ? "músicas" : "tracks"}
          </button>
          <button
            onClick={() => setStreamTab("milestones")}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border-r-2 border-black dark:border-white ${streamTab === "milestones"
              ? "bg-black text-white dark:bg-white dark:text-black font-extrabold"
              : "text-neutral-500 dark:text-mauve hover:bg-neutral-100 dark:hover:bg-neutral-900"
              }`}
          >
            {language === "pt" ? "metas" : "milestones"}
          </button>
          <button
            onClick={() => setStreamTab("projections")}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${streamTab === "projections"
              ? "bg-black text-white dark:bg-white dark:text-black font-extrabold"
              : "text-neutral-500 dark:text-mauve hover:bg-neutral-100 dark:hover:bg-neutral-900"
              }`}
          >
            {language === "pt" ? "projeções" : "projections"}
          </button>
        </div>

        {/* Announcement-style info bar */}
        <div className="p-4 border-2 border-black dark:border-white flex items-start gap-3 mb-6 text-xs md:text-sm leading-relaxed bg-neutral-50 dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400">
          <Info className={`w-4 h-4 flex-shrink-0 mt-0.5 ${theme === "light" ? "text-black" : "text-white"}`} />
          <div>
            {language === "pt"
              ? "clique em qualquer música/álbum para ver as metas e estimativas de conclusão."
              : "click on any track/album to view milestone progress and target completion dates."}
          </div>
        </div>

        {/* Last Updated + Search Bar + Sort controls */}
        {streamTab !== "milestones" && streamTab !== "projections" && (
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
                  className={`w-full pl-10 pr-4 py-2 border-2 border-black dark:border-white text-xs focus:outline-none rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] ${theme === "light" ? "bg-white text-neutral-955 placeholder-neutral-400" : "bg-neutral-955 text-white placeholder-neutral-600"}`}
                />
              </div>

              {/* Custom Sort Dropdown */}
              <div className="relative w-full sm:w-auto flex-shrink-0">
                <button
                  onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-bold uppercase tracking-wider border-2 border-black dark:border-white flex items-center justify-between sm:justify-start gap-2 transition-all cursor-pointer rounded-none bg-panel-bg text-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
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

                    <div className="absolute right-0 mt-2 w-48 border-2 border-black dark:border-white z-20 p-3 animate-fade-in rounded-none bg-panel-bg text-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
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
                              className={`w-full flex items-center justify-between text-xs py-1.5 px-2 rounded transition-all cursor-pointer ${sortBy === "total"
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
                              className={`w-full flex items-center justify-between text-xs py-1.5 px-2 rounded transition-all cursor-pointer ${sortBy === "daily"
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
                              className={`w-full flex items-center justify-between text-xs py-1.5 px-2 rounded transition-all cursor-pointer ${sortBy === "pct"
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
                              className={`w-full flex items-center justify-between text-xs py-1.5 px-2 rounded transition-all cursor-pointer ${albumSortBy === "total"
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
                              className={`w-full flex items-center justify-between text-xs py-1.5 px-2 rounded transition-all cursor-pointer ${albumSortBy === "daily"
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
                              className={`w-full flex items-center justify-between text-xs py-1.5 px-2 rounded transition-all cursor-pointer ${albumSortBy === "pct"
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
                              className={`w-full flex items-center justify-between text-xs py-1.5 px-2 rounded transition-all cursor-pointer ${albumSortBy === "year"
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
                          className={`w-full flex items-center justify-between text-xs py-1.5 px-2 rounded transition-all cursor-pointer ${sortDirection === "desc"
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
                          className={`w-full flex items-center justify-between text-xs py-1.5 px-2 rounded transition-all cursor-pointer ${sortDirection === "asc"
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
                className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border transition-all cursor-pointer ${milestoneSubTab === "upcoming"
                  ? (theme === "light" ? "bg-black border-black text-white" : "bg-rose border-rose text-floral-bg")
                  : (theme === "light" ? "border-neutral-350 text-neutral-500 hover:text-black" : "border-neutral-850 text-mauve hover:text-white")
                  }`}
              >
                {language === "pt" ? "próximas" : "upcoming"}
              </button>
              <button
                onClick={() => setMilestoneSubTab("surpassed")}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border transition-all cursor-pointer ${milestoneSubTab === "surpassed"
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
                      className={`px-3 py-1.5 font-mono text-xs border rounded transition-all cursor-pointer ${selectedSurpassedTarget === pill.value
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
            <div className={`flex justify-between text-[10px] font-bold uppercase tracking-wider px-2.5 sm:px-4 pb-3 border-b ${theme === "light" ? "text-neutral-500 border-neutral-200" : "text-neutral-500 border-neutral-900/60"}`}>
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="w-12 sm:w-20 flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  <span className="w-4 sm:w-6 text-right">#</span>
                  <span className="w-8 sm:w-10 text-center">▲▼</span>
                </div>
                <span>{language === "pt" ? "música" : "track"}</span>
              </div>
              <span className="text-right">{language === "pt" ? "streams / ganho (dif)" : "streams / gain (diff)"}</span>
            </div>

            {processedTracks.length === 0 ? (
              <div className={`text-center py-12 text-xs ${theme === "light" ? "text-neutral-500" : "text-neutral-500"}`}>
                {language === "pt" ? "nenhuma música encontrada." : "no tracks match your search."}
              </div>
            ) : (
              <>
                {processedTracks.slice(0, visibleTracksCount).map((track) => (
                  <div
                    key={track.id}
                    onClick={() => handleSelectTrack(track)}
                    className={`flex items-center justify-between p-2.5 sm:p-4 rounded border transition-all cursor-pointer group ${theme === "light" ? "border-transparent hover:border-neutral-300 hover:bg-neutral-50" : "border-transparent hover:border-neutral-800 hover:bg-neutral-950/60"}`}
                  >
                    <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                      {/* Rank and Shift column */}
                      <div className="flex items-center gap-1.5 sm:gap-2.5 w-12 sm:w-20 flex-shrink-0">
                        <span className={`text-xs sm:text-sm md:text-base font-extrabold w-4 sm:w-6 text-right ${theme === "light" ? "text-neutral-955" : "text-white"}`}>
                          {track.rank}
                        </span>

                        <div className="w-8 sm:w-10 flex justify-center">
                          {track.rankShift === "new" ? (
                            <div aria-label="Chart position new entry" className={`h-4.5 px-1 sm:px-2 rounded-full flex items-center justify-center text-[8px] sm:text-[10px] font-extrabold tracking-wide uppercase ${theme === "light"
                              ? "bg-blue-50 text-blue-600 border border-blue-200"
                              : "bg-blue-950/30 text-blue-400 border border-blue-900/40"
                              }`}>
                              {language === "pt" ? "Novo" : "New"}
                            </div>
                          ) : track.rankShift === null || track.rankShift === 0 ? (
                            <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs font-bold ${theme === "light" ? "bg-neutral-100 text-neutral-400" : "bg-neutral-900/60 text-neutral-500 border border-neutral-850"
                              }`}>
                              —
                            </span>
                          ) : typeof track.rankShift === "number" && track.rankShift > 0 ? (
                            <div aria-label="Chart position moved up" className={`h-5 sm:h-6 px-1 sm:px-1.5 rounded-full flex items-center justify-center gap-0.5 text-[10px] sm:text-xs font-bold ${theme === "light"
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                              : "bg-emerald-950/30 text-emerald-400 border border-emerald-900/40"
                              }`}>
                              <svg data-encore-id="icon" role="img" aria-hidden="true" className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current flex-shrink-0" viewBox="0 0 24 24">
                                <path d="M3.5 13.414a.999.999 0 0 1-.707-1.707l9.2-9.207 9.202 9.207a1 1 0 1 1-1.413 1.414L13 6.335V20.5a1 1 0 0 1-2 0V6.322l-6.794 6.799a.999.999 0 0 1-.707.293z"></path>
                              </svg>
                              <span>{track.rankShift}</span>
                            </div>
                          ) : (
                            <div aria-label="Chart position moved down" className={`h-5 sm:h-6 px-1 sm:px-1.5 rounded-full flex items-center justify-center gap-0.5 text-[10px] sm:text-xs font-bold ${theme === "light"
                              ? "bg-red-50 text-red-650 border border-red-200"
                              : "bg-red-955/20 text-red-400 border border-red-900/40"
                              }`}>
                              <svg data-encore-id="icon" role="img" aria-hidden="true" className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current flex-shrink-0" viewBox="0 0 24 24">
                                <path d="M3.5 10.586a1 1 0 0 0-.707 1.707l9.2 9.207 9.202-9.207a1 1 0 1 0-1.413-1.414L13 17.665V3.5a1 1 0 1 0-2 0v14.178l-6.794-6.8a1 1 0 0 0-.707-.292z"></path>
                              </svg>
                              <span>{typeof track.rankShift === "number" ? Math.abs(track.rankShift) : 0}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <img
                        src={track.coverUrl}
                        alt={track.title}
                        className={`w-10 h-10 sm:w-14 sm:h-14 rounded object-cover border flex-shrink-0 ${theme === "light" ? "border-neutral-200" : "border-neutral-900"}`}
                      />
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm sm:text-base md:text-lg font-bold block leading-tight group-hover:underline truncate ${theme === "light" ? "text-neutral-955" : "text-white"}`}>
                          {track.title}
                        </span>
                        <span className={`text-[10px] sm:text-xs block mt-0.5 sm:mt-1 truncate ${theme === "light" ? "text-neutral-600" : "text-neutral-400"}`}>{track.artist}</span>
                      </div>
                    </div>

                    <div className="text-right font-mono flex-shrink-0 pl-1">
                      <span className={`text-sm sm:text-base md:text-lg font-bold block ${theme === "light" ? "text-neutral-955" : "text-white"}`}>
                        {formatNumber(track.totalStreams)}
                      </span>
                      <div className="flex items-center justify-end gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
                        <span className={`text-[10px] sm:text-xs font-semibold ${theme === "light" ? "text-neutral-700" : "text-neutral-300"}`}>
                          +{formatNumber(track.dailyGain)}
                        </span>
                        {(() => {
                          const gainDisplay = getTrackGainDisplay(track, language);
                          if (!gainDisplay || gainDisplay.diff === 0) return null;
                          const isUp = gainDisplay.isUp;
                          return (
                            <span className={`text-[9px] sm:text-[10px] font-semibold flex items-center gap-0.5 ${isUp
                              ? (theme === "light" ? "text-emerald-700" : "text-emerald-400")
                              : (theme === "light" ? "text-red-600" : "text-red-400")
                              }`}>
                              {isUp ? (
                                <svg data-encore-id="icon" role="img" aria-hidden="true" className="w-2.5 h-2.5 fill-current flex-shrink-0 mr-0.5" viewBox="0 0 24 24">
                                  <path d="M3.5 13.414a.999.999 0 0 1-.707-1.707l9.2-9.207 9.202 9.207a1 1 0 1 1-1.413 1.414L13 6.335V20.5a1 1 0 0 1-2 0V6.322l-6.794 6.799a.999.999 0 0 1-.707.293z"></path>
                                </svg>
                              ) : (
                                <svg data-encore-id="icon" role="img" aria-hidden="true" className="w-2.5 h-2.5 fill-current flex-shrink-0 mr-0.5" viewBox="0 0 24 24">
                                  <path d="M3.5 10.586a1 1 0 0 0-.707 1.707l9.2 9.207 9.202-9.207a1 1 0 1 0-1.413-1.414L13 17.665V3.5a1 1 0 1 0-2 0v14.178l-6.794-6.8a1 1 0 0 0-.707-.292z"></path>
                                </svg>
                              )}
                              <span>{gainDisplay.pctStr}%</span>
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                ))}

                {processedTracks.length > visibleTracksCount && (
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={() => setVisibleTracksCount(processedTracks.length)}
                      className="px-8 py-3 text-xs font-bold transition-all neobrutal-btn cursor-pointer"
                    >
                      {language === "pt"
                        ? `Ver mais (${processedTracks.length - visibleTracksCount} mais)`
                        : `See more (${processedTracks.length - visibleTracksCount} more)`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ALBUMS LIST */}
        {streamTab === "albums" && (
          <div className="space-y-4">
            {/* Category Filter Selector */}
            <div className="flex flex-wrap gap-2 pb-2">
              <button
                onClick={() => setAlbumTypeFilter("all")}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border-2 border-black dark:border-white transition-all cursor-pointer ${albumTypeFilter === "all"
                  ? (theme === "light" ? "bg-black text-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]" : "bg-white text-black shadow-[1px_1px_0px_0px_rgba(255,255,255,1)]")
                  : (theme === "light" ? "bg-white text-black hover:bg-neutral-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" : "bg-transparent text-white hover:bg-neutral-900 shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]")
                  }`}
              >
                {language === "pt" ? "Todos" : "All"}
              </button>
              <button
                onClick={() => setAlbumTypeFilter("studio")}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border-2 border-black dark:border-white transition-all cursor-pointer ${albumTypeFilter === "studio"
                  ? (theme === "light" ? "bg-black text-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]" : "bg-white text-black shadow-[1px_1px_0px_0px_rgba(255,255,255,1)]")
                  : (theme === "light" ? "bg-white text-black hover:bg-neutral-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" : "bg-transparent text-white hover:bg-neutral-900 shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]")
                  }`}
              >
                {language === "pt" ? "Estúdio" : "Studio"}
              </button>
              <button
                onClick={() => setAlbumTypeFilter("ep")}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border-2 border-black dark:border-white transition-all cursor-pointer ${albumTypeFilter === "ep"
                  ? (theme === "light" ? "bg-black text-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]" : "bg-white text-black shadow-[1px_1px_0px_0px_rgba(255,255,255,1)]")
                  : (theme === "light" ? "bg-white text-black hover:bg-neutral-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" : "bg-transparent text-white hover:bg-neutral-900 shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]")
                  }`}
              >
                EPs
              </button>
              <button
                onClick={() => setAlbumTypeFilter("compilation")}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border-2 border-black dark:border-white transition-all cursor-pointer ${albumTypeFilter === "compilation"
                  ? (theme === "light" ? "bg-black text-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]" : "bg-white text-black shadow-[1px_1px_0px_0px_rgba(255,255,255,1)]")
                  : (theme === "light" ? "bg-white text-black hover:bg-neutral-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" : "bg-transparent text-white hover:bg-neutral-900 shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]")
                  }`}
              >
                {language === "pt" ? "Participações & Compilações" : "Collabs & Compilations"}
              </button>
              <button
                onClick={() => setAlbumTypeFilter("other")}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border-2 border-black dark:border-white transition-all cursor-pointer ${albumTypeFilter === "other"
                  ? (theme === "light" ? "bg-black text-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]" : "bg-white text-black shadow-[1px_1px_0px_0px_rgba(255,255,255,1)]")
                  : (theme === "light" ? "bg-white text-black hover:bg-neutral-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" : "bg-transparent text-white hover:bg-neutral-900 shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]")
                  }`}
              >
                {language === "pt" ? "Outras Versões" : "Other Versions"}
              </button>
            </div>

            <div className="space-y-2">
            <div className={`flex justify-between text-[10px] font-bold uppercase tracking-wider px-2.5 sm:px-4 pb-3 border-b ${theme === "light" ? "text-neutral-500 border-neutral-200" : "text-neutral-500 border-neutral-900/60"}`}>
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="w-12 sm:w-20 flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  <span className="w-4 sm:w-6 text-right">#</span>
                  <span className="w-8 sm:w-10 text-center">▲▼</span>
                </div>
                <span>{language === "pt" ? "álbum" : "album"}</span>
              </div>
              <span className="text-right">{language === "pt" ? "streams / ganho (dif)" : "streams / gain (diff)"}</span>
            </div>

            {processedAlbums.length === 0 ? (
              <div className={`text-center py-12 text-xs ${theme === "light" ? "text-neutral-500" : "text-neutral-500"}`}>
                {language === "pt" ? "nenhum álbum encontrado." : "no albums match your search."}
              </div>
            ) : (
              <>
                {processedAlbums.slice(0, visibleAlbumsCount).map((album) => (
                  <div
                    key={album.id}
                    onClick={() => handleSelectAlbum(album)}
                    className={`flex items-center justify-between p-2.5 sm:p-4 rounded border transition-all cursor-pointer group ${theme === "light" ? "border-transparent hover:border-neutral-300 hover:bg-neutral-50" : "border-transparent hover:border-neutral-800 hover:bg-neutral-950/60"}`}
                  >
                    <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                      {/* Rank and Shift column */}
                      <div className="flex items-center gap-1.5 sm:gap-2.5 w-12 sm:w-20 flex-shrink-0">
                        <span className={`text-xs sm:text-sm md:text-base font-extrabold w-4 sm:w-6 text-right ${theme === "light" ? "text-neutral-955" : "text-white"}`}>
                          {album.rank}
                        </span>

                        <div className="w-8 sm:w-10 flex justify-center">
                          {album.rankShift === "new" ? (
                            <div aria-label="Chart position new entry" className={`h-4.5 px-1 sm:px-2 rounded-full flex items-center justify-center text-[8px] sm:text-[10px] font-extrabold tracking-wide uppercase ${theme === "light"
                              ? "bg-blue-50 text-blue-600 border border-blue-200"
                              : "bg-blue-950/30 text-blue-400 border border-blue-900/40"
                              }`}>
                              {language === "pt" ? "Novo" : "New"}
                            </div>
                          ) : album.rankShift === null || album.rankShift === 0 ? (
                            <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs font-bold ${theme === "light" ? "bg-neutral-100 text-neutral-400" : "bg-neutral-900/60 text-neutral-500 border border-neutral-850"
                              }`}>
                              —
                            </span>
                          ) : typeof album.rankShift === "number" && album.rankShift > 0 ? (
                            <div aria-label="Chart position moved up" className={`h-5 sm:h-6 px-1 sm:px-1.5 rounded-full flex items-center justify-center gap-0.5 text-[10px] sm:text-xs font-bold ${theme === "light"
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                              : "bg-emerald-950/30 text-emerald-400 border border-emerald-900/40"
                              }`}>
                              <svg data-encore-id="icon" role="img" aria-hidden="true" className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current flex-shrink-0" viewBox="0 0 24 24">
                                <path d="M3.5 13.414a.999.999 0 0 1-.707-1.707l9.2-9.207 9.202 9.207a1 1 0 1 1-1.413 1.414L13 6.335V20.5a1 1 0 0 1-2 0V6.322l-6.794 6.799a.999.999 0 0 1-.707.293z"></path>
                              </svg>
                              <span>{album.rankShift}</span>
                            </div>
                          ) : (
                            <div aria-label="Chart position moved down" className={`h-5 sm:h-6 px-1 sm:px-1.5 rounded-full flex items-center justify-center gap-0.5 text-[10px] sm:text-xs font-bold ${theme === "light"
                              ? "bg-red-50 text-red-650 border border-red-200"
                              : "bg-red-955/20 text-red-400 border border-red-900/40"
                              }`}>
                              <svg data-encore-id="icon" role="img" aria-hidden="true" className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current flex-shrink-0" viewBox="0 0 24 24">
                                <path d="M3.5 10.586a1 1 0 0 0-.707 1.707l9.2 9.207 9.202-9.207a1 1 0 1 0-1.413-1.414L13 17.665V3.5a1 1 0 1 0-2 0v14.178l-6.794-6.8a1 1 0 0 0-.707-.292z"></path>
                              </svg>
                              <span>{typeof album.rankShift === "number" ? Math.abs(album.rankShift) : 0}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <img
                        src={album.coverUrl}
                        alt={album.title}
                        className={`w-10 h-10 sm:w-14 sm:h-14 rounded object-cover border flex-shrink-0 ${theme === "light" ? "border-neutral-200" : "border-neutral-900"}`}
                      />
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm sm:text-base md:text-lg font-bold block leading-tight group-hover:underline truncate ${theme === "light" ? "text-neutral-955" : "text-white"}`}>
                          {album.title}
                        </span>
                        <span className={`text-[10px] sm:text-xs block mt-0.5 sm:mt-1 truncate ${theme === "light" ? "text-neutral-600" : "text-neutral-400"}`}>{album.year}</span>
                      </div>
                    </div>

                    <div className="text-right font-mono flex-shrink-0 pl-1">
                      <span className={`text-sm sm:text-base md:text-lg font-bold block ${theme === "light" ? "text-neutral-955" : "text-white"}`}>
                        {formatNumber(album.totalStreams)}
                      </span>
                      <div className="flex items-center justify-end gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
                        <span className={`text-[10px] sm:text-xs font-semibold ${theme === "light" ? "text-neutral-700" : "text-neutral-300"}`}>
                          +{formatNumber(album.dailyGain)}
                        </span>
                        {(() => {
                          const gainDisplay = getAlbumGainDisplay(album, language);
                          if (!gainDisplay || gainDisplay.diff === 0) return null;
                          const isUp = gainDisplay.isUp;
                          return (
                            <span className={`text-[9px] sm:text-[10px] font-semibold flex items-center gap-0.5 ${isUp
                              ? (theme === "light" ? "text-emerald-700" : "text-emerald-400")
                              : (theme === "light" ? "text-red-600" : "text-red-400")
                              }`}>
                              {isUp ? (
                                <svg data-encore-id="icon" role="img" aria-hidden="true" className="w-2 h-2 fill-current flex-shrink-0 mr-0.5" viewBox="0 0 24 24">
                                  <path d="M3.5 13.414a.999.999 0 0 1-.707-1.707l9.2-9.207 9.202 9.207a1 1 0 1 1-1.413 1.414L13 6.335V20.5a1 1 0 0 1-2 0V6.322l-6.794 6.799a.999.999 0 0 1-.707.293z"></path>
                                </svg>
                              ) : (
                                <svg data-encore-id="icon" role="img" aria-hidden="true" className="w-2 h-2 fill-current flex-shrink-0 mr-0.5" viewBox="0 0 24 24">
                                  <path d="M3.5 10.586a1 1 0 0 0-.707 1.707l9.2 9.207 9.202-9.207a1 1 0 1 0-1.413-1.414L13 17.665V3.5a1 1 0 1 0-2 0v14.178l-6.794-6.8a1 1 0 0 0-.707-.292z"></path>
                                </svg>
                              )}
                              <span>{gainDisplay.pctStr}%</span>
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                ))}

                {processedAlbums.length > visibleAlbumsCount && (
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={() => setVisibleAlbumsCount(processedAlbums.length)}
                      className="px-8 py-3 text-xs font-bold transition-all neobrutal-btn cursor-pointer"
                    >
                      {language === "pt"
                        ? `Ver mais (${processedAlbums.length - visibleAlbumsCount} mais)`
                        : `See more (${processedAlbums.length - visibleAlbumsCount} more)`}
                    </button>
                  </div>
                )}
              </>
            )}
            </div>
          </div>
        )}

        {/* MILESTONES LIST */}
        {streamTab === "milestones" && (
          <div className="space-y-4">
            {milestoneSubTab === "upcoming" ? (
              <div className="space-y-3">
                <div className={`flex justify-between text-[10px] font-bold uppercase tracking-wider px-3 sm:px-4 pb-3 border-b ${theme === "light" ? "text-neutral-500 border-neutral-200" : "text-neutral-500 border-neutral-900/60"}`}>
                  <span>{language === "pt" ? "música / álbum" : "track / album"}</span>
                  <span className="text-right">{language === "pt" ? "meta / previsão" : "target / forecast"}</span>
                </div>

                {upcomingMilestones.length === 0 ? (
                  <div className={`text-center py-12 text-xs ${theme === "light" ? "text-neutral-500" : "text-neutral-500"}`}>
                    {language === "pt" ? "nenhuma meta futura encontrada." : "no upcoming milestones found."}
                  </div>
                ) : (
                  <>
                    {upcomingMilestones.slice(0, visibleMilestonesCount).map((item) => (
                      <div
                        key={`${item.type}-${item.id}`}
                        onClick={() => {
                          if (item.type === "track") {
                            handleSelectTrack(item as any);
                          } else {
                            handleSelectAlbum(item as any);
                          }
                        }}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded border transition-all cursor-pointer gap-3 sm:gap-4 group ${theme === "light" ? "border-transparent hover:border-neutral-300 hover:bg-neutral-50" : "border-transparent hover:border-neutral-800 hover:bg-neutral-950/60"}`}
                      >
                        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                          <img
                            src={item.coverUrl}
                            alt={item.title}
                            className={`w-10 h-10 sm:w-14 sm:h-14 rounded object-cover border flex-shrink-0 ${theme === "light" ? "border-neutral-200" : "border-neutral-900"}`}
                          />
                          <div className="flex-1 min-w-0">
                            <span className={`text-sm sm:text-base md:text-lg font-bold block leading-tight group-hover:shop-underline-hover truncate ${theme === "light" ? "text-neutral-955" : "text-white"}`}>
                              {item.title}
                            </span>
                            <span className={`text-[10px] uppercase font-bold tracking-wider ${theme === "light" ? "text-neutral-500" : "text-mauve"} block mt-0.5 sm:mt-1`}>
                              {language === "pt" ? (item.type === "track" ? "música" : "álbum") : item.type} • {item.artist}
                            </span>

                            {/* Progress bar */}
                            <div className="flex items-center gap-2 mt-1 sm:mt-2">
                              <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${theme === "light" ? "bg-neutral-200" : "bg-neutral-900"}`}>
                                <div
                                  className={`h-full rounded-full ${theme === "light" ? "bg-black" : "bg-rose"}`}
                                  style={{ width: `${item.progressPercent}%` }}
                                />
                              </div>
                              <span className="font-mono text-[10px] sm:text-xs font-bold leading-none">{item.progressPercent.toFixed(1)}%</span>
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
                    ))}

                    {upcomingMilestones.length > visibleMilestonesCount && (
                      <div className="flex justify-center mt-6">
                        <button
                          onClick={() => setVisibleMilestonesCount(upcomingMilestones.length)}
                          className="px-8 py-3 text-xs font-bold transition-all neobrutal-btn cursor-pointer"
                        >
                          {language === "pt"
                            ? `Ver mais (${upcomingMilestones.length - visibleMilestonesCount} mais)`
                            : `See more (${upcomingMilestones.length - visibleMilestonesCount} more)`}
                        </button>
                      </div>
                    )}
                  </>
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
                    {language === "pt" ? "nenhum membro superou esta meta ainda." : "no members have surpassed this milestone yet."}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {surpassedItems.slice(0, visibleMilestonesCount).map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleSelectTrack(item as any)}
                          className={`flex items-center justify-between p-2.5 sm:p-3.5 rounded border transition-all cursor-pointer group ${theme === "light"
                            ? "border-transparent hover:border-neutral-300 hover:bg-neutral-50"
                            : "border-transparent hover:border-neutral-800 hover:bg-neutral-950/60"
                            }`}
                        >
                          <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
                            <img
                              src={item.coverUrl}
                              alt={item.title}
                              className={`w-10 h-10 sm:w-12 sm:h-12 rounded object-cover border flex-shrink-0 ${theme === "light" ? "border-neutral-200" : "border-neutral-900"}`}
                            />
                            <div className="min-w-0">
                              <span className={`text-xs sm:text-sm md:text-base font-bold block leading-snug group-hover:underline truncate ${theme === "light" ? "text-neutral-955" : "text-white"}`}>
                                {item.title}
                              </span>
                              <span className={`text-[9px] uppercase font-bold tracking-wider ${theme === "light" ? "text-neutral-500" : "text-mauve"} block mt-0.5`}>
                                {language === "pt" ? "música" : "track"}
                              </span>
                            </div>
                          </div>

                          <div className="text-right font-mono flex-shrink-0 flex items-center gap-1.5 sm:gap-2">
                            <span className={`text-xs font-bold ${theme === "light" ? "text-neutral-955" : "text-rose"}`}>
                              {formatNumber(item.totalStreams)}
                            </span>
                            <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded ${theme === "light" ? "bg-black text-white" : "bg-rose text-floral-bg"}`}>
                              {SURPASSED_TARGETS.find(t => t.value === selectedSurpassedTarget)?.label || "passed"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {surpassedItems.length > visibleMilestonesCount && (
                      <div className="flex justify-center mt-6">
                        <button
                          onClick={() => setVisibleMilestonesCount(surpassedItems.length)}
                          className="px-8 py-3 text-xs font-bold transition-all neobrutal-btn cursor-pointer"
                        >
                          {language === "pt"
                            ? `Ver mais (${surpassedItems.length - visibleMilestonesCount} mais)`
                            : `See more (${surpassedItems.length - visibleMilestonesCount} more)`}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

            {/* PROJECTIONS CALCULATOR */}
            {streamTab === "projections" && (
              <div className="space-y-6 animate-fade-in">
                {/* Header info */}
                <div className={`border-b pb-4 ${theme === "light" ? "border-neutral-200" : "border-neutral-900"}`}>
                  <h3 className="text-xl font-serif font-bold text-rose lowercase tracking-wide">
                    {language === "pt" ? "calculadora de projeções de streams" : "streaming projections calculator"}
                  </h3>
                  <p className={`text-xs mt-1.5 ${theme === "light" ? "text-neutral-500" : "text-mauve"}`}>
                    {language === "pt"
                      ? "selecione uma data no calendário para estimar os streams futuros com base na velocidade diária atual."
                      : "select a date on the calendar to estimate future streams based on current daily gains."}
                  </p>
                </div>

                <div className="flex flex-col lg:flex-row gap-8 items-start">
                  {/* Left Column: Custom Calendar Component */}
                  <div className="w-full lg:w-80 flex-shrink-0">
                    <div className="border-2 border-black dark:border-white bg-panel-bg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] p-4 select-none">
                      {isMonthYearSelectorOpen ? (
                        /* Month and Year selector (Windows style) */
                        <div className="space-y-4">
                          {/* Header showing year with up/down navigation */}
                          <div className="flex items-center justify-between border-b pb-2 border-panel-border/20">
                            <span className="font-serif font-bold text-lg text-rose">
                              {currentCalendarDate.getFullYear()}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleYearChange(-1)}
                                className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-900 border border-panel-border/25 cursor-pointer text-foreground"
                                title={language === "pt" ? "Ano anterior" : "Previous year"}
                              >
                                <ArrowDown className="w-4 h-4 transform rotate-90" />
                              </button>
                              <button
                                onClick={() => handleYearChange(1)}
                                className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-900 border border-panel-border/25 cursor-pointer text-foreground"
                                title={language === "pt" ? "Próximo ano" : "Next year"}
                              >
                                <ArrowUp className="w-4 h-4 transform rotate-90" />
                              </button>
                            </div>
                          </div>

                          {/* 3x4 Month Grid */}
                          <div className="grid grid-cols-4 gap-2 text-center text-xs">
                            {(language === "pt" ? monthAbbrPT : monthAbbrEN).map((monthName, idx) => {
                              const isSelectedMonth = currentCalendarDate.getMonth() === idx;
                              return (
                                <button
                                  key={monthName}
                                  onClick={() => handleMonthSelect(idx)}
                                  className={`py-2 border transition-all cursor-pointer font-semibold uppercase tracking-wider rounded-none ${
                                    isSelectedMonth
                                      ? (theme === "light" ? "bg-black border-black text-white" : "bg-rose border-rose text-floral-bg")
                                      : "border-transparent hover:border-black dark:hover:border-white hover:bg-neutral-50 dark:hover:bg-neutral-900"
                                  }`}
                                >
                                  {monthName}
                                </button>
                              );
                            })}
                          </div>

                          {/* Cancel Month selection button */}
                          <button
                            onClick={() => setIsMonthYearSelectorOpen(false)}
                            className="w-full py-1 text-[10px] uppercase font-bold tracking-widest border border-dashed border-panel-border/40 hover:border-solid hover:bg-neutral-50 dark:hover:bg-neutral-900 text-mauve cursor-pointer"
                          >
                            {language === "pt" ? "voltar ao calendário" : "back to calendar"}
                          </button>
                        </div>
                      ) : (
                        /* Regular Days Calendar Picker */
                        <div className="space-y-4">
                          {/* Header with Month/Year toggle and navigation */}
                          <div className="flex items-center justify-between border-b pb-2 border-panel-border/20">
                            <button
                              onClick={handlePrevMonth}
                              className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-900 border border-panel-border/25 cursor-pointer text-foreground"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            
                            <button
                              onClick={() => setIsMonthYearSelectorOpen(true)}
                              className="font-serif font-bold text-base hover:text-rose transition-colors cursor-pointer capitalize"
                              title={language === "pt" ? "Selecionar mês e ano" : "Select month and year"}
                            >
                              {currentMonthName} {currentCalendarDate.getFullYear()}
                            </button>

                            <button
                              onClick={handleNextMonth}
                              className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-900 border border-panel-border/25 cursor-pointer text-foreground"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Weekday headers */}
                          <div className="grid grid-cols-7 text-center text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-mauve mb-1">
                            {(language === "pt" ? weekdayHeadersPT : weekdayHeadersEN).map((day, idx) => (
                              <div key={idx} className="py-1">{day}</div>
                            ))}
                          </div>

                          {/* Days Grid */}
                          <div className="grid grid-cols-7 gap-1 text-center text-xs font-mono">
                            {calendarCells.map((cell, idx) => {
                              if (cell.type === "empty") {
                                return <div key={`empty-${idx}`} />;
                              }

                              const cellDate = cell.date as Date;
                              const isSelected = selectedDate.getDate() === cellDate.getDate() &&
                                                 selectedDate.getMonth() === cellDate.getMonth() &&
                                                 selectedDate.getFullYear() === cellDate.getFullYear();
                                                 
                              const today = new Date();
                              const isToday = today.getDate() === cellDate.getDate() &&
                                              today.getMonth() === cellDate.getMonth() &&
                                              today.getFullYear() === cellDate.getFullYear();
                                              
                              // Check if cell is in the past compared to reference date
                              const isPast = getDaysDifference(refDate, cellDate) < 0;

                              return (
                                <button
                                  key={`day-${cell.value}`}
                                  onClick={() => handleDayClick(cellDate)}
                                  className={`aspect-square w-full flex flex-col items-center justify-center relative border transition-all cursor-pointer ${
                                    isSelected
                                      ? (theme === "light" ? "bg-black border-black text-white font-bold" : "bg-rose border-rose text-floral-bg font-bold")
                                      : isPast
                                        ? "border-transparent text-neutral-300 dark:text-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900/40"
                                        : "border-transparent hover:border-neutral-300 dark:hover:border-neutral-850 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                                  }`}
                                >
                                  <span>{cell.value}</span>
                                  {isToday && (
                                    <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${isSelected ? "bg-white dark:bg-black" : "bg-rose"}`} />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Projections Results */}
                  <div className="flex-1 w-full lg:w-auto min-w-0 space-y-6">
                    {/* Result header & summary box */}
                    <div className="border-2 border-black dark:border-white bg-panel-bg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] p-6 space-y-4">
                      <div>
                        <span className="neobrutal-sticker neobrutal-sticker-rose mb-2">
                          {language === "pt" ? "resultados da projeção" : "projection results"}
                        </span>
                        <h4 className="text-xl md:text-2xl font-serif font-bold text-rose leading-tight">
                          {selectedDate.toLocaleDateString(language === "pt" ? "pt-BR" : "en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric"
                          })}
                        </h4>
                        <p className={`text-xs font-mono mt-1 ${theme === "light" ? "text-neutral-500" : "text-mauve"}`}>
                          {daysDiff > 0 ? (
                            language === "pt"
                              ? `daqui a ${daysDiff} dias (velocidade diária: +${formatNumber(projectedGlobalDailyVelocity)}/dia)`
                              : `in ${daysDiff} days (daily velocity: +${formatNumber(projectedGlobalDailyVelocity)}/day)`
                          ) : (
                            language === "pt"
                              ? "data no passado/hoje. exibindo dados de streams atuais."
                              : "date is in the past/today. showing current stream data."
                          )}
                        </p>
                      </div>

                      {daysDiff < 0 && (
                        <div className="p-3 border-2 border-dashed border-red-500/50 bg-red-500/5 text-red-500 text-xs rounded-none font-mono">
                          {language === "pt"
                            ? "nota: datas anteriores ao último registro de banco de dados não mostram estimativas decrescentes, exibem apenas os streams totais mais recentes."
                            : "note: dates before the last database record do not show decreasing estimates, they only display the most recent total streams."}
                        </div>
                      )}

                      {/* Summary grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-panel-border/20 pt-4 font-mono">
                        <div className="p-4 bg-neutral-50 dark:bg-neutral-950/40 border border-panel-border/25">
                          <span className="text-[10px] text-mauve uppercase block mb-1">
                            {language === "pt" ? "Streams Totais Projetados" : "Projected Total Streams"}
                          </span>
                          <span className="text-2xl font-extrabold text-rose">
                            {formatNumber(projectedGlobalTotal)}
                          </span>
                        </div>

                        <div className="p-4 bg-neutral-50 dark:bg-neutral-950/40 border border-panel-border/25">
                          <span className="text-[10px] text-mauve uppercase block mb-1">
                            {language === "pt" ? "Novos Streams Acumulados" : "New Streams Gained"}
                          </span>
                          <span className="text-2xl font-extrabold text-emerald-500">
                            +{formatNumber(globalGained)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sub-tabs for Tracks / Albums list toggle */}
                    <div className="border-2 border-black dark:border-white bg-panel-bg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] p-6 space-y-4">
                      <div className="flex border-b border-panel-border/20 pb-4 justify-between items-center flex-wrap gap-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setProjectionType("tracks")}
                            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                              projectionType === "tracks"
                                ? (theme === "light" ? "bg-black border-black text-white" : "bg-rose border-rose text-floral-bg")
                                : "border-panel-border/40 text-mauve hover:text-rose"
                            }`}
                          >
                            {language === "pt" ? "músicas" : "tracks"}
                          </button>
                          <button
                            onClick={() => setProjectionType("albums")}
                            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                              projectionType === "albums"
                                ? (theme === "light" ? "bg-black border-black text-white" : "bg-rose border-rose text-floral-bg")
                                : "border-panel-border/40 text-mauve hover:text-rose"
                            }`}
                          >
                            {language === "pt" ? "álbuns" : "albums"}
                          </button>
                        </div>

                        <span className="text-[10px] font-mono text-mauve">
                          {language === "pt" ? "ordenado por total projetado" : "sorted by projected total"}
                        </span>
                      </div>

                      {/* List Content */}
                      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                        {projectionType === "tracks" ? (
                          projectedTracksList.map((track, idx) => (
                            <div
                              key={track.id}
                              onClick={() => handleSelectTrack(track as any)}
                              className={`flex items-center justify-between p-2.5 sm:p-4 rounded border transition-all cursor-pointer group ${
                                theme === "light"
                                  ? "border-transparent hover:border-neutral-300 hover:bg-neutral-50"
                                  : "border-transparent hover:border-neutral-800 hover:bg-neutral-950/60"
                              }`}
                            >
                              <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                                {/* Rank and Shift column */}
                                <div className="flex items-center gap-1.5 sm:gap-2.5 w-12 sm:w-20 flex-shrink-0">
                                  <span className={`text-xs sm:text-sm md:text-base font-extrabold w-4 sm:w-6 text-right ${
                                    theme === "light" ? "text-neutral-955" : "text-white"
                                  }`}>
                                    {track.projectedRank}
                                  </span>

                                  <div className="w-8 sm:w-10 flex justify-center">
                                    {track.rankShift === 0 || track.rankShift === null || track.rankShift === undefined ? (
                                      <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                        theme === "light" ? "bg-neutral-100 text-neutral-400" : "bg-neutral-900/60 text-neutral-500 border border-neutral-850"
                                      }`}>
                                        —
                                      </span>
                                    ) : track.rankShift > 0 ? (
                                      <div aria-label="Chart position moved up" className={`h-5 sm:h-6 px-1 sm:px-1.5 rounded-full flex items-center justify-center gap-0.5 text-[10px] sm:text-xs font-bold ${
                                        theme === "light" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-emerald-950/30 text-emerald-400 border border-emerald-900/40"
                                      }`}>
                                        <svg data-encore-id="icon" role="img" aria-hidden="true" className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current flex-shrink-0" viewBox="0 0 24 24">
                                          <path d="M3.5 13.414a.999.999 0 0 1-.707-1.707l9.2-9.207 9.202 9.207a1 1 0 1 1-1.413 1.414L13 6.335V20.5a1 1 0 0 1-2 0V6.322l-6.794 6.799a.999.999 0 0 1-.707.293z"></path>
                                        </svg>
                                        <span>{track.rankShift}</span>
                                      </div>
                                    ) : (
                                      <div aria-label="Chart position moved down" className={`h-5 sm:h-6 px-1 sm:px-1.5 rounded-full flex items-center justify-center gap-0.5 text-[10px] sm:text-xs font-bold ${
                                        theme === "light" ? "bg-red-50 text-red-655 border border-red-200" : "bg-red-955/20 text-red-400 border border-red-900/40"
                                      }`}>
                                        <svg data-encore-id="icon" role="img" aria-hidden="true" className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current flex-shrink-0" viewBox="0 0 24 24">
                                          <path d="M3.5 10.586a1 1 0 0 0-.707 1.707l9.2 9.207 9.202-9.207a1 1 0 1 0-1.413-1.414L13 17.665V3.5a1 1 0 1 0-2 0v14.178l-6.794-6.8a1 1 0 0 0-.707-.292z"></path>
                                        </svg>
                                        <span>{Math.abs(track.rankShift)}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <img
                                  src={track.coverUrl}
                                  alt={track.title}
                                  className={`w-10 h-10 sm:w-14 sm:h-14 rounded object-cover border flex-shrink-0 ${
                                    theme === "light" ? "border-neutral-200" : "border-neutral-900"
                                  }`}
                                />
                                <div className="flex-1 min-w-0">
                                  <span className={`text-sm sm:text-base md:text-lg font-bold block leading-tight group-hover:underline truncate ${
                                    theme === "light" ? "text-neutral-955" : "text-white"
                                  }`}>
                                    {track.title}
                                  </span>
                                  <span className={`text-[10px] sm:text-xs block mt-0.5 sm:mt-1 truncate ${
                                    theme === "light" ? "text-neutral-600" : "text-neutral-400"
                                  }`}>
                                    {track.artist}
                                  </span>
                                </div>
                              </div>

                              <div className="text-right font-mono flex-shrink-0 pl-1">
                                <span className={`text-sm sm:text-base md:text-lg font-bold block ${
                                  theme === "light" ? "text-neutral-955" : "text-white"
                                }`}>
                                  {formatNumber(track.projectedTotal)}
                                </span>
                                <div className="flex items-center justify-end gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
                                  <span className="text-[10px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                    +{formatNumber(track.gained)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          projectedAlbumsList.map((album, idx) => (
                            <div
                              key={album.id}
                              onClick={() => handleSelectAlbum(album as any)}
                              className={`flex items-center justify-between p-2.5 sm:p-4 rounded border transition-all cursor-pointer group ${
                                theme === "light"
                                  ? "border-transparent hover:border-neutral-300 hover:bg-neutral-50"
                                  : "border-transparent hover:border-neutral-800 hover:bg-neutral-950/60"
                              }`}
                            >
                              <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                                {/* Rank and Shift column */}
                                <div className="flex items-center gap-1.5 sm:gap-2.5 w-12 sm:w-20 flex-shrink-0">
                                  <span className={`text-xs sm:text-sm md:text-base font-extrabold w-4 sm:w-6 text-right ${
                                    theme === "light" ? "text-neutral-955" : "text-white"
                                  }`}>
                                    {album.projectedRank}
                                  </span>
                                  <div className="w-8 sm:w-10 flex justify-center">
                                    {album.rankShift === 0 || album.rankShift === null || album.rankShift === undefined ? (
                                      <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                        theme === "light" ? "bg-neutral-100 text-neutral-400" : "bg-neutral-900/60 text-neutral-500 border border-neutral-850"
                                      }`}>
                                        —
                                      </span>
                                    ) : album.rankShift > 0 ? (
                                      <div aria-label="Chart position moved up" className={`h-5 sm:h-6 px-1 sm:px-1.5 rounded-full flex items-center justify-center gap-0.5 text-[10px] sm:text-xs font-bold ${
                                        theme === "light" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-emerald-950/30 text-emerald-400 border border-emerald-900/40"
                                      }`}>
                                        <svg data-encore-id="icon" role="img" aria-hidden="true" className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current flex-shrink-0" viewBox="0 0 24 24">
                                          <path d="M3.5 13.414a.999.999 0 0 1-.707-1.707l9.2-9.207 9.202 9.207a1 1 0 1 1-1.413 1.414L13 6.335V20.5a1 1 0 0 1-2 0V6.322l-6.794 6.799a.999.999 0 0 1-.707.293z"></path>
                                        </svg>
                                        <span>{album.rankShift}</span>
                                      </div>
                                    ) : (
                                      <div aria-label="Chart position moved down" className={`h-5 sm:h-6 px-1 sm:px-1.5 rounded-full flex items-center justify-center gap-0.5 text-[10px] sm:text-xs font-bold ${
                                        theme === "light" ? "bg-red-50 text-red-655 border border-red-200" : "bg-red-955/20 text-red-400 border border-red-900/40"
                                      }`}>
                                        <svg data-encore-id="icon" role="img" aria-hidden="true" className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current flex-shrink-0" viewBox="0 0 24 24">
                                          <path d="M3.5 10.586a1 1 0 0 0-.707 1.707l9.2 9.207 9.202-9.207a1 1 0 1 0-1.413-1.414L13 17.665V3.5a1 1 0 1 0-2 0v14.178l-6.794-6.8a1 1 0 0 0-.707-.292z"></path>
                                        </svg>
                                        <span>{Math.abs(album.rankShift)}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <img
                                  src={album.coverUrl}
                                  alt={album.title}
                                  className={`w-10 h-10 sm:w-14 sm:h-14 rounded object-cover border flex-shrink-0 ${
                                    theme === "light" ? "border-neutral-200" : "border-neutral-900"
                                  }`}
                                />
                                <div className="flex-1 min-w-0">
                                  <span className={`text-sm sm:text-base md:text-lg font-bold block leading-tight group-hover:underline truncate ${
                                    theme === "light" ? "text-neutral-955" : "text-white"
                                  }`}>
                                    {album.title}
                                  </span>
                                  <span className={`text-[10px] sm:text-xs block mt-0.5 sm:mt-1 truncate ${
                                    theme === "light" ? "text-neutral-600" : "text-neutral-400"
                                  }`}>
                                    {album.year}
                                  </span>
                                </div>
                              </div>

                              <div className="text-right font-mono flex-shrink-0 pl-1">
                                <span className={`text-sm sm:text-base md:text-lg font-bold block ${
                                  theme === "light" ? "text-neutral-955" : "text-white"
                                }`}>
                                  {formatNumber(album.projectedTotal)}
                                </span>
                                <div className="flex items-center justify-end gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
                                  <span className="text-[10px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                    +{formatNumber(album.gained)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
      </div>

      {/* MILESTONE PROGRESS MODAL POPUP */}
      {selectedTrack && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl p-4 md:p-8 relative animate-slide-up max-h-[90vh] overflow-y-auto border-2 border-black dark:border-white bg-panel-bg text-foreground shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]">
            <button
              onClick={() => setSelectedTrack(null)}
              className="absolute top-4 right-4 md:top-6 md:right-6 p-2 transition-all cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-500 hover:text-black dark:hover:text-white"
            >
              <X className="w-5 h-5 md:w-6 md:h-6" />
            </button>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-6 items-center sm:items-start border-b border-black dark:border-white pb-6 text-center sm:text-left">
              <img
                src={selectedTrack.coverUrl}
                alt={selectedTrack.title}
                className="w-20 h-20 object-cover border-2 border-black dark:border-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]"
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

                <div className="w-full h-4 border-2 border-black dark:border-white bg-neutral-100 dark:bg-neutral-900 overflow-hidden rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                  <div
                    className={`h-full transition-all duration-500 ${theme === "light" ? "bg-black" : "bg-rose"}`}
                    style={{
                      width: `${selectedTrackProgressPercent}%`,
                    }}
                  />
                </div>
              </div>

              <div className="p-4 md:p-6 border-2 border-black dark:border-white bg-neutral-50 dark:bg-neutral-950 space-y-3 md:space-y-3.5 text-xs md:text-sm font-mono shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]">
                <div className="flex justify-between">
                  <span className="text-neutral-500 dark:text-mauve">{language === "pt" ? "streams totais:" : "total streams:"}</span>
                  <span className="font-bold text-neutral-950 dark:text-rose">{formatNumber(selectedTrack.totalStreams)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500 dark:text-mauve">{language === "pt" ? "streams necessários:" : "streams needed:"}</span>
                  <span className="font-bold text-neutral-950 dark:text-rose">
                    {formatNumber(selectedTrackRemainingStreams)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500 dark:text-mauve">{language === "pt" ? "ganho diário:" : "daily gain velocity:"}</span>
                  <span className="font-bold text-neutral-950 dark:text-rose">+{formatNumber(selectedTrackPace)}</span>
                </div>
                <div className="flex justify-between border-t border-black dark:border-white pt-3 mt-3">
                  <span className="text-neutral-500 dark:text-mauve">{language === "pt" ? "dias estimados para a meta:" : "est. days to goal:"}</span>
                  <span className="font-bold text-neutral-950 dark:text-rose">
                    {selectedTrackDaysToGoal === null ? "—" : `${selectedTrackDaysToGoal} ${language === "pt" ? "dias" : "days"}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500 dark:text-mauve">{language === "pt" ? "data prevista:" : "target date:"}</span>
                  <span className="font-bold text-neutral-950 dark:text-rose">
                    {selectedTrackDaysToGoal === null ? "—" : getMilestoneDate(selectedTrackDaysToGoal)}
                  </span>
                </div>
              </div>

              {/* Interactive Stream Chart */}
              {selectedTrack.streams && (
                <div className="p-3.5 md:p-5 border-2 border-black dark:border-white bg-neutral-50 dark:bg-neutral-950/20 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]">
                  <h4 className="text-[10px] md:text-xs font-bold uppercase tracking-wider mb-3 font-sans text-neutral-500 dark:text-mauve">
                    {language === "pt" ? "gráfico de desempenho histórico" : "historical performance chart"}
                  </h4>
                  <StreamChart streams={selectedTrack.streams} theme={theme} language={language} />
                </div>
              )}
            </div>

            <div className="mt-6 md:mt-8 flex justify-end">
              <button
                onClick={() => setSelectedTrack(null)}
                className="w-full sm:w-auto px-6 py-3 text-xs font-bold uppercase tracking-wider neobrutal-btn cursor-pointer"
              >
                {t("streams.close")}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ALBUM MILESTONE PROGRESS MODAL POPUP */}
      {selectedAlbum && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl p-4 md:p-8 relative animate-slide-up max-h-[90vh] overflow-y-auto border-2 border-black dark:border-white bg-panel-bg text-foreground shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]">
            <button
              onClick={() => setSelectedAlbum(null)}
              className="absolute top-4 right-4 md:top-6 md:right-6 p-2 transition-all cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-500 hover:text-black dark:hover:text-white"
            >
              <X className="w-5 h-5 md:w-6 md:h-6" />
            </button>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-6 items-center sm:items-start border-b border-black dark:border-white pb-6 text-center sm:text-left">
              <img
                src={selectedAlbum.coverUrl}
                alt={selectedAlbum.title}
                className="w-20 h-20 object-cover border-2 border-black dark:border-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]"
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

                <div className="w-full h-4 border-2 border-black dark:border-white bg-neutral-100 dark:bg-neutral-900 overflow-hidden rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                  <div
                    className={`h-full transition-all duration-500 ${theme === "light" ? "bg-black" : "bg-rose"}`}
                    style={{
                      width: `${selectedAlbumProgressPercent}%`,
                    }}
                  />
                </div>
              </div>

                 <div className="p-4 md:p-6 border-2 border-black dark:border-white bg-neutral-50 dark:bg-neutral-950 space-y-3 md:space-y-3.5 text-xs md:text-sm font-mono shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]">
                <div className="flex justify-between">
                  <span className="text-neutral-500 dark:text-mauve">{language === "pt" ? "streams totais:" : "total streams:"}</span>
                  <span className="font-bold text-neutral-955 dark:text-rose">{formatNumber(selectedAlbum.totalStreams)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500 dark:text-mauve">{language === "pt" ? "streams necessários:" : "streams needed:"}</span>
                  <span className="font-bold text-neutral-950 dark:text-rose">
                    {formatNumber(selectedAlbumRemainingStreams)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500 dark:text-mauve">{language === "pt" ? "ganho diário:" : "daily gain velocity:"}</span>
                  <span className="font-bold text-neutral-950 dark:text-rose">+{formatNumber(selectedAlbumPace)}</span>
                </div>
                <div className="flex justify-between border-t-2 border-black dark:border-white pt-3 mt-3">
                  <span className="text-neutral-500 dark:text-mauve">{language === "pt" ? "dias estimados para a meta:" : "est. days to goal:"}</span>
                  <span className="font-bold text-neutral-950 dark:text-rose">
                    {selectedAlbumDaysToGoal === null ? "—" : `${selectedAlbumDaysToGoal} ${language === "pt" ? "dias" : "days"}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500 dark:text-mauve">{language === "pt" ? "data prevista:" : "target date:"}</span>
                  <span className="font-bold text-neutral-950 dark:text-rose">
                    {selectedAlbumDaysToGoal === null ? "—" : getMilestoneDate(selectedAlbumDaysToGoal)}
                  </span>
                </div>
              </div>

              {/* Album Tracklist */}
              {albumTracks.length > 0 && (
                <div className="p-3.5 md:p-5 border-2 border-black dark:border-white bg-neutral-50 dark:bg-neutral-950/20 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]">
                  <h4 className="text-[10px] md:text-xs font-bold uppercase tracking-wider mb-3 font-sans text-neutral-500 dark:text-mauve">
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
                        className={`grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-2.5 items-center p-2 border-b-2 border-neutral-100 dark:border-neutral-900 last:border-b-0 transition-all cursor-pointer text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-900/60`}
                      >
                        <span className="text-[10px] font-mono w-4 text-right text-neutral-400 dark:text-mauve/60">
                          {idx + 1}
                        </span>
                        <div className="flex items-center gap-2 min-w-0">
                          <img src={track.coverUrl} className="w-7 h-7 object-cover border-2 border-black dark:border-white flex-shrink-0" alt="" />
                          <p className="text-xs font-bold truncate">
                            {track.title}
                          </p>
                        </div>
                        <span className="font-mono text-[10px] w-20 sm:w-24 text-right">
                          {formatNumber(track.totalStreams)}
                        </span>
                        <span className="font-mono text-[10px] w-16 sm:w-20 text-right font-semibold text-neutral-500 dark:text-mauve">
                          +{formatNumber(track.dailyGain)}
                        </span>
                        <span className="font-mono text-[9px] w-14 sm:w-16 text-right font-bold flex items-center justify-end">
                          {(() => {
                            const gainDisplay = getTrackGainDisplay(track, language);
                            if (!gainDisplay || gainDisplay.diff === 0) {
                              return <span className="text-neutral-450 dark:text-mauve/40">—</span>;
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
                <div className="p-3.5 md:p-5 border-2 border-black dark:border-white bg-neutral-50 dark:bg-neutral-950/20 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]">
                  <h4 className="text-[10px] md:text-xs font-bold uppercase tracking-wider mb-3 font-sans text-neutral-500 dark:text-mauve">
                    {language === "pt" ? "gráfico de desempenho histórico" : "historical performance chart"}
                  </h4>
                  <StreamChart streams={selectedAlbum.streams} theme={theme} language={language} />
                </div>
              )}
            </div>

            <div className="mt-6 md:mt-8 flex justify-end">
              <button
                onClick={() => setSelectedAlbum(null)}
                className="w-full sm:w-auto px-6 py-3 text-xs font-bold uppercase tracking-wider neobrutal-btn cursor-pointer"
              >
                {t("streams.close")}
              </button>
            </div>
          </div>
        </div>
      )}
      {isLoadingDetail && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center backdrop-blur-sm animate-fade-in">
          <div className="flex flex-col items-center gap-3 p-6 rounded-lg bg-wine border border-panel-border/30 text-rose shadow-2xl">
            <RefreshCw className="w-8 h-8 animate-spin" />
            <span className="text-xs font-mono">{language === "pt" ? "carregando detalhes..." : "loading details..."}</span>
          </div>
        </div>
      )}
    </div>
  );
}
