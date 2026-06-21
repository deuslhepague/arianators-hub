"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSpotify } from "@/context/SpotifyContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { dbOperations } from "@/lib/firebase";
import { addStreamHistoryEntry, getTodayDateStr } from "@/lib/streamHistory";
import { calculateForecast } from "@/lib/forecasting";
import { getMilestoneForStreams } from "@/lib/milestones";
import {
  Settings,
  RefreshCw,
  Database,
  Trash2,
  Plus,
  Save,
  AlertCircle,
  Check,
  X,
  ArrowRightLeft,
  ShieldAlert,
  Edit3,
  Calendar
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
  streams?: { [date: string]: { total: number; daily: number | null } };
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
  streams?: { [date: string]: { total: number; daily: number | null } };
}

export default function AdminPanel() {
  const { language } = useLanguage();
  const { theme } = useTheme();
  const lt = theme === "light";

  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState("");
  const [authError, setAuthError] = useState(false);

  // Panel tabs: "catalog" | "streams"
  const [adminTab, setAdminTab] = useState<"catalog" | "streams">("catalog");

  // Catalog / Streams states
  const [tracks, setTracks] = useState<TrackStat[]>([]);
  const [albums, setAlbums] = useState<AlbumStat[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Daily History Editor states
  const [editingHistoryTrackId, setEditingHistoryTrackId] = useState<string | null>(null);
  const [historyEntries, setHistoryEntries] = useState<{ date: string; daily: number; total: number }[]>([]);
  const [historyBaseTotal, setHistoryBaseTotal] = useState<number>(0);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Active focus track state
  const [activeFocusTrackId, setActiveFocusTrackId] = useState<string>("we-cant-be-friends");

  // New Track form states
  const [addTrackId, setAddTrackId] = useState("");
  const [addTrackTitle, setAddTrackTitle] = useState("");
  const [addTrackArtist, setAddTrackArtist] = useState("Ariana Grande");
  const [addTrackTotalStreams, setAddTrackTotalStreams] = useState<number>(0);
  const [addTrackDailyGain, setAddTrackDailyGain] = useState<number>(0);
  const [addTrackMilestoneName, setAddTrackMilestoneName] = useState("");
  const [addTrackMilestoneTarget, setAddTrackMilestoneTarget] = useState<number>(100000000);
  const [addTrackAvgDailyGain, setAddTrackAvgDailyGain] = useState<number>(0);
  const [addTrackAlternativeIds, setAddTrackAlternativeIds] = useState("");
  const [addTrackCoverUrl, setAddTrackCoverUrl] = useState("/petal.jpg");
  const [addTrackSpotifyTrackId, setAddTrackSpotifyTrackId] = useState("");
  const [addTrackSpotifyAlbumId, setAddTrackSpotifyAlbumId] = useState("");

  // New Album form states
  const [addAlbumId, setAddAlbumId] = useState("");
  const [addAlbumTitle, setAddAlbumTitle] = useState("");
  const [addAlbumYear, setAddAlbumYear] = useState("2024");
  const [addAlbumTotalStreams, setAddAlbumTotalStreams] = useState<number>(0);
  const [addAlbumDailyGain, setAddAlbumDailyGain] = useState<number>(0);
  const [addAlbumCoverUrl, setAddAlbumCoverUrl] = useState("/petal.jpg");
  const [addAlbumSpotifyAlbumId, setAddAlbumSpotifyAlbumId] = useState("");
  const [addAlbumIsParticipation, setAddAlbumIsParticipation] = useState(false);

  // Track import states
  const [importTrackUrlOrId, setImportTrackUrlOrId] = useState("");
  const [importingTrack, setImportingTrack] = useState(false);

  // Track edit states
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [editTrackTitle, setEditTrackTitle] = useState("");
  const [editTrackArtist, setEditTrackArtist] = useState("");
  const [editTrackTotalStreams, setEditTrackTotalStreams] = useState<number>(0);
  const [editTrackDailyGain, setEditTrackDailyGain] = useState<number>(0);
  const [editTrackMilestoneName, setEditTrackMilestoneName] = useState("");
  const [editTrackMilestoneTarget, setEditTrackMilestoneTarget] = useState<number>(100000000);
  const [editTrackAvgDailyGain, setEditTrackAvgDailyGain] = useState<number>(0);
  const [editTrackAlternativeIds, setEditTrackAlternativeIds] = useState("");
  const [editTrackCoverUrl, setEditTrackCoverUrl] = useState("");
  const [editTrackSpotifyTrackId, setEditTrackSpotifyTrackId] = useState("");
  const [editTrackSpotifyAlbumId, setEditTrackSpotifyAlbumId] = useState("");

  // Album edit states
  const [editingAlbumId, setEditingAlbumId] = useState<string | null>(null);
  const [editAlbumTitle, setEditAlbumTitle] = useState("");
  const [editAlbumYear, setEditAlbumYear] = useState("");
  const [editAlbumTotalStreams, setEditAlbumTotalStreams] = useState<number>(0);
  const [editAlbumDailyGain, setEditAlbumDailyGain] = useState<number>(0);
  const [editAlbumCoverUrl, setEditAlbumCoverUrl] = useState("");
  const [editAlbumSpotifyAlbumId, setEditAlbumSpotifyAlbumId] = useState("");
  const [editAlbumIsParticipation, setEditAlbumIsParticipation] = useState(false);
  const [editAlbumType, setEditAlbumType] = useState("studio");

  // Play Simulation states
  const [simSelectedTrackId, setSimSelectedTrackId] = useState("");
  const [simPlayCount, setSimPlayCount] = useState(5);
  const [simUserDisplayName, setSimUserDisplayName] = useState("Simulated Fan");

  // Selection state for merging pending tracks
  const [selectedMergeTarget, setSelectedMergeTarget] = useState<Record<string, string>>({});

  // Import Album via Spotify states
  const [importAlbumUrlOrId, setImportAlbumUrlOrId] = useState("");
  const [importingAlbum, setImportingAlbum] = useState(false);

  const isAdminSessionValid = () => {
    if (typeof window === "undefined") return false;
    const token = sessionStorage.getItem("arianator_admin_token");
    const expiresAt = sessionStorage.getItem("arianator_admin_expires");
    if (!token || !expiresAt) return false;
    const expiry = new Date(expiresAt);
    if (Number.isNaN(expiry.getTime()) || expiry <= new Date()) {
      sessionStorage.removeItem("arianator_admin_authenticated");
      sessionStorage.removeItem("arianator_admin_token");
      sessionStorage.removeItem("arianator_admin_expires");
      return false;
    }
    return true;
  };

  // Verify authentication on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (isAdminSessionValid()) {
        setIsAuthenticated(true);
      }
    }
  }, []);

  const loadAdminConfig = useCallback(async () => {
    if (typeof window === "undefined") return;

    const storedActiveId = localStorage.getItem("arianator_active_focus_track_id");
    if (storedActiveId) setActiveFocusTrackId(storedActiveId);

    try {
      const catalog = await dbOperations.loadCatalog();
      if (catalog) {
        setTracks(catalog.tracks || []);
        setAlbums(catalog.albums || []);
      } else {
        setTracks([]);
        setAlbums([]);
      }
    } catch (error) {
      console.error("Failed to load Firestore catalog:", error);
      showStatus(
        language === "pt"
          ? "falha ao carregar o catálogo do Firestore"
          : "failed to load Firestore catalog"
      );
      setTracks([]);
      setAlbums([]);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadAdminConfig();
    }
  }, [isAuthenticated, loadAdminConfig]);

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(false);

    try {
      const response = await fetch("/api/admin-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: passcodeInput })
      });

      if (response.ok) {
        const data = await response.json();
        const expiresAt = new Date(Date.now() + data.expiresIn * 1000).toISOString();
        setIsAuthenticated(true);
        setPasscodeInput("");
        sessionStorage.setItem("arianator_admin_authenticated", "true");
        sessionStorage.setItem("arianator_admin_token", data.sessionToken);
        sessionStorage.setItem("arianator_admin_expires", expiresAt);
        loadAdminConfig();
      } else {
        setAuthError(true);
      }
    } catch (err) {
      console.error("Auth error:", err);
      setAuthError(true);
    }
  };

  const saveAdminConfig = async (updatedTracks: TrackStat[], updatedAlbums: AlbumStat[]) => {
    try {
      await dbOperations.saveCatalog(updatedTracks, updatedAlbums);
      window.dispatchEvent(new Event("storage_admin_update"));
      showStatus(language === "pt" ? "configurações salvas!" : "configuration saved successfully!");
    } catch (err) {
      console.error("Failed to save Firestore catalog:", err);
      showStatus(language === "pt" ? "falha ao salvar no Firestore" : "failed to save to Firestore");
    }
  };

  const handleTrackChange = (index: number, field: keyof TrackStat, value: any) => {
    const updated = [...tracks];
    const oldValue = updated[index][field];
    updated[index] = { ...updated[index], [field]: value };

    // If totalStreams was changed, add a stream history entry for today
    if (field === "totalStreams" && value !== oldValue) {
      const today = getTodayDateStr();
      updated[index].streams = addStreamHistoryEntry(
        updated[index].streams,
        today,
        Number(value) || 0,
        Number(oldValue) || 0
      );
    }

    setTracks(updated);
    saveAdminConfig(updated, albums);
  };

  const handleAlbumChange = (index: number, field: keyof AlbumStat, value: any) => {
    const updated = [...albums];
    const oldValue = updated[index][field];
    updated[index] = { ...updated[index], [field]: value };

    // If totalStreams was changed, add a stream history entry for today
    if (field === "totalStreams" && value !== oldValue) {
      const today = getTodayDateStr();
      updated[index].streams = addStreamHistoryEntry(
        updated[index].streams,
        today,
        Number(value) || 0,
        Number(oldValue) || 0
      );
    }

    setAlbums(updated);
    saveAdminConfig(tracks, updated);
  };

  const handleSelectActiveFocusTrack = (trackId: string) => {
    setActiveFocusTrackId(trackId);
    if (typeof window !== "undefined") {
      localStorage.setItem("arianator_active_focus_track_id", trackId);

      const track = tracks.find(t => t.id === trackId);
      if (track) {
        const urls = [
          ...(track.spotifyTrackId ? [`https://open.spotify.com/track/${track.spotifyTrackId}`] : []),
          ...(track.alternativeIds || []).map(id => `https://open.spotify.com/track/${id}`)
        ];
        localStorage.setItem("arianator_active_focus_track_versions", JSON.stringify(urls));
        window.dispatchEvent(new Event("storage_admin_update"));
      }
    }
  };

  const startEditTrack = (track: TrackStat) => {
    setEditingTrackId(track.id);
    setEditTrackTitle(track.title);
    setEditTrackArtist(track.artist);
    setEditTrackTotalStreams(track.totalStreams);
    setEditTrackDailyGain(track.dailyGain);
    setEditTrackMilestoneName(track.milestoneName);
    setEditTrackMilestoneTarget(track.milestoneTarget);
    setEditTrackAvgDailyGain(track.avgDailyGain);
    setEditTrackAlternativeIds(track.alternativeIds ? track.alternativeIds.join(", ") : "");
    setEditTrackCoverUrl(track.coverUrl);
    setEditTrackSpotifyTrackId(track.spotifyTrackId || "");
    setEditTrackSpotifyAlbumId(track.spotifyAlbumId || "");
  };

  const cancelEditTrack = () => {
    setEditingTrackId(null);
  };

  const handleSaveTrackEdit = (trackId: string) => {
    const updated = tracks.map(t => {
      if (t.id === trackId) {
        const nextTotalStreams = Number(editTrackTotalStreams) || 0;
        const previousTotalStreams = t.totalStreams || 0;
        return {
          ...t,
          title: editTrackTitle.trim(),
          artist: editTrackArtist.trim() || "Ariana Grande",
          totalStreams: nextTotalStreams,
          dailyGain: Number(editTrackDailyGain) || 0,
          milestoneName: editTrackMilestoneName.trim() || "100 Million Streams",
          milestoneTarget: Number(editTrackMilestoneTarget) || 100000000,
          avgDailyGain: Number(editTrackAvgDailyGain) || 0,
          alternativeIds: editTrackAlternativeIds ? editTrackAlternativeIds.split(",").map(s => s.trim()).filter(Boolean) : [],
          coverUrl: editTrackCoverUrl.trim() || "/petal.jpg",
          spotifyTrackId: editTrackSpotifyTrackId.trim() || undefined,
          spotifyAlbumId: editTrackSpotifyAlbumId.trim() || undefined,
          streams: nextTotalStreams !== previousTotalStreams
            ? addStreamHistoryEntry(t.streams, getTodayDateStr(), nextTotalStreams, previousTotalStreams)
            : t.streams,
        };
      }
      return t;
    });

    setTracks(updated);

    if (trackId === activeFocusTrackId) {
      const track = updated.find(t => t.id === trackId);
      if (track) {
        const urls = [
          ...(track.spotifyTrackId ? [`https://open.spotify.com/track/${track.spotifyTrackId}`] : []),
          ...(track.alternativeIds || []).map(id => `https://open.spotify.com/track/${id}`)
        ];
        localStorage.setItem("arianator_active_focus_track_versions", JSON.stringify(urls));
      }
    }

    saveAdminConfig(updated, albums);
    setEditingTrackId(null);
  };

  const startEditAlbum = (album: AlbumStat & { spotifyAlbumId?: string }) => {
    setEditingAlbumId(album.id);
    setEditAlbumTitle(album.title);
    setEditAlbumYear(album.year);
    setEditAlbumTotalStreams(album.totalStreams);
    setEditAlbumDailyGain(album.dailyGain);
    setEditAlbumCoverUrl(album.coverUrl);
    setEditAlbumSpotifyAlbumId(album.spotifyAlbumId || "");
    setEditAlbumType(album.type || (album.isParticipation ? "compilation" : "studio"));
  };

  const cancelEditAlbum = () => {
    setEditingAlbumId(null);
  };

  const handleSaveAlbumEdit = (albumId: string) => {
    const updated = albums.map(a => {
      if (a.id === albumId) {
        const nextTotalStreams = Number(editAlbumTotalStreams) || 0;
        const previousTotalStreams = a.totalStreams || 0;
        return {
          ...a,
          title: editAlbumTitle.trim(),
          year: editAlbumYear.trim() || "2024",
          totalStreams: nextTotalStreams,
          dailyGain: Number(editAlbumDailyGain) || 0,
          coverUrl: editAlbumCoverUrl.trim() || "/petal.jpg",
          spotifyAlbumId: editAlbumSpotifyAlbumId.trim() || undefined,
          type: editAlbumType,
          streams: nextTotalStreams !== previousTotalStreams
            ? addStreamHistoryEntry(a.streams, getTodayDateStr(), nextTotalStreams, previousTotalStreams)
            : a.streams,
        };
      }
      return a;
    });

    setAlbums(updated);
    saveAdminConfig(tracks, updated);
    setEditingAlbumId(null);
  };

  const handleAddTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addTrackId || !addTrackTitle) {
      showStatus(language === "pt" ? "ID e Título são obrigatórios!" : "ID and Title are required!");
      return;
    }
    const newTrack: TrackStat = {
      id: addTrackId.trim(),
      title: addTrackTitle.trim(),
      artist: addTrackArtist.trim() || "Ariana Grande",
      totalStreams: Number(addTrackTotalStreams) || 0,
      dailyGain: Number(addTrackDailyGain) || 0,
      gainDiff: 0,
      coverUrl: addTrackCoverUrl.trim() || "/petal.jpg",
      milestoneName: addTrackMilestoneName.trim() || "100 Million Streams",
      milestoneTarget: Number(addTrackMilestoneTarget) || 100000000,
      avgDailyGain: Number(addTrackAvgDailyGain) || 0,
      alternativeIds: addTrackAlternativeIds ? addTrackAlternativeIds.split(",").map(s => s.trim()).filter(Boolean) : [],
      spotifyTrackId: addTrackSpotifyTrackId.trim() || undefined,
      spotifyAlbumId: addTrackSpotifyAlbumId.trim() || undefined,
      streams: addStreamHistoryEntry(
        undefined,
        getTodayDateStr(),
        Number(addTrackTotalStreams) || 0,
        0
      ),
    };

    const updated = [...tracks, newTrack];
    setTracks(updated);
    saveAdminConfig(updated, albums);

    // Reset Form
    setAddTrackId("");
    setAddTrackTitle("");
    setAddTrackArtist("Ariana Grande");
    setAddTrackTotalStreams(0);
    setAddTrackDailyGain(0);
    setAddTrackMilestoneName("");
    setAddTrackMilestoneTarget(100000000);
    setAddTrackAvgDailyGain(0);
    setAddTrackAlternativeIds("");
    setAddTrackCoverUrl("/petal.jpg");
    setAddTrackSpotifyTrackId("");
    setAddTrackSpotifyAlbumId("");

    showStatus(language === "pt" ? "música adicionada com sucesso!" : "track added successfully!");
  };

  const handleRemoveTrack = (trackId: string) => {
    if (confirm(language === "pt" ? `tem certeza que deseja remover a faixa ${trackId}?` : `are you sure you want to remove track ${trackId}?`)) {
      const updated = tracks.filter(t => t.id !== trackId);
      setTracks(updated);
      saveAdminConfig(updated, albums);
      showStatus(language === "pt" ? "música removida!" : "track removed!");
    }
  };

  const handleUnlinkTrackAlbum = (trackId: string) => {
    if (confirm(language === "pt" ? "tem certeza que deseja desvincular esta música do álbum?" : "are you sure you want to unlink this track from its album?")) {
      const updated = tracks.map(t => {
        if (t.id === trackId) {
          const { spotifyAlbumId, ...rest } = t;
          return rest;
        }
        return t;
      });
      setTracks(updated);
      saveAdminConfig(updated, albums);
      showStatus(language === "pt" ? "música desvinculada do álbum!" : "track unlinked from album!");
    }
  };

  const handleAddAlbum = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addAlbumId || !addAlbumTitle) {
      showStatus(language === "pt" ? "ID e Título são obrigatórios!" : "ID and Title are required!");
      return;
    }
    const newAlbum: AlbumStat = {
      id: addAlbumId.trim(),
      title: addAlbumTitle.trim(),
      year: addAlbumYear.trim() || "2024",
      totalStreams: Number(addAlbumTotalStreams) || 0,
      dailyGain: Number(addAlbumDailyGain) || 0,
      coverUrl: addAlbumCoverUrl.trim() || "/petal.jpg",
      spotifyAlbumId: addAlbumSpotifyAlbumId.trim() || undefined,
      streams: addStreamHistoryEntry(
        undefined,
        getTodayDateStr(),
        Number(addAlbumTotalStreams) || 0,
        0
      ),
    };

    const updated = [...albums, newAlbum];
    setAlbums(updated);
    saveAdminConfig(tracks, updated);

    // Reset Form
    setAddAlbumId("");
    setAddAlbumTitle("");
    setAddAlbumYear("2024");
    setAddAlbumTotalStreams(0);
    setAddAlbumDailyGain(0);
    setAddAlbumCoverUrl("/petal.jpg");
    setAddAlbumSpotifyAlbumId("");

    showStatus(language === "pt" ? "álbum adicionado com sucesso!" : "album added successfully!");
  };

  const handleRemoveAlbum = (albumId: string) => {
    const album = albums.find(a => a.id === albumId);
    const albumSpotifyId = album?.spotifyAlbumId;
    if (confirm(language === "pt" ? `tem certeza? isso também removerá todas as músicas deste álbum.` : `are you sure? this will also remove all tracks belonging to this album.`)) {
      const updatedAlbums = albums.filter(a => a.id !== albumId);
      // Also remove all tracks that belong to this album
      const updatedTracks = tracks.filter(t => {
        if (albumSpotifyId && t.spotifyAlbumId === albumSpotifyId) return false;
        return true;
      });
      setAlbums(updatedAlbums);
      setTracks(updatedTracks);
      saveAdminConfig(updatedTracks, updatedAlbums);
      showStatus(language === "pt" ? "álbum e músicas removidos!" : "album and its tracks removed!");
    }
  };

  const handleImportAlbum = async () => {
    if (!importAlbumUrlOrId) {
      showStatus(language === "pt" ? "Insira um link ou ID de álbum!" : "Please enter an album link or ID!");
      return;
    }
    setImportingAlbum(true);
    showStatus(language === "pt" ? "Importando do Spotify..." : "Importing from Spotify...");
    try {
      const res = await fetch("/api/import-album", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ albumUrlOrId: importAlbumUrlOrId }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to import album");
      }
      const data = await res.json();
      if (data.success) {
        const { album: newAlbum, tracks: newTracks } = data;

        // 1. Merge album into current albums catalog
        const albumIndex = albums.findIndex(a => a.spotifyAlbumId === newAlbum.spotifyAlbumId || a.id === newAlbum.id);
        let updatedAlbums = [...albums];
        const today = getTodayDateStr();

        if (albumIndex !== -1) {
          const existingAlbum = updatedAlbums[albumIndex];
          const newTotalStreams = newAlbum.totalStreams || existingAlbum.totalStreams;
          
          const mergedStreams = (newTotalStreams !== existingAlbum.totalStreams || !existingAlbum.streams)
            ? addStreamHistoryEntry(existingAlbum.streams, today, newTotalStreams, existingAlbum.totalStreams)
            : existingAlbum.streams;

          const newDailyGain = (newTotalStreams !== existingAlbum.totalStreams)
            ? (mergedStreams[today]?.daily || existingAlbum.dailyGain || 0)
            : (existingAlbum.dailyGain || 0);

          updatedAlbums[albumIndex] = {
            ...existingAlbum,
            title: newAlbum.title || existingAlbum.title,
            year: newAlbum.year || existingAlbum.year,
            coverUrl: newAlbum.coverUrl || existingAlbum.coverUrl,
            spotifyAlbumId: newAlbum.spotifyAlbumId || existingAlbum.spotifyAlbumId,
            isParticipation: newAlbum.isParticipation !== undefined ? newAlbum.isParticipation : existingAlbum.isParticipation,
            totalStreams: newTotalStreams,
            dailyGain: newDailyGain,
            streams: mergedStreams
          };
        } else {
          const isOther = (
            newAlbum.title.toLowerCase().includes("a cappella") ||
            newAlbum.title.toLowerCase().includes("instrumental") ||
            newAlbum.title.toLowerCase().includes("remix") ||
            newAlbum.title.toLowerCase().includes("live") ||
            newAlbum.title.toLowerCase().includes("sped up") ||
            newAlbum.title.toLowerCase().includes("slowed") ||
            newAlbum.title.toLowerCase().includes("acapella")
          );
          const autoType = isOther ? "other" : (newAlbum.isParticipation ? "compilation" : "studio");
          updatedAlbums.push({
            ...newAlbum,
            type: autoType
          });
        }

        // 2. Merge tracks into current tracks catalog
        let updatedTracks = [...tracks];
        newTracks.forEach((newTrack: any) => {
          const trackIndex = updatedTracks.findIndex(t => t.spotifyTrackId === newTrack.spotifyTrackId || t.id === newTrack.id);
          if (trackIndex !== -1) {
            const existingTrack = updatedTracks[trackIndex];
            const newTotalStreams = newTrack.totalStreams || existingTrack.totalStreams;
            
            const incomingIds = [newTrack.spotifyTrackId, ...(newTrack.alternativeIds || [])].filter(Boolean);
            const currentIds = [existingTrack.spotifyTrackId, ...(existingTrack.alternativeIds || [])].filter(Boolean);
            const primarySpotifyTrackId = existingTrack.spotifyTrackId || newTrack.spotifyTrackId;
            const allUniqueIds = Array.from(new Set([...currentIds, ...incomingIds]));
            const mergedAlternativeIds = allUniqueIds.filter(id => id !== primarySpotifyTrackId);

            const mergedStreams = (newTotalStreams !== existingTrack.totalStreams || !existingTrack.streams)
              ? addStreamHistoryEntry(existingTrack.streams, today, newTotalStreams, existingTrack.totalStreams)
              : existingTrack.streams;

            const newDailyGain = (newTotalStreams !== existingTrack.totalStreams)
              ? (mergedStreams[today]?.daily || existingTrack.dailyGain || 0)
              : (existingTrack.dailyGain || 0);

            const newGainDiff = (newTotalStreams !== existingTrack.totalStreams)
              ? (newDailyGain - (existingTrack.dailyGain || 0))
              : (existingTrack.gainDiff || 0);

            updatedTracks[trackIndex] = {
              ...existingTrack,
              title: newTrack.title || existingTrack.title,
              artist: newTrack.artist || existingTrack.artist,
              coverUrl: newTrack.coverUrl || existingTrack.coverUrl,
              milestoneName: newTrack.milestoneName || existingTrack.milestoneName,
              milestoneTarget: newTrack.milestoneTarget || existingTrack.milestoneTarget,
              spotifyTrackId: primarySpotifyTrackId,
              spotifyAlbumId: existingTrack.spotifyAlbumId || newTrack.spotifyAlbumId,
              totalStreams: newTotalStreams,
              dailyGain: newDailyGain,
              gainDiff: newGainDiff,
              avgDailyGain: existingTrack.avgDailyGain || 0,
              alternativeIds: mergedAlternativeIds,
              streams: mergedStreams
            };
          } else {
            updatedTracks.push(newTrack);
          }
        });

        setAlbums(updatedAlbums);
        setTracks(updatedTracks);
        saveAdminConfig(updatedTracks, updatedAlbums);
        setImportAlbumUrlOrId("");

        showStatus(
          language === "pt"
            ? `Álbum "${newAlbum.title}" e ${newTracks.length} faixas importados/atualizados com sucesso!`
            : `Album "${newAlbum.title}" and ${newTracks.length} tracks imported/updated successfully!`
        );
      } else {
        throw new Error(data.error || "Unknown error");
      }
    } catch (err: any) {
      console.error(err);
      showStatus(language === "pt" ? `Erro ao importar: ${err.message}` : `Import error: ${err.message}`);
    } finally {
      setImportingAlbum(false);
    }
  };

  const handleImportTrack = async () => {
    if (!importTrackUrlOrId) {
      showStatus(language === "pt" ? "Insira um link ou ID de música!" : "Please enter a track link or ID!");
      return;
    }
    setImportingTrack(true);
    showStatus(language === "pt" ? "Importando música do Spotify..." : "Importing track from Spotify...");
    try {
      const res = await fetch("/api/import-track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackUrlOrId: importTrackUrlOrId }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to import track");
      }
      const data = await res.json();
      if (data.success) {
        const { track: newTrack } = data;

        // Merge track into current tracks catalog
        let updatedTracks = [...tracks];
        const trackIndex = updatedTracks.findIndex(t => t.spotifyTrackId === newTrack.spotifyTrackId || t.id === newTrack.id);
        const today = getTodayDateStr();

        if (trackIndex !== -1) {
          const existingTrack = updatedTracks[trackIndex];
          const newTotalStreams = newTrack.totalStreams || existingTrack.totalStreams;

          const incomingIds = [newTrack.spotifyTrackId, ...(newTrack.alternativeIds || [])].filter(Boolean);
          const currentIds = [existingTrack.spotifyTrackId, ...(existingTrack.alternativeIds || [])].filter(Boolean);
          const primarySpotifyTrackId = existingTrack.spotifyTrackId || newTrack.spotifyTrackId;
          const allUniqueIds = Array.from(new Set([...currentIds, ...incomingIds]));
          const mergedAlternativeIds = allUniqueIds.filter(id => id !== primarySpotifyTrackId);

          const mergedStreams = (newTotalStreams !== existingTrack.totalStreams || !existingTrack.streams)
            ? addStreamHistoryEntry(existingTrack.streams, today, newTotalStreams, existingTrack.totalStreams)
            : existingTrack.streams;

          const newDailyGain = (newTotalStreams !== existingTrack.totalStreams)
            ? (mergedStreams[today]?.daily || existingTrack.dailyGain || 0)
            : (existingTrack.dailyGain || 0);

          const newGainDiff = (newTotalStreams !== existingTrack.totalStreams)
            ? (newDailyGain - (existingTrack.dailyGain || 0))
            : (existingTrack.gainDiff || 0);

          updatedTracks[trackIndex] = {
            ...existingTrack,
            title: newTrack.title || existingTrack.title,
            artist: newTrack.artist || existingTrack.artist,
            coverUrl: newTrack.coverUrl || existingTrack.coverUrl,
            milestoneName: newTrack.milestoneName || existingTrack.milestoneName,
            milestoneTarget: newTrack.milestoneTarget || existingTrack.milestoneTarget,
            spotifyTrackId: primarySpotifyTrackId,
            spotifyAlbumId: existingTrack.spotifyAlbumId || newTrack.spotifyAlbumId,
            totalStreams: newTotalStreams,
            dailyGain: newDailyGain,
            gainDiff: newGainDiff,
            avgDailyGain: existingTrack.avgDailyGain || 0,
            alternativeIds: mergedAlternativeIds,
            streams: mergedStreams
          };
        } else {
          updatedTracks.push(newTrack);
        }

        setTracks(updatedTracks);
        saveAdminConfig(updatedTracks, albums);
        setImportTrackUrlOrId("");

        showStatus(
          language === "pt"
            ? `Música "${newTrack.title}" importada/atualizada com sucesso!`
            : `Track "${newTrack.title}" imported/updated successfully!`
        );
      } else {
        throw new Error(data.error || "Unknown error");
      }
    } catch (err: any) {
      console.error(err);
      showStatus(language === "pt" ? `Erro ao importar: ${err.message}` : `Import error: ${err.message}`);
    } finally {
      setImportingTrack(false);
    }
  };

  const [updatingPlays, setUpdatingPlays] = useState(false);
  const handleUpdatePlaysFromSpotify = async () => {
    setUpdatingPlays(true);
    showStatus(language === "pt" ? "Conectando ao Spotify e atualizando plays..." : "Connecting to Spotify and updating play counts...");
    try {
      const token = sessionStorage.getItem("arianator_admin_token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/update-plays", {
        method: "POST",
        headers
      });
      if (!res.ok) throw new Error("Failed to update plays");
      const data = await res.json();
      if (data.success) {
        await loadAdminConfig();
        showStatus(language === "pt" ? "Plays atualizados e salvos com sucesso!" : "Plays updated and saved successfully!");
      } else {
        throw new Error(data.error || "Unknown error");
      }
    } catch (err: any) {
      console.error(err);
      showStatus(language === "pt" ? `Erro ao atualizar: ${err.message}` : `Update error: ${err.message}`);
    } finally {
      setUpdatingPlays(false);
    }
  };

  const triggerDailySimulation = () => {
    const updatedTracks = tracks.map(t => {
      const variation = Math.floor((Math.random() - 0.5) * 50000);
      const newDailyGain = Math.max(10000, t.dailyGain + variation);
      const nextTotalStreams = t.totalStreams + t.dailyGain;
      return {
        ...t,
        totalStreams: nextTotalStreams,
        gainDiff: variation,
        dailyGain: newDailyGain,
        streams: addStreamHistoryEntry(t.streams, getTodayDateStr(), nextTotalStreams, t.totalStreams)
      };
    });

    const updatedAlbums = albums.map(a => {
      const variation = Math.floor((Math.random() - 0.5) * 150000);
      const nextTotalStreams = a.totalStreams + a.dailyGain;
      return {
        ...a,
        totalStreams: nextTotalStreams,
        dailyGain: Math.max(50000, a.dailyGain + variation),
        streams: addStreamHistoryEntry(a.streams, getTodayDateStr(), nextTotalStreams, a.totalStreams)
      };
    });

    setTracks(updatedTracks);
    setAlbums(updatedAlbums);
    saveAdminConfig(updatedTracks, updatedAlbums);
    showStatus(language === "pt" ? "atualização diária simulada com sucesso!" : "daily streaming update simulated!");
  };

  // Daily History Editor helper functions
  const handleStartEditHistory = async (trackId: string) => {
    setLoadingHistory(true);
    setEditingHistoryTrackId(trackId);
    try {
      const res = await fetch(`/api/catalog/detail?type=track&id=${trackId}`);
      if (!res.ok) throw new Error("Failed to fetch track details");
      const result = await res.json();
      if (result.success && result.data) {
        const trackDetail = result.data;
        const streamsMap = trackDetail.streams || {};
        const sortedDates = Object.keys(streamsMap).sort();
        const entries = sortedDates.map(date => ({
          date,
          daily: Number(streamsMap[date].daily) || 0,
          total: Number(streamsMap[date].total) || 0
        }));
        
        setHistoryEntries(entries);
        const firstEntry = entries[0];
        const initialBaseTotal = firstEntry ? (firstEntry.total - firstEntry.daily) : (trackDetail.totalStreams || 0);
        setHistoryBaseTotal(initialBaseTotal);
      } else {
        throw new Error(result.error || "Failed to fetch data");
      }
    } catch (err: any) {
      console.error(err);
      showStatus(language === "pt" ? `Erro ao carregar histórico: ${err.message}` : `Error loading history: ${err.message}`);
      setEditingHistoryTrackId(null);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleHistoryEntryChange = (index: number, value: number) => {
    const updated = [...historyEntries];
    updated[index].daily = value;
    
    let currentTotal = historyBaseTotal;
    const recalculated = updated.map(entry => {
      currentTotal += entry.daily;
      return {
        ...entry,
        total: currentTotal
      };
    });
    setHistoryEntries(recalculated);
  };

  const handleBaseTotalChange = (value: number) => {
    setHistoryBaseTotal(value);
    
    let currentTotal = value;
    const recalculated = historyEntries.map(entry => {
      currentTotal += entry.daily;
      return {
        ...entry,
        total: currentTotal
      };
    });
    setHistoryEntries(recalculated);
  };

  const handleAddHistoryEntry = (date: string, daily: number) => {
    if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      showStatus(language === "pt" ? "Formato de data inválido! Use YYYY-MM-DD" : "Invalid date format! Use YYYY-MM-DD");
      return;
    }
    if (historyEntries.some(e => e.date === date)) {
      showStatus(language === "pt" ? "Esta data já existe!" : "This date already exists!");
      return;
    }
    const newEntry = { date, daily, total: 0 };
    const updated = [...historyEntries, newEntry].sort((a, b) => a.date.localeCompare(b.date));
    
    let currentTotal = historyBaseTotal;
    const recalculated = updated.map(entry => {
      currentTotal += entry.daily;
      return {
        ...entry,
        total: currentTotal
      };
    });
    setHistoryEntries(recalculated);
  };

  const handleRemoveHistoryEntry = (index: number) => {
    const updated = historyEntries.filter((_, i) => i !== index);
    
    let currentTotal = historyBaseTotal;
    const recalculated = updated.map(entry => {
      currentTotal += entry.daily;
      return {
        ...entry,
        total: currentTotal
      };
    });
    setHistoryEntries(recalculated);
  };

  const handleSaveHistory = async () => {
    if (!editingHistoryTrackId) return;
    
    const track = tracks.find(t => t.id === editingHistoryTrackId);
    if (!track) return;

    const newStreams: Record<string, { total: number; daily: number }> = {};
    historyEntries.forEach(entry => {
      newStreams[entry.date] = {
        total: entry.total,
        daily: entry.daily
      };
    });

    const finalTotalStreams = historyEntries.length > 0 ? historyEntries[historyEntries.length - 1].total : historyBaseTotal;
    const finalDailyGain = historyEntries.length > 0 ? historyEntries[historyEntries.length - 1].daily : 0;

    const milestone = getMilestoneForStreams(finalTotalStreams);
    const forecast = calculateForecast(
      newStreams,
      finalTotalStreams,
      track.milestoneTarget || milestone.milestoneTarget,
      finalDailyGain || track.avgDailyGain || 0
    );

    const updatedTracks = tracks.map(t => {
      if (t.id === editingHistoryTrackId) {
        return {
          ...t,
          totalStreams: finalTotalStreams,
          dailyGain: finalDailyGain,
          daysToGoal: forecast.daysToGoal,
          dailyPace: forecast.dailyVelocity,
          streams: newStreams,
          overwriteStreams: true
        } as any;
      }
      return t;
    });

    setTracks(updatedTracks);
    setEditingHistoryTrackId(null);
    setHistoryEntries([]);
    
    await saveAdminConfig(updatedTracks, albums);
  };

  // Render Passcode Form if not authenticated
  if (!isAuthenticated) {
    return (
      <div id="admin-auth" className="max-w-md mx-auto neobrutal-card p-8 text-center animate-fade-in text-floral-fg">
        <div className="p-3 bg-red-950/20 border-2 border-foreground text-red-500 rounded-none mb-5 mx-auto w-fit shadow-[2px_2px_0px_0px_var(--foreground)]">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="font-serif text-2xl text-rose mb-3 uppercase tracking-wider">
          {language === "pt" ? "acesso administrativo" : "admin access"}
        </h3>
        <p className="text-sm text-neutral-405 mb-6 leading-relaxed">
          {language === "pt"
            ? "esta seção é restrita aos administradores para validar novas faixas e organizar as contagens oficiais."
            : "this section is restricted to administrators to validate new tracks and manage offical counts."}
        </p>

        <form onSubmit={handleAuthSubmit} className="space-y-4 font-mono">
          <input
            type="password"
            value={passcodeInput}
            onChange={(e) => setPasscodeInput(e.target.value)}
            placeholder={language === "pt" ? "digite a senha de acesso" : "enter passcode"}
            className="w-full bg-neutral-950 border-2 border-foreground rounded-none px-4 py-3 text-center text-white focus:border-white focus:outline-none placeholder-neutral-700 text-sm"
          />
          {authError && (
            <span className="text-xs text-red-500 font-bold block">
              {language === "pt" ? "senha inválida. tente novamente." : "invalid passcode. try again."}
            </span>
          )}
          <button
            type="submit"
            className="w-full py-3 neobrutal-btn text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            {language === "pt" ? "desbloquear" : "authenticate"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <section className="neobrutal-card p-6 lg:p-10 text-floral-fg animate-fade-in" id="admin">
      {/* Header Block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b-2 border-foreground pb-6 mb-8 gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-neutral-900 border-2 border-foreground text-white rounded-none shadow-[2px_2px_0px_0px_var(--foreground)]">
            <Settings className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-wider uppercase text-white">
              {language === "pt" ? "painel administrativo" : "admin console"}
            </h2>
            <p className="text-sm text-neutral-450 mt-1.5 font-mono">
              {language === "pt" ? "organize a contagem global, valide alternativas e simule reproduções" : "configure song versions, stream gains, and validate new IDs"}
            </p>
          </div>
        </div>

        {/* Global Save Button */}
        <button
          onClick={() => saveAdminConfig(tracks, albums)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 neobrutal-btn text-xs uppercase tracking-wider transition-colors cursor-pointer"
        >
          <Save className="w-4 h-4" /> {language === "pt" ? "salvar alterações" : "save changes"}
        </button>
      </div>

      {statusMessage && (
        <div className="mb-6 p-4 bg-wine-deep border-2 border-foreground text-white text-sm rounded-none flex items-center gap-2 animate-slide-up font-mono shadow-[2px_2px_0px_0px_var(--foreground)]">
          <AlertCircle className="w-4 h-4 text-rose" /> {statusMessage}
        </div>
      )}

      {/* ADMIN SUB-TABS */}
      <div className={`flex flex-wrap gap-2 p-1.5 border-2 border-foreground mb-8 font-mono ${lt ? "bg-neutral-100" : "bg-neutral-950"}`}>
        <button
          onClick={() => setAdminTab("catalog")}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-2 transition-all duration-200 cursor-pointer ${adminTab === "catalog"
            ? "bg-foreground text-background border-foreground shadow-[2px_2px_0px_0px_var(--foreground)]"
            : `border-transparent ${lt ? "text-neutral-600 hover:text-black hover:border-foreground" : "text-neutral-450 hover:text-white hover:border-foreground"}`
            }`}
        >
          {language === "pt" ? "foco & alternativas" : "track catalog"}
        </button>
        <button
          onClick={() => setAdminTab("streams")}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-2 transition-all duration-200 cursor-pointer ${adminTab === "streams"
            ? "bg-foreground text-background border-foreground shadow-[2px_2px_0px_0px_var(--foreground)]"
            : `border-transparent ${lt ? "text-neutral-600 hover:text-black hover:border-foreground" : "text-neutral-450 hover:text-white hover:border-foreground"}`
            }`}
        >
          {language === "pt" ? "tabela de reproduções" : "album & track counts"}
        </button>
      </div>

      {/* TAB 1: CATALOG MANAGEMENT */}
      {adminTab === "catalog" && (
        <div className="space-y-8 font-mono text-xs text-floral-fg">
          <div className="bg-wine-dark/40 border border-panel-border p-6 rounded space-y-4 font-serif">
            <h3 className="text-base font-bold text-white uppercase tracking-wider font-mono">
              {language === "pt" ? "configurar catálogo principal" : "configure focus track catalog"}
            </h3>
            <p className="text-sm text-neutral-455 leading-relaxed">
              {language === "pt"
                ? "defina as faixas de música, álbuns e seus IDs do spotify. você pode adicionar, editar e apagar tudo."
                : "define tracks, albums, and their spotify IDs. you can add, edit, and delete everything."}
            </p>
          </div>

          {/* IMPORT ALBUM VIA SPOTIFY */}
          <div className="bg-wine-deep p-6 border border-panel-border rounded space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              🚀 {language === "pt" ? "importar álbum via spotify" : "import album via spotify"}
            </h4>
            <p className="text-neutral-400 text-xs font-serif leading-relaxed">
              {language === "pt"
                ? "cole o link ou ID do álbum do spotify. o sistema irá buscar a capa, título, ano e todas as faixas que participam a ariana grande com contagens de streams atualizadas."
                : "paste a spotify album link or ID. the system will fetch the cover, title, release year, and automatically import/update all tracks featuring/by ariana grande with real-time stream counts."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={importAlbumUrlOrId}
                onChange={(e) => setImportAlbumUrlOrId(e.target.value)}
                placeholder={language === "pt" ? "cole o link do álbum (ex: https://open.spotify.com/album/...)" : "paste spotify album link (e.g. https://open.spotify.com/album/...)"}
                className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-white text-xs focus:outline-none"
              />
              <button
                onClick={handleImportAlbum}
                disabled={importingAlbum}
                className="px-5 py-2 bg-rose hover:bg-rose-dark text-floral-bg font-extrabold uppercase tracking-wider rounded transition-colors cursor-pointer border border-rose disabled:opacity-50 text-xs flex items-center justify-center gap-1.5"
              >
                {importingAlbum ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    {language === "pt" ? "importando..." : "importing..."}
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    {language === "pt" ? "importar" : "import"}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* SECTION A: ACTIVE FOCUS TRACK SETTING */}
          <div className="bg-wine-deep p-6 border border-panel-border rounded space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              🎯 {language === "pt" ? "faixa foco ativa (termômetro)" : "active focus track (thermometer)"}
            </h4>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <select
                value={activeFocusTrackId}
                onChange={(e) => handleSelectActiveFocusTrack(e.target.value)}
                className="bg-neutral-900 border border-neutral-800 rounded p-2.5 text-xs text-white focus:outline-none w-full sm:w-80 cursor-pointer"
              >
                {tracks.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
              <p className="text-neutral-400 text-xs font-serif leading-relaxed">
                {language === "pt"
                  ? "a faixa selecionada acima terá suas versões e IDs sincronizados automaticamente no termômetro diário dos fãs."
                  : "the track selected above will have its versions and IDs automatically synced in the daily fan thermometer."}
              </p>
            </div>
          </div>

          {/* SECTION B: TRACKS LIST */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-panel-border pb-2">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                🎵 {language === "pt" ? "faixas catalogadas" : "catalog tracks"}
              </h4>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {tracks.map((track) => (
                <div key={track.id} className="p-5 bg-wine-deep border border-panel-border rounded space-y-4">
                  {editingTrackId === track.id ? (
                    /* EDITING TRACK FORM */
                    <div className="space-y-4 animate-fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-neutral-450 uppercase mb-1 font-bold">title</label>
                          <input
                            type="text"
                            value={editTrackTitle}
                            onChange={(e) => setEditTrackTitle(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-850 rounded px-2 py-1 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-neutral-450 uppercase mb-1 font-bold">artist</label>
                          <input
                            type="text"
                            value={editTrackArtist}
                            onChange={(e) => setEditTrackArtist(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-850 rounded px-2 py-1 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-neutral-450 uppercase mb-1 font-bold">cover url</label>
                          <input
                            type="text"
                            value={editTrackCoverUrl}
                            onChange={(e) => setEditTrackCoverUrl(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-850 rounded px-2 py-1 text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-neutral-450 uppercase mb-1 font-bold">spotify track id</label>
                          <input
                            type="text"
                            value={editTrackSpotifyTrackId}
                            onChange={(e) => setEditTrackSpotifyTrackId(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-850 rounded px-2 py-1 text-white"
                            placeholder="e.g. 20jbSiX29FDX4oQxBXyUEi"
                          />
                        </div>
                        <div>
                          <label className="block text-neutral-450 uppercase mb-1 font-bold">spotify album id</label>
                          <input
                            type="text"
                            value={editTrackSpotifyAlbumId}
                            onChange={(e) => setEditTrackSpotifyAlbumId(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-850 rounded px-2 py-1 text-white"
                            placeholder="e.g. 1x159B5VzbDWAGBik5cr1z"
                          />
                        </div>
                        <div>
                          <label className="block text-neutral-450 uppercase mb-1 font-bold">alternative track ids (comma-separated)</label>
                          <input
                            type="text"
                            value={editTrackAlternativeIds}
                            onChange={(e) => setEditTrackAlternativeIds(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-850 rounded px-2 py-1 text-white"
                            placeholder="e.g. ID1, ID2, ID3"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-neutral-450 uppercase mb-1 font-bold">milestone name</label>
                          <input
                            type="text"
                            value={editTrackMilestoneName}
                            onChange={(e) => setEditTrackMilestoneName(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-850 rounded px-2 py-1 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-neutral-450 uppercase mb-1 font-bold">milestone target</label>
                          <input
                            type="number"
                            value={editTrackMilestoneTarget}
                            onChange={(e) => setEditTrackMilestoneTarget(Number(e.target.value) || 0)}
                            className="w-full bg-neutral-900 border border-neutral-850 rounded px-2 py-1 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-neutral-450 uppercase mb-1 font-bold">avg daily gain</label>
                          <input
                            type="number"
                            value={editTrackAvgDailyGain}
                            onChange={(e) => setEditTrackAvgDailyGain(Number(e.target.value) || 0)}
                            className="w-full bg-neutral-900 border border-neutral-850 rounded px-2 py-1 text-white"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end pt-2">
                        <button
                          onClick={() => handleSaveTrackEdit(track.id)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer font-bold uppercase tracking-wider"
                        >
                          {language === "pt" ? "salvar" : "save"}
                        </button>
                        <button
                          onClick={cancelEditTrack}
                          className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded cursor-pointer font-bold uppercase tracking-wider"
                        >
                          {language === "pt" ? "cancelar" : "cancel"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* VIEW TRACK VIEW */
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in">
                      <div className="flex items-center gap-4">
                        <img src={track.coverUrl} className="w-12 h-12 rounded object-cover border border-panel-border" alt="" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{track.title}</span>
                            {track.id === activeFocusTrackId && (
                              <span className="bg-rose/25 text-rose border border-rose/40 text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wider">
                                {language === "pt" ? "faixa foco ativa" : "active focus"}
                              </span>
                            )}
                          </div>
                          <span className="text-neutral-400 block mt-0.5">{track.artist} (id: {track.id})</span>
                          <div className="text-[10px] text-neutral-500 mt-1 space-y-0.5">
                            <span className="block">Spotify Track ID: <strong className="text-neutral-400 font-mono">{track.spotifyTrackId || "none"}</strong></span>
                            <span className="block">Spotify Album ID: <strong className="text-neutral-400 font-mono">{track.spotifyAlbumId || "none"}</strong></span>
                            <span className="block">
                              Alternative IDs: <strong className="text-neutral-400 font-mono">{track.alternativeIds && track.alternativeIds.length > 0 ? track.alternativeIds.join(", ") : "none"}</strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
                        {track.id !== activeFocusTrackId && (
                          <button
                            onClick={() => handleSelectActiveFocusTrack(track.id)}
                            className="flex-1 md:flex-none px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-800 rounded cursor-pointer font-bold uppercase tracking-wider text-[10px]"
                          >
                            {language === "pt" ? "definir ativa" : "make active"}
                          </button>
                        )}
                        {track.spotifyAlbumId && (
                          <button
                            onClick={() => handleUnlinkTrackAlbum(track.id)}
                            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-950/40 hover:bg-amber-950/80 text-amber-200 border border-amber-900 rounded cursor-pointer font-bold uppercase tracking-wider text-[10px]"
                          >
                            {language === "pt" ? "desvincular" : "unlink"}
                          </button>
                        )}
                        <button
                          onClick={() => startEditTrack(track)}
                          className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded cursor-pointer font-bold uppercase tracking-wider text-[10px]"
                        >
                          <Edit3 className="w-3 h-3" />
                          {language === "pt" ? "editar" : "edit"}
                        </button>
                        <button
                          onClick={() => handleRemoveTrack(track.id)}
                          className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-950/40 hover:bg-red-950/80 text-red-200 border border-red-900 rounded cursor-pointer font-bold uppercase tracking-wider text-[10px]"
                        >
                          <Trash2 className="w-3 h-3" />
                          {language === "pt" ? "apagar" : "delete"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* IMPORT TRACK VIA SPOTIFY CARD */}
            <div className="p-6 bg-wine-deep border border-panel-border rounded space-y-4">
              <h5 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                🚀 {language === "pt" ? "importar música via spotify" : "import track via spotify"}
              </h5>
              <p className="text-neutral-400 text-xs font-serif leading-relaxed">
                {language === "pt"
                  ? "cole o link ou ID da música do spotify. o sistema irá buscar a capa, título, artistas e a contagem de reproduções em tempo real."
                  : "paste a spotify track link or ID. the system will fetch the cover, title, artists, and real-time stream counts."}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={importTrackUrlOrId}
                  onChange={(e) => setImportTrackUrlOrId(e.target.value)}
                  placeholder={language === "pt" ? "cole o link da música (ex: https://open.spotify.com/track/...)" : "paste spotify track link (e.g. https://open.spotify.com/track/...)"}
                  className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-white text-xs focus:outline-none"
                />
                <button
                  onClick={handleImportTrack}
                  disabled={importingTrack}
                  className="px-5 py-2 bg-rose hover:bg-rose-dark text-floral-bg font-extrabold uppercase tracking-wider rounded transition-colors cursor-pointer border border-rose disabled:opacity-50 text-xs flex items-center justify-center gap-1.5"
                >
                  {importingTrack ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      {language === "pt" ? "importando..." : "importing..."}
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      {language === "pt" ? "importar" : "import"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* SECTION C: ALBUMS CATALOG */}
          <div className="space-y-4 border-t border-panel-border pt-6">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              💿 {language === "pt" ? "álbuns catalogados" : "catalog albums"}
            </h4>

            <div className="grid grid-cols-1 gap-4">
              {albums.map((album) => (
                <div key={album.id} className="p-5 bg-wine-deep border border-panel-border rounded space-y-4">
                  {editingAlbumId === album.id ? (
                    /* EDITING ALBUM FORM */
                    <div className="space-y-4 animate-fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-neutral-455 uppercase mb-1 font-bold">title</label>
                          <input
                            type="text"
                            value={editAlbumTitle}
                            onChange={(e) => setEditAlbumTitle(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-850 rounded px-2 py-1 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-neutral-455 uppercase mb-1 font-bold">year</label>
                          <input
                            type="text"
                            value={editAlbumYear}
                            onChange={(e) => setEditAlbumYear(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-850 rounded px-2 py-1 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-neutral-455 uppercase mb-1 font-bold">cover url</label>
                          <input
                            type="text"
                            value={editAlbumCoverUrl}
                            onChange={(e) => setEditAlbumCoverUrl(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-850 rounded px-2 py-1 text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-neutral-455 uppercase mb-1 font-bold">spotify album id</label>
                          <input
                            type="text"
                            value={editAlbumSpotifyAlbumId}
                            onChange={(e) => setEditAlbumSpotifyAlbumId(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-850 rounded px-2 py-1 text-white"
                            placeholder="e.g. 5emVjRjWIFacG5uGjlKNU7"
                          />
                        </div>
                        <div>
                          <label className="block text-neutral-455 uppercase mb-1 font-bold">total streams</label>
                          <input
                            type="number"
                            value={editAlbumTotalStreams}
                            onChange={(e) => setEditAlbumTotalStreams(Number(e.target.value) || 0)}
                            className="w-full bg-neutral-900 border border-neutral-850 rounded px-2 py-1 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-neutral-455 uppercase mb-1 font-bold">daily gain</label>
                          <input
                            type="number"
                            value={editAlbumDailyGain}
                            onChange={(e) => setEditAlbumDailyGain(Number(e.target.value) || 0)}
                            className="w-full bg-neutral-900 border border-neutral-850 rounded px-2 py-1 text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-neutral-455 uppercase mb-1 font-bold">album type</label>
                          <select
                            value={editAlbumType}
                            onChange={(e) => setEditAlbumType(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-850 rounded px-2 py-1.5 text-white text-xs focus:outline-none"
                          >
                            <option value="studio">{language === "pt" ? "Álbum de Estúdio" : "Studio Album"}</option>
                            <option value="ep">EP</option>
                            <option value="compilation">{language === "pt" ? "Participação / Compilação" : "Collab / Compilation"}</option>
                            <option value="other">{language === "pt" ? "Outra Versão (Acapella, Instrumental, etc.)" : "Other Version (Acapella, Instrumental, etc.)"}</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end pt-2">
                        <button
                          onClick={() => handleSaveAlbumEdit(album.id)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer font-bold uppercase tracking-wider"
                        >
                          {language === "pt" ? "salvar" : "save"}
                        </button>
                        <button
                          onClick={cancelEditAlbum}
                          className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded cursor-pointer font-bold uppercase tracking-wider"
                        >
                          {language === "pt" ? "cancelar" : "cancel"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* VIEW ALBUM VIEW */
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in">
                      <div className="flex items-center gap-4">
                        <img src={album.coverUrl} className="w-12 h-12 rounded object-cover border border-panel-border" alt="" />
                        <div>
                          <span className="font-bold text-white text-sm block">{album.title} ({album.year})</span>
                          <span className="text-neutral-400 block mt-0.5">id: {album.id}</span>
                          <div className="text-[10px] text-neutral-500 mt-1 space-y-0.5">
                            <span className="block">Spotify Album ID: <strong className="text-neutral-400 font-mono">{album.spotifyAlbumId || "none"}</strong></span>
                            <span className="block">Streams: <strong className="text-neutral-400">{album.totalStreams.toLocaleString()}</strong></span>
                            <span className="block">Daily Gain: <strong className="text-rose font-semibold">+{album.dailyGain.toLocaleString()}</strong></span>
                            <span className="block">Type: <strong className="text-neutral-400 capitalize">{album.type || (album.isParticipation ? "compilation" : "studio")}</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 w-full md:w-auto justify-end">
                        <button
                          onClick={() => startEditAlbum(album)}
                          className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded cursor-pointer font-bold uppercase tracking-wider text-[10px]"
                        >
                          <Edit3 className="w-3 h-3" />
                          {language === "pt" ? "editar" : "edit"}
                        </button>
                        <button
                          onClick={() => handleRemoveAlbum(album.id)}
                          className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-950/40 hover:bg-red-950/80 text-red-200 border border-red-900 rounded cursor-pointer font-bold uppercase tracking-wider text-[10px]"
                        >
                          <Trash2 className="w-3 h-3" />
                          {language === "pt" ? "apagar" : "delete"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STREAMS & UPDATE CONTROLLER */}
      {adminTab === "streams" && (
        <div className="space-y-8">
          {editingHistoryTrackId ? (
            /* HISTORY EDITOR */
            <div className="neobrutal-card p-6 bg-wine-deep border border-panel-border space-y-6 animate-fade-in font-mono text-xs">
              <div className="flex justify-between items-center border-b border-panel-border pb-4">
                <div>
                  <h3 className="text-base font-bold text-white uppercase tracking-wider">
                    {language === "pt" ? "editar histórico diário" : "edit daily history"}
                  </h3>
                  <p className="text-neutral-450 mt-1 font-serif text-[11px]">
                    {language === "pt"
                      ? `ajuste o histórico da faixa: ${tracks.find(t => t.id === editingHistoryTrackId)?.title}`
                      : `modify stream history entries for track: ${tracks.find(t => t.id === editingHistoryTrackId)?.title}`}
                  </p>
                </div>
                <button
                  onClick={() => setEditingHistoryTrackId(null)}
                  className="p-1.5 bg-neutral-900 border border-panel-border text-neutral-400 hover:text-white rounded cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {loadingHistory ? (
                <div className="text-center py-12 text-neutral-400 animate-pulse font-serif">
                  {language === "pt" ? "carregando histórico completo..." : "loading full history details..."}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Base Total Streams Input */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-wine-dark/20 p-4 border border-panel-border rounded">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-neutral-450 uppercase mb-1">
                        {language === "pt" ? "base de streams iniciais" : "base initial streams"}
                      </label>
                      <span className="text-[10px] text-neutral-500 block leading-relaxed font-serif">
                        {language === "pt"
                          ? "plays acumulados antes do primeiro registro de histórico"
                          : "cumulative plays before the first history entry"}
                      </span>
                    </div>
                    <input
                      type="number"
                      value={historyBaseTotal}
                      onChange={(e) => handleBaseTotalChange(parseInt(e.target.value) || 0)}
                      className="bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-white text-xs w-48 focus:outline-none font-mono"
                    />
                  </div>

                  {/* History Entries Table */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-white uppercase tracking-wider text-xs border-b border-panel-border pb-1">
                      {language === "pt" ? "entradas diárias" : "daily entries"}
                    </h4>
                    
                    {historyEntries.length === 0 ? (
                      <p className="text-neutral-500 font-serif py-4">
                        {language === "pt" ? "nenhum registro diário encontrado." : "no daily entries found."}
                      </p>
                    ) : (
                      <div className="overflow-x-auto border border-panel-border rounded">
                        <table className="w-full border-collapse text-left text-xs font-mono text-neutral-300">
                          <thead>
                            <tr className="bg-wine-deep border-b border-panel-border text-neutral-400 font-bold">
                              <th className="py-2.5 px-4">{language === "pt" ? "data" : "date"}</th>
                              <th className="py-2.5 px-4">{language === "pt" ? "ganho diário (daily)" : "daily gain"}</th>
                              <th className="py-2.5 px-4">{language === "pt" ? "total acumulado (recalculado)" : "cumulative total (recalculated)"}</th>
                              <th className="py-2.5 px-4 text-right">{language === "pt" ? "ações" : "actions"}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {historyEntries.map((entry, index) => (
                              <tr key={entry.date} className="border-b border-panel-border hover:bg-wine-dark/10">
                                <td className="py-2 px-4 text-white font-bold">{entry.date}</td>
                                <td className="py-2 px-4">
                                  <input
                                    type="number"
                                    value={entry.daily}
                                    onChange={(e) => handleHistoryEntryChange(index, parseInt(e.target.value) || 0)}
                                    className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white w-32 focus:outline-none font-mono"
                                  />
                                </td>
                                <td className="py-2 px-4 text-neutral-400">
                                  {entry.total.toLocaleString()}
                                </td>
                                <td className="py-2 px-4 text-right">
                                  <button
                                    onClick={() => handleRemoveHistoryEntry(index)}
                                    className="p-1 bg-red-950/40 hover:bg-red-950/80 text-red-400 hover:text-red-200 border border-red-900/30 rounded cursor-pointer transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Add New Entry Form */}
                  <div className="bg-wine-dark/10 p-4 border border-panel-border rounded space-y-3">
                    <h5 className="font-bold text-white uppercase tracking-wider text-[10px]">
                      ➕ {language === "pt" ? "adicionar nova data" : "add new date entry"}
                    </h5>
                    <div className="flex flex-wrap gap-4 items-end">
                      <div>
                        <label className="block text-[10px] text-neutral-455 uppercase mb-1">
                          {language === "pt" ? "data (AAAA-MM-DD)" : "date (YYYY-MM-DD)"}
                        </label>
                        <input
                          type="text"
                          id="new-entry-date"
                          placeholder={getTodayDateStr()}
                          className="bg-neutral-900 border border-neutral-800 rounded px-3 py-1.5 text-white text-xs w-36 focus:outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-neutral-455 uppercase mb-1">
                          {language === "pt" ? "ganho diário" : "daily gain"}
                        </label>
                        <input
                          type="number"
                          id="new-entry-daily"
                          placeholder="50000"
                          className="bg-neutral-900 border border-neutral-800 rounded px-3 py-1.5 text-white text-xs w-36 focus:outline-none font-mono"
                        />
                      </div>
                      <button
                        onClick={() => {
                          const dateEl = document.getElementById("new-entry-date") as HTMLInputElement;
                          const dailyEl = document.getElementById("new-entry-daily") as HTMLInputElement;
                          if (dateEl && dailyEl) {
                            const date = dateEl.value.trim() || getTodayDateStr();
                            const daily = parseInt(dailyEl.value) || 0;
                            handleAddHistoryEntry(date, daily);
                            dateEl.value = "";
                            dailyEl.value = "";
                          }
                        }}
                        className="flex items-center justify-center gap-1.5 px-4 py-2 bg-neutral-850 hover:bg-neutral-700 text-white rounded cursor-pointer font-bold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {language === "pt" ? "Adicionar" : "Add Entry"}
                      </button>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-panel-border">
                    <button
                      onClick={() => setEditingHistoryTrackId(null)}
                      className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 font-bold uppercase tracking-wider text-xs transition-colors cursor-pointer"
                    >
                      {language === "pt" ? "cancelar" : "cancel"}
                    </button>
                    <button
                      onClick={handleSaveHistory}
                      className="flex items-center gap-2 px-5 py-2.5 bg-rose hover:bg-rose-dark text-floral-bg font-extrabold uppercase tracking-wider text-xs transition-colors cursor-pointer border border-rose"
                    >
                      <Save className="w-4 h-4" />
                      {language === "pt" ? "recalcular e salvar" : "recalculate & save"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* MAIN TABLES VIEW */
            <>
              <div className="bg-wine-dark/40 border border-panel-border p-6 rounded flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                    {language === "pt" ? "contadores de reproduções em tempo real" : "real-time streaming counters"}
                  </h3>
                  <p className="text-sm text-neutral-400 mt-1 font-serif">
                    {language === "pt" ? "ajuste streams e metas diárias estimadas para atualizar a projeção." : "manually adjust streaming counts, milestone targets, and edit daily gains."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    onClick={handleUpdatePlaysFromSpotify}
                    disabled={updatingPlays}
                    className="flex items-center justify-center gap-2 px-5 py-3 bg-rose hover:bg-rose-dark text-floral-bg font-extrabold text-xs uppercase tracking-wider transition-colors cursor-pointer border border-rose disabled:opacity-50 font-mono"
                  >
                    <RefreshCw className={`w-4 h-4 ${updatingPlays ? "animate-spin" : ""}`} />
                    {updatingPlays
                      ? (language === "pt" ? "sincronizando..." : "syncing...")
                      : (language === "pt" ? "sincronizar spotify" : "update via spotify")}
                  </button>
                  <button
                    onClick={triggerDailySimulation}
                    className="flex items-center justify-center gap-2 px-5 py-3 bg-white hover:bg-neutral-200 text-black font-extrabold text-xs uppercase tracking-wider transition-colors cursor-pointer border border-neutral-800 font-mono"
                  >
                    <RefreshCw className="w-4 h-4" /> {language === "pt" ? "simular dia seguinte" : "simulate daily update"}
                  </button>
                </div>
              </div>

              {/* Tracks streams tables */}
              <div className="space-y-4">
                <h4 className="text-base font-bold text-white uppercase tracking-wider border-b border-panel-border pb-2">
                  {language === "pt" ? "lista de faixas" : "tracks list"}
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs font-mono text-neutral-300">
                    <thead>
                      <tr className="border-b border-panel-border text-neutral-500 uppercase">
                        <th className="py-2.5 pr-4">{language === "pt" ? "título da faixa" : "track title"}</th>
                        <th className="py-2.5">{language === "pt" ? "streams totais" : "total streams"}</th>
                        <th className="py-2.5">{language === "pt" ? "ganho diário" : "daily gain"}</th>
                        <th className="py-2.5">{language === "pt" ? "meta (milestone)" : "milestone target"}</th>
                        <th className="py-2.5">{language === "pt" ? "média diária" : "avg daily"}</th>
                        <th className="py-2.5 text-right">&nbsp;</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-panel-border/40">
                      {tracks.map((track, index) => {
                        return (
                          <tr key={track.id} className="hover:bg-wine-dark/20">
                            <td className="py-3 pr-4 font-semibold text-white truncate max-w-[150px]">{track.title}</td>
                            <td className="py-3">
                              <input
                                type="number"
                                value={track.totalStreams || 0}
                                onChange={(e) => handleTrackChange(index, "totalStreams", parseInt(e.target.value) || 0)}
                                className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white w-28 focus:outline-none font-mono"
                              />
                            </td>
                            <td className="py-3">
                              <input
                                type="number"
                                value={track.dailyGain || 0}
                                onChange={(e) => handleTrackChange(index, "dailyGain", parseInt(e.target.value) || 0)}
                                className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white w-24 focus:outline-none font-mono"
                              />
                            </td>
                            <td className="py-3">
                              <input
                                type="number"
                                value={track.milestoneTarget}
                                onChange={(e) => handleTrackChange(index, "milestoneTarget", parseInt(e.target.value) || 0)}
                                className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white w-28 focus:outline-none font-mono"
                              />
                            </td>
                            <td className="py-3">
                              <input
                                type="number"
                                value={track.avgDailyGain}
                                onChange={(e) => handleTrackChange(index, "avgDailyGain", parseInt(e.target.value) || 0)}
                                className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white w-24 focus:outline-none font-mono"
                              />
                            </td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => handleStartEditHistory(track.id)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-panel-border hover:border-neutral-700 text-neutral-300 hover:text-white rounded cursor-pointer transition-colors"
                                title={language === "pt" ? "Editar Histórico Diário" : "Edit Daily History"}
                              >
                                <Calendar className="w-3.5 h-3.5 animate-pulse" />
                                <span>{language === "pt" ? "Histórico" : "History"}</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Albums streams table */}
              <div className="space-y-4">
                <h4 className="text-base font-bold text-white uppercase tracking-wider border-b border-panel-border pb-2">
                  {language === "pt" ? "lista de álbuns" : "albums list"}
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs font-mono text-neutral-300">
                    <thead>
                      <tr className="border-b border-panel-border text-neutral-500 uppercase">
                        <th className="py-2.5">{language === "pt" ? "título do álbuns" : "album title"}</th>
                        <th className="py-2.5">{language === "pt" ? "ano" : "year"}</th>
                        <th className="py-2.5">{language === "pt" ? "streams totais" : "total streams"}</th>
                        <th className="py-2.5">{language === "pt" ? "ganho diário" : "daily gain"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-panel-border/40">
                      {albums.map((album, index) => {
                        return (
                          <tr key={album.id} className="hover:bg-wine-dark/20">
                            <td className="py-3 font-semibold text-white">{album.title}</td>
                            <td className="py-3">{album.year}</td>
                            <td className="py-3">
                              <input
                                type="number"
                                value={album.totalStreams || 0}
                                onChange={(e) => handleAlbumChange(index, "totalStreams", parseInt(e.target.value) || 0)}
                                className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white w-32 focus:outline-none font-mono"
                              />
                            </td>
                            <td className="py-3">
                              <input
                                type="number"
                                value={album.dailyGain || 0}
                                onChange={(e) => handleAlbumChange(index, "dailyGain", parseInt(e.target.value) || 0)}
                                className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white w-28 focus:outline-none font-mono"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
