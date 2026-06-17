"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSpotify } from "@/context/SpotifyContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { dbOperations } from "@/lib/firebase";
import { addStreamHistoryEntry, getTodayDateStr } from "@/lib/streamHistory";
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
  Edit3
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
  streams?: { [date: string]: { total: number; daily: number | null } };
}

interface PendingValidation {
  trackId: string;
  trackName: string;
  suggestedSongId: string | null;
  suggestedSongTitle: string | null;
  coverUrl: string;
  streams: number;
  status: "pending_merge" | "pending_new" | "auto_merged";
}

export default function AdminPanel() {
  const { language } = useLanguage();
  const { theme } = useTheme();

  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState("");
  const [authError, setAuthError] = useState(false);

  // Panel tabs: "catalog" | "streams" | "validations" | "simulator" | "deletions"
  const [adminTab, setAdminTab] = useState<"catalog" | "streams" | "validations" | "simulator" | "deletions">("catalog");

  // Catalog / Streams states
  const [tracks, setTracks] = useState<TrackStat[]>([]);
  const [albums, setAlbums] = useState<AlbumStat[]>([]);
  const [pendingList, setPendingList] = useState<PendingValidation[]>([]);
  const [deletionsList, setDeletionsList] = useState<any[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

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

    const queue = await dbOperations.getPendingValidations();
    setPendingList(queue);

    dbOperations.getPendingDeletions().then(reqs => {
      setDeletionsList(reqs);
    });
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
          updatedAlbums.push(newAlbum);
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
        setTracks(data.tracks);
        setAlbums(data.albums);
        showStatus(language === "pt" ? "Plays atualizados com sucesso via Spotify Partner API!" : "Plays updated successfully via Spotify Partner API!");
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

  const submitSimulatedPlay = async () => {
    if (!simSelectedTrackId) {
      showStatus(language === "pt" ? "selecione uma versão de música." : "please select a track version to simulate streams.");
      return;
    }

    try {
      const mockUserId = `sim_${Math.floor(Math.random() * 90000 + 10000)}`;
      await dbOperations.trackUserStream(
        mockUserId,
        simUserDisplayName || "Simulated Fan",
        "",
        simSelectedTrackId,
        simPlayCount
      );
      // Track as global play count too
      await dbOperations.trackArianaSongStream(
        simSelectedTrackId,
        "Simulated track name",
        "/petal.jpg",
        simPlayCount
      );
      loadAdminConfig();
      showStatus(language === "pt" ? `adicionados +${simPlayCount} plays simulados!` : `simulated ${simPlayCount} plays successfully!`);
    } catch (err) {
      console.error(err);
      showStatus("failed to submit simulated plays.");
    }
  };

  const handleClearSimulation = () => {
    dbOperations.clearSimulatedPlays();
    loadAdminConfig();
    showStatus(language === "pt" ? "plays simulados limpos com sucesso!" : "simulated plays successfully cleared!");
  };

  const handleResolveValidation = (trackId: string, action: "merge" | "create" | "reject", targetSongId?: string) => {
    dbOperations.resolvePendingValidation(trackId, action, targetSongId);
    loadAdminConfig();
    showStatus(language === "pt" ? `resolvido com ação: ${action}` : `resolved with action: ${action}`);
  };

  const handleResolveDeletion = async (userId: string, action: "approve" | "reject") => {
    try {
      await dbOperations.resolveUserDeletion(userId, action);
      showStatus(
        action === "approve"
          ? (language === "pt" ? "dados do usuário removidos com sucesso!" : "user data deleted successfully!")
          : (language === "pt" ? "solicitação de remoção rejeitada!" : "removal request rejected!")
      );
      loadAdminConfig();
    } catch (err) {
      console.error(err);
      showStatus("failed to resolve removal request.");
    }
  };

  // Render Passcode Form if not authenticated
  if (!isAuthenticated) {
    return (
      <div id="admin-auth" className="max-w-md mx-auto glass-panel p-8 text-center animate-fade-in text-floral-fg">
        <ShieldAlert className="w-14 h-14 text-rose mx-auto mb-5 animate-pulse" />
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
            className="w-full bg-neutral-950 border border-neutral-900 rounded px-4 py-3 text-center text-white focus:border-white focus:outline-none placeholder-neutral-700 text-sm"
          />
          {authError && (
            <span className="text-xs text-red-500 font-bold block">
              {language === "pt" ? "senha inválida. tente novamente." : "invalid passcode. try again."}
            </span>
          )}
          <button
            type="submit"
            className="w-full py-3 bg-white hover:bg-neutral-200 text-black font-extrabold text-xs uppercase tracking-wider transition-colors cursor-pointer border border-neutral-850"
          >
            {language === "pt" ? "desbloquear" : "authenticate"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <section className="glass-panel p-6 lg:p-10 text-floral-fg animate-fade-in" id="admin">
      {/* Header Block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-panel-border pb-6 mb-8 gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-neutral-900 border border-neutral-800 text-white rounded">
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
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-rose hover:bg-rose-dark text-floral-bg font-extrabold text-xs uppercase tracking-wider transition-colors cursor-pointer border border-rose"
        >
          <Save className="w-4 h-4" /> {language === "pt" ? "salvar alterações" : "save changes"}
        </button>
      </div>

      {statusMessage && (
        <div className="mb-6 p-4 bg-wine-deep border border-panel-border text-white text-sm rounded flex items-center gap-2 animate-slide-up font-mono">
          <AlertCircle className="w-4 h-4 text-rose" /> {statusMessage}
        </div>
      )}

      {/* ADMIN SUB-TABS */}
      <div className="flex flex-wrap border-b border-panel-border mb-8 gap-6 text-sm font-bold uppercase tracking-wider text-neutral-450 font-mono">
        <button
          onClick={() => setAdminTab("catalog")}
          className={`pb-3 cursor-pointer ${adminTab === "catalog" ? "text-white border-b border-white" : "hover:text-white"}`}
        >
          {language === "pt" ? "foco & alternativas" : "track catalog"}
        </button>
        <button
          onClick={() => setAdminTab("streams")}
          className={`pb-3 cursor-pointer ${adminTab === "streams" ? "text-white border-b border-white" : "hover:text-white"}`}
        >
          {language === "pt" ? "tabela de reproduções" : "album & track counts"}
        </button>
        <button
          onClick={() => setAdminTab("validations")}
          className={`pb-3 cursor-pointer relative ${adminTab === "validations" ? "text-white border-b border-white" : "hover:text-white"}`}
        >
          {language === "pt" ? "validações pendentes" : "pending validations"}
          {pendingList.length > 0 && (
            <span className="absolute -top-1.5 -right-3.5 bg-rose text-floral-bg text-[9px] font-extrabold rounded-full w-4 h-4 flex items-center justify-center">
              {pendingList.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setAdminTab("simulator")}
          className={`pb-3 cursor-pointer ${adminTab === "simulator" ? "text-white border-b border-white" : "hover:text-white"}`}
        >
          {language === "pt" ? "simulador de plays" : "fanbase simulator"}
        </button>
        <button
          onClick={() => setAdminTab("deletions")}
          className={`pb-3 cursor-pointer relative ${adminTab === "deletions" ? "text-white border-b border-white" : "hover:text-white"}`}
        >
          {language === "pt" ? "remoções pendentes" : "removal requests"}
          {deletionsList.length > 0 && (
            <span className="absolute -top-1.5 -right-3.5 bg-rose text-floral-bg text-[9px] font-extrabold rounded-full w-4 h-4 flex items-center justify-center">
              {deletionsList.length}
            </span>
          )}
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
                    <th className="py-2.5">{language === "pt" ? "título do álbum" : "album title"}</th>
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
        </div>
      )}

      {/* TAB 3: PENDING VALIDATIONS QUEUE */}
      {adminTab === "validations" && (
        <div className="space-y-6">
          <div className="bg-wine-dark/40 border border-panel-border p-6 rounded space-y-4">
            <h3 className="text-base font-bold text-white uppercase tracking-wider">
              {language === "pt" ? "validações e conciliação de novos IDs" : "pending track reconciliations"}
            </h3>
            <p className="text-sm text-neutral-400 font-serif leading-relaxed">
              {language === "pt"
                ? "toda vez que um fã ouve um ID de música da ariana que não está no catálogo principal, ela cai nesta fila. você pode rejeitar o stream, registrá-la como uma versão foco própria, ou agrupá-la (merge) a uma música foco existente para somar os plays."
                : "when fans stream Ariana tracks whose Spotify IDs aren't directly registered, they register here. Decide if they should be approved as new catalog tracks, rejected, or merged/linked with an existing focus song."}
            </p>
          </div>

          {pendingList.length === 0 ? (
            <div className="text-center py-16 border border-panel-border rounded bg-wine-deep/20 text-neutral-450 font-serif text-sm">
              {language === "pt" ? "nenhuma música pendente de validação." : "no pending tracks requiring validation."}
            </div>
          ) : (
            <div className="space-y-4">
              {pendingList.map((item) => (
                <div key={item.trackId} className="p-5 bg-wine-deep border border-panel-border rounded flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 animate-fade-in text-xs font-mono">

                  {/* Track basic info */}
                  <div className="flex gap-4 items-center">
                    <img
                      src={item.coverUrl}
                      alt={item.trackName}
                      className="w-12 h-12 rounded object-cover border border-panel-border"
                    />
                    <div>
                      <span className="font-bold text-white text-sm block">{item.trackName}</span>
                      <span className="text-neutral-450 block mt-0.5">Spotify ID: {item.trackId}</span>
                      <span className="text-rose font-bold block mt-1">
                        {language === "pt" ? `streams acumulados: ${item.streams}` : `accumulated streams: ${item.streams}`}
                      </span>
                    </div>
                  </div>

                  {/* Merge recommendation or selectors */}
                  <div className="flex flex-col sm:flex-row gap-3 items-end sm:items-center w-full lg:w-auto">
                    {item.status === "auto_merged" ? (
                      <div className="w-full sm:w-80 text-emerald-450 font-bold flex items-center gap-1.5 bg-emerald-950/20 border border-emerald-900/30 p-2.5 rounded">
                        <Check className="w-4 h-4 text-emerald-450 shrink-0" />
                        <span>
                          {language === "pt"
                            ? `Mesclado automaticamente com: "${item.suggestedSongTitle}"`
                            : `Automatically merged with: "${item.suggestedSongTitle}"`}
                        </span>
                      </div>
                    ) : (
                      <div className="w-full sm:w-60 relative">
                        <select
                          value={selectedMergeTarget[item.trackId] !== undefined ? selectedMergeTarget[item.trackId] : (item.suggestedSongId || "")}
                          onChange={(e) => setSelectedMergeTarget(prev => ({ ...prev, [item.trackId]: e.target.value }))}
                          className={`w-full bg-neutral-950 border rounded p-2 text-xs text-white focus:outline-none ${item.suggestedSongId ? "border-amber-500/40 focus:border-amber-500" : "border-neutral-900"
                            }`}
                        >
                          <option value="">{language === "pt" ? "-- mesclar com... --" : "-- merge target --"}</option>
                          {tracks.map(t => (
                            <option key={t.id} value={t.id}>{t.title}</option>
                          ))}
                        </select>
                        {item.suggestedSongId && (
                          <span className="absolute -top-2.5 right-2 bg-amber-500 text-neutral-950 text-[8px] font-extrabold px-1 py-0.5 rounded uppercase tracking-wider font-mono scale-90">
                            {language === "pt" ? "sugestão" : "suggested"}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2 w-full sm:w-auto justify-end">
                      {item.status === "auto_merged" ? (
                        <button
                          onClick={() => handleResolveValidation(item.trackId, "reject")}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer font-bold"
                          title={language === "pt" ? "Confirmar e arquivar aviso" : "Confirm and dismiss"}
                        >
                          <Check className="w-3.5 h-3.5" />
                          {language === "pt" ? "Entendido" : "Dismiss"}
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              const target = selectedMergeTarget[item.trackId] !== undefined
                                ? selectedMergeTarget[item.trackId]
                                : (item.suggestedSongId || "");
                              if (!target) {
                                showStatus(language === "pt" ? "selecione a música principal de destino." : "please select a target focus song to merge.");
                                return;
                              }
                              handleResolveValidation(item.trackId, "merge", target);
                            }}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer"
                            title={language === "pt" ? "Mesclar e agrupar plays" : "Merge / Link ID"}
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            {language === "pt" ? "Mesclar" : "Merge"}
                          </button>

                          <button
                            onClick={() => handleResolveValidation(item.trackId, "create")}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 rounded cursor-pointer"
                            title={language === "pt" ? "Adicionar como faixa foco independente" : "Approve as focus track"}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            {language === "pt" ? "Criar foco" : "Create"}
                          </button>

                          <button
                            onClick={() => handleResolveValidation(item.trackId, "reject")}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-red-950/40 hover:bg-red-950/80 text-red-200 border border-red-900 rounded cursor-pointer"
                            title={language === "pt" ? "Rejeitar e apagar streams" : "Reject Streams"}
                          >
                            <X className="w-3.5 h-3.5" />
                            {language === "pt" ? "Rejeitar" : "Reject"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: FANBASE PLAY SIMULATOR */}
      {adminTab === "simulator" && (
        <div className="space-y-6">
          <div className="bg-wine-dark/40 border border-panel-border p-6 rounded space-y-4">
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">
              {language === "pt" ? "simulador de ações de streams" : "fanbase stream action simulator"}
            </h3>
            <p className="text-sm text-neutral-400 font-serif leading-relaxed">
              {language === "pt"
                ? "simule streams de fãs enviando dados para o banco. veja em tempo real as mudanças de posições no ranking e termômetro."
                : "simulate fanbase plays directly. select a focus track or hit track, enter play count increments, and submit simulated streams to view rank and leaderboard changes."}
            </p>
          </div>

          <div className="bg-wine-deep p-6 border border-panel-border rounded space-y-5 text-sm font-mono text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-neutral-450 uppercase mb-1.5">
                  {language === "pt" ? "nome do fã simulado" : "fan display name"}
                </label>
                <input
                  type="text"
                  value={simUserDisplayName}
                  onChange={(e) => setSimUserDisplayName(e.target.value)}
                  placeholder="Simulated Fan"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-450 uppercase mb-1.5">
                  {language === "pt" ? "faixa de música" : "track to stream"}
                </label>
                <select
                  value={simSelectedTrackId}
                  onChange={(e) => setSimSelectedTrackId(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm text-white focus:outline-none cursor-pointer"
                >
                  <option value="">{language === "pt" ? "-- selecionar faixa --" : "-- select track --"}</option>
                  <option value="20jbSiX29FDX4oQxBXyUEi">we can't be friends (Standard Edition)</option>
                  <option value="3iy2QuCtCzpWnR6tia39AB">we can't be friends (Deluxe Edition)</option>
                  <option value="3sLsICFrhFhXZlRFb3f2jB">we can't be friends (Slightly Deluxe Edition)</option>
                  <option value="5D34wRmbFS29AjtTOP2QJe">yes, and? (Standard Edition)</option>
                  <option value="0Lmbke3KNVFXtoH2mMSHCw">the boy is mine (Standard Edition)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-450 uppercase mb-1.5">
                  {language === "pt" ? "quantidade de plays" : "stream count increment"}
                </label>
                <input
                  type="number"
                  value={simPlayCount}
                  onChange={(e) => setSimPlayCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <button
                onClick={submitSimulatedPlay}
                className="flex-1 py-3 bg-white text-black font-extrabold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-colors cursor-pointer border border-neutral-800"
              >
                {language === "pt" ? "lançar plays simulados" : "submit simulated play"}
              </button>

              <button
                onClick={handleClearSimulation}
                className="flex-1 py-3 bg-red-950/40 hover:bg-red-950/80 text-red-200 border border-red-900 font-extrabold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                {language === "pt" ? "limpar todos os plays simulados" : "clear all simulated streams"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: REMOVAL REQUESTS */}
      {adminTab === "deletions" && (
        <div className="space-y-6">
          <div className="bg-wine-dark/40 border border-panel-border p-6 rounded space-y-4">
            <h3 className="text-base font-bold text-white uppercase tracking-wider">
              {language === "pt" ? "solicitações de remoção de dados" : "pending data removal requests"}
            </h3>
            <p className="text-sm text-neutral-400 font-serif leading-relaxed">
              {language === "pt"
                ? "usuários que solicitaram a exclusão de seus perfis e streams do site. aprovar a remoção excluirá permanentemente todos os registros de streams e pontuações do leaderboard desse usuário."
                : "users who have requested the deletion of their profiles and streaming logs. approving the deletion will permanently remove all streams and leaderboard data associated with this user."}
            </p>
          </div>

          {deletionsList.length === 0 ? (
            <div className="text-center py-16 border border-panel-border rounded bg-wine-deep/20 text-neutral-450 font-serif text-sm">
              {language === "pt" ? "nenhuma solicitação de remoção pendente." : "no pending removal requests."}
            </div>
          ) : (
            <div className="space-y-4">
              {deletionsList.map((item: any) => (
                <div key={item.userId} className="p-5 bg-wine-deep border border-panel-border rounded flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 animate-fade-in text-xs font-mono">
                  <div>
                    <span className="font-bold text-white text-sm block">
                      {item.displayName}
                    </span>
                    <span className="text-neutral-400 block mt-1">stats.fm ID: {item.userId}</span>
                    <span className="text-neutral-500 block mt-0.5">
                      {language === "pt" ? `solicitado em: ${new Date(item.requestedAt).toLocaleString()}` : `requested at: ${new Date(item.requestedAt).toLocaleString()}`}
                    </span>
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => handleResolveDeletion(item.userId, "approve")}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded cursor-pointer font-bold"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {language === "pt" ? "aprovar exclusão" : "approve removal"}
                    </button>
                    <button
                      onClick={() => handleResolveDeletion(item.userId, "reject")}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 rounded cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      {language === "pt" ? "rejeitar" : "reject"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
