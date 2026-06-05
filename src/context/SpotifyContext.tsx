"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from "react";
import { DEFAULT_FOCUS_TRACKS, extractTrackId } from "@/lib/playlist";
import { dbOperations } from "@/lib/firebase";

interface SpotifyUser {
  id: string;
  display_name: string;
  images: { url: string }[];
  customId?: string;
}

interface ThermometerData {
  [trackId: string]: number;
}

interface SpotifyContextType {
  user: SpotifyUser | null;
  token: string | null;
  isLoading: boolean;
  login: (statsFmId: string) => Promise<void>;
  logout: () => void;
  checkRecentlyPlayed: (force?: boolean) => Promise<void>;
  thermometer: ThermometerData;
  syncStatus: "idle" | "syncing" | "success" | "error";
  lastSyncedTime: Date | null;
  focusTracks: string[];
  setFocusTracks: (tracks: string[]) => void;
  loginError: string | null;
  setLoginError: (err: string | null) => void;
  isDemoMode: boolean;
  isAdmin: boolean;
}

const SpotifyContext = createContext<SpotifyContextType | undefined>(undefined);

export function SpotifyProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SpotifyUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [thermometer, setThermometer] = useState<ThermometerData>({});
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [lastSyncedTime, setLastSyncedTime] = useState<Date | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const checkInterval = useRef<NodeJS.Timeout | null>(null);
  const [catalogTracks, setCatalogTracks] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkAdminStatus = useCallback(() => {
    if (typeof window === "undefined") return;
    const token = sessionStorage.getItem("arianator_admin_token");
    const expiresAt = sessionStorage.getItem("arianator_admin_expires");
    const authenticated = sessionStorage.getItem("arianator_admin_authenticated") === "true";
    if (!token || !expiresAt || !authenticated) {
      setIsAdmin(false);
      return;
    }
    const expiry = new Date(expiresAt);
    if (Number.isNaN(expiry.getTime()) || expiry <= new Date()) {
      setIsAdmin(false);
    } else {
      setIsAdmin(true);
    }
  }, []);

  // Listen to admin update events to reactively check authentication status
  useEffect(() => {
    checkAdminStatus();
    window.addEventListener("storage_admin_update", checkAdminStatus);
    return () => {
      window.removeEventListener("storage_admin_update", checkAdminStatus);
    };
  }, [checkAdminStatus]);

  // Focus Track URLs that can be dynamically updated
  const [focusTracks, setFocusTracksState] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("arianator_active_focus_track_versions");
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (_) {}
      }
    }
    return DEFAULT_FOCUS_TRACKS;
  });

  const setFocusTracks = (tracks: string[]) => {
    setFocusTracksState(tracks);
    if (typeof window !== "undefined") {
      localStorage.setItem("arianator_active_focus_track_versions", JSON.stringify(tracks));
    }
  };

  // Focus Track IDs set for fast O(1) lookup
  const focusTrackIds = useMemo(() => {
    return new Set(focusTracks.map(extractTrackId));
  }, [focusTracks]);

  // Logout function
  const logout = useCallback(() => {
    localStorage.removeItem("statsfm_user");
    setUser(null);
    setToken(null);
    setThermometer({});
    setLoginError(null);
    if (checkInterval.current) {
      clearInterval(checkInterval.current);
    }
  }, []);

  // Fetch token or login callback on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("statsfm_user");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setUser(parsed);
          setToken("statsfm");
        } catch (_) {}
      }
      setIsLoading(false);
    }
  }, []);

  // Update focus tracks dynamically on storage update event
  useEffect(() => {
    const handleUpdate = () => {
      const stored = localStorage.getItem("arianator_active_focus_track_versions");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setFocusTracksState(prev => {
            if (JSON.stringify(prev) === JSON.stringify(parsed)) {
              return prev;
            }
            return parsed;
          });
        } catch (_) {}
      }
    };
    window.addEventListener("storage_admin_update", handleUpdate);
    return () => {
      window.removeEventListener("storage_admin_update", handleUpdate);
    };
  }, []);

  // Fetch catalog on mount for stream aggregation
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const response = await fetch("/api/catalog");
        if (response.ok) {
          const data = await response.json();
          setCatalogTracks(data.tracks || []);
        }
      } catch (error) {
        console.error("Failed to load catalog for SpotifyProvider:", error);
      }
    };
    void fetchCatalog();
  }, []);

  // Load user daily streams on user change
  const loadUserDailyStreams = useCallback(async (userId: string, force = false) => {
    try {
      const cachedThermometerStr = localStorage.getItem(`arianator_thermometer_${userId}`);
      const storageKey = `arianator_last_sync_${userId}`;
      const storedLastSync = localStorage.getItem(storageKey);
      const lastSyncTime = storedLastSync ? parseInt(storedLastSync, 10) : 0;
      const now = Date.now();
      const timeSinceLastSync = now - lastSyncTime;

      if (!force && cachedThermometerStr && timeSinceLastSync < 900000) {
        try {
          const parsed = JSON.parse(cachedThermometerStr);
          setThermometer(parsed);
          return parsed;
        } catch (_) {}
      }

      const dailyStreams = await dbOperations.getUserDailyStreams(userId);
      const initialThermometer: ThermometerData = {};
      
      focusTracks.forEach(url => {
        const id = extractTrackId(url);
        initialThermometer[id] = 0;
      });

      Object.entries(dailyStreams).forEach(([trackId, count]) => {
        const matchedTrack = catalogTracks.find((t: any) =>
          t.spotifyTrackId === trackId || (t.alternativeIds || []).includes(trackId)
        );

        if (matchedTrack) {
          const mainId = matchedTrack.spotifyTrackId || matchedTrack.id;
          initialThermometer[mainId] = (initialThermometer[mainId] || 0) + (count as number);
        } else {
          initialThermometer[trackId] = (initialThermometer[trackId] || 0) + (count as number);
        }
      });

      setThermometer(initialThermometer);
      localStorage.setItem(`arianator_thermometer_${userId}`, JSON.stringify(initialThermometer));
      return initialThermometer;
    } catch (error) {
      console.error("Error loading user profile daily streams:", error);
      return {};
    }
  }, [focusTracks, catalogTracks]);

  useEffect(() => {
    if (user) {
      loadUserDailyStreams(user.id, false);
    }
  }, [user, loadUserDailyStreams]);

  // Login using Stats.fm ID
  const login = async (statsFmId: string) => {
    if (!statsFmId || !statsFmId.trim()) {
      setLoginError("Please enter a valid stats.fm username or ID.");
      throw new Error("EMPTY_ID");
    }
    
    setLoginError(null);
    setIsLoading(true);
    
    try {
      const res = await fetch(`https://api.stats.fm/api/v1/users/${statsFmId.trim()}`);
      if (!res.ok) {
        throw new Error("USER_NOT_FOUND");
      }
      
      const data = await res.json();
      const profile = data.item;
      
      if (!profile) {
        throw new Error("USER_NOT_FOUND");
      }
      
      // Verify profile is public and recentlyPlayed is public
      const isProfilePublic = profile.privacySettings?.profile === true;
      const isRecentlyPlayedPublic = profile.privacySettings?.recentlyPlayed === true;
      
      if (!isProfilePublic || !isRecentlyPlayedPublic) {
        throw new Error("PROFILE_PRIVATE");
      }
      
      const u: SpotifyUser = {
        id: profile.id,
        display_name: profile.displayName || profile.customId || profile.id,
        images: profile.image ? [{ url: profile.image }] : [],
        customId: profile.customId
      };
      
      localStorage.setItem("statsfm_user", JSON.stringify(u));
      setUser(u);
      setToken("statsfm");
      void dbOperations.saveStatsFmProfile(u).catch((saveError) => {
        console.error("Failed to persist stats.fm profile:", saveError);
      });
    } catch (err: any) {
      console.error("Stats.fm connection error:", err);
      if (err.message === "USER_NOT_FOUND") {
        setLoginError("Stats.fm profile not found. Please verify your username or ID.");
      } else if (err.message === "PROFILE_PRIVATE") {
        setLoginError("Your stats.fm profile or recently played list is private. Please make them public in your stats.fm settings.");
      } else {
        setLoginError("Could not connect to stats.fm. Check your connection and try again.");
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const checkRecentlyPlayed = useCallback(async (force = false) => {
    if (!user) return;

    // Cooldown check (15 minutes)
    const storageKey = `arianator_last_sync_${user.id}`;
    let lastSyncTime = 0;
    if (typeof window !== "undefined") {
      const storedLastSync = localStorage.getItem(storageKey);
      lastSyncTime = storedLastSync ? parseInt(storedLastSync, 10) : 0;
    }

    const now = Date.now();
    const timeSinceLastSync = now - lastSyncTime;
    
    if (!force && timeSinceLastSync < 900000) {
      try {
        const initialThermometer = await loadUserDailyStreams(user.id, false);
        setThermometer(initialThermometer);
        if (lastSyncTime > 0) {
          setLastSyncedTime(new Date(lastSyncTime));
        }
      } catch (e) {
        console.error("Error loading daily streams during cooldown:", e);
      }
      return;
    }

    setSyncStatus("syncing");
    try {
      const result = await dbOperations.syncStatsFmUser(user.id);

      if (result?.metadata) {
        const metadataKey = "arianator_track_metadata";
        const storedMetadataStr = localStorage.getItem(metadataKey) || "{}";
        const storedMetadata = JSON.parse(storedMetadataStr);
        localStorage.setItem(metadataKey, JSON.stringify({ ...storedMetadata, ...result.metadata }));
      }

      const initialThermometer = await loadUserDailyStreams(user.id, true);
      setThermometer(initialThermometer);
      window.dispatchEvent(new Event("storage_admin_update"));

      if (typeof window !== "undefined") {
        localStorage.setItem(storageKey, Date.now().toString());
      }
      setLastSyncedTime(new Date());
      setSyncStatus("success");
      setTimeout(() => setSyncStatus("idle"), 3000);
    } catch (error) {
      console.error("Error checking recently played tracks:", error);
      setSyncStatus("error");
      setTimeout(() => setSyncStatus("idle"), 3000);
    }
  }, [user, loadUserDailyStreams]);

  const checkRecentlyPlayedRef = useRef(checkRecentlyPlayed);
  useEffect(() => {
    checkRecentlyPlayedRef.current = checkRecentlyPlayed;
  }, [checkRecentlyPlayed]);

  // Periodically check recently played (every 15 minutes)
  useEffect(() => {
    if (user) {
      checkRecentlyPlayedRef.current();
      checkInterval.current = setInterval(() => {
        checkRecentlyPlayedRef.current();
      }, 900000);
    }

    return () => {
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
      }
    };
  }, [user?.id]);

  return (
    <SpotifyContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        checkRecentlyPlayed,
        thermometer,
        syncStatus,
        lastSyncedTime,
        focusTracks,
        setFocusTracks,
        loginError,
        setLoginError,
        isDemoMode: dbOperations.isDemoMode,
        isAdmin,
      }}
    >
      {children}
    </SpotifyContext.Provider>
  );
}

export function useSpotify() {
  const context = useContext(SpotifyContext);
  if (context === undefined) {
    throw new Error("useSpotify must be used within a SpotifyProvider");
  }
  return context;
}

