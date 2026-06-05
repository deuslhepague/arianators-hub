import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";

type JsonRecord = Record<string, any>;

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
  fanbaseStreams: number;
  pendingStreams: number;
  isPending: boolean;
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let app;
let db: ReturnType<typeof getFirestore> | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
} else {
  console.warn("Firebase credentials not found. Firebase operations will fail until env vars are configured.");
}

function getCycleDate(): string {
  return new Date().toISOString().split("T")[0];
}

function getAdminSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("arianator_admin_token");
}

function getAdminAuthHeaders(): Record<string, string> {
  const token = getAdminSessionToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function postJson(path: string, body: JsonRecord, headers: JsonRecord = {}) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Request failed for ${path}`);
  }

  return response.json();
}

async function patchJson(path: string, body: JsonRecord, headers: JsonRecord = {}) {
  const response = await fetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Request failed for ${path}`);
  }

  return response.json();
}

async function deleteJson(path: string, body: JsonRecord = {}, headers: JsonRecord = {}) {
  const response = await fetch(path, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Request failed for ${path}`);
  }

  return response.json();
}

function cleanTrackTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/\[.*?\]/g, "")
    .replace(/\s*-\s*(sped up|slowed|acapella|instrumental|remix|acoustic|radio edit|edit|live|version).*/i, "")
    .trim();
}

async function saveUserStreamToFirestore(
  userId: string,
  displayName: string,
  avatarUrl: string,
  trackId: string,
  count: number,
) {
  if (!db) {
    throw new Error("Firebase not configured");
  }

  const today = getCycleDate();
  const userRef = doc(db, "users", userId);

  await setDoc(userRef, {
    userId,
    displayName,
    avatarUrl,
    totalStreams: increment(count),
    lastActive: new Date().toISOString(),
  }, { merge: true });

  const dailyRef = doc(db, "users", userId, "dailyStreams", today);
  const dailySnap = await getDoc(dailyRef);

  if (dailySnap.exists()) {
    await updateDoc(dailyRef, {
      [trackId]: increment(count),
      total: increment(count),
      lastUpdated: new Date().toISOString(),
    });
  } else {
    await setDoc(dailyRef, {
      [trackId]: count,
      total: count,
      date: today,
      lastUpdated: new Date().toISOString(),
    });
  }

  const leaderboardRef = doc(db, "leaderboard", `${today}_${userId}`);
  await setDoc(leaderboardRef, {
    userId,
    displayName,
    avatarUrl,
    streamsToday: increment(count),
    date: today,
    lastUpdated: new Date().toISOString(),
  }, { merge: true });
}

export const dbOperations = {
  isDemoMode: !isFirebaseConfigured,

  async trackUserStream(userId: string, displayName: string, avatarUrl: string, trackId: string, count: number = 1) {
    if (!userId) return;
    await saveUserStreamToFirestore(userId, displayName, avatarUrl, trackId, count);
  },

  async saveStatsFmProfile(profile: any) {
    // Deprecated - handled by OAuth callback
    return null;
  },

  async syncStatsFmUser(userId: string) {
    if (!userId) return null;
    return postJson("/api/spotify-sync", { userId });
  },

  async getUserDailyStreams(userId: string) {
    if (!userId) return {};
    const response = await fetch(`/api/spotify-users?userId=${encodeURIComponent(userId)}`);
    if (!response.ok) {
      throw new Error("Failed to load user daily streams");
    }
    const data = await response.json();
    return data.streams || {};
  },

  async getLeaderboard(limitCount: number = 20, date?: string, bypass = false): Promise<LeaderboardUser[]> {
    const qs = date ? `?date=${encodeURIComponent(date)}` : "";
    const bypassStr = bypass ? (qs ? "&bypass=true" : "?bypass=true") : "";
    const response = await fetch(`/api/leaderboard${qs}${bypassStr}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Failed to load leaderboard");
    }

    const data = await response.json();
    const list = data.users || [];
    return list.slice(0, limitCount);
  },

  async trackArianaSongStream(trackId: string, trackName: string, coverUrl: string, count: number) {
    await postJson("/api/song-streams", { trackId, trackName, coverUrl, count });
  },

  async getSongLeaderboard(date?: string, bypass = false): Promise<LeaderboardSong[]> {
    const qs = date ? `?date=${encodeURIComponent(date)}` : "";
    const bypassStr = bypass ? (qs ? "&bypass=true" : "?bypass=true") : "";
    const response = await fetch(`/api/song-streams${qs}${bypassStr}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Failed to load song leaderboard");
    }

    const data = await response.json();
    return data.songs || [];
  },

  async getPendingValidations(): Promise<any[]> {
    const response = await fetch("/api/song-streams?view=pending", {
      headers: getAdminAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Failed to load pending validations");
    }

    const data = await response.json();
    return data.requests || [];
  },

  async resolvePendingValidation(trackId: string, action: "merge" | "create" | "reject", targetSongId?: string) {
    await patchJson("/api/song-streams", { trackId, action, targetSongId }, getAdminAuthHeaders());
  },

  async clearSimulatedPlays() {
    await deleteJson("/api/song-streams", {}, getAdminAuthHeaders());
  },

  async requestUserDeletion(userId: string, displayName: string) {
    if (!userId) return;
    await postJson("/api/deletion-requests", { userId, displayName });
  },

  async getPendingDeletions() {
    const response = await fetch("/api/deletion-requests", { headers: getAdminAuthHeaders() });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Failed to fetch pending deletions");
    }

    const data = await response.json();
    return data.requests || [];
  },

  async resolveUserDeletion(userId: string, action: "approve" | "reject") {
    await patchJson("/api/deletion-requests", { userId, action }, getAdminAuthHeaders());
  },

  async saveCatalog(tracks: any[], albums: any[]) {
    if (!isFirebaseConfigured) {
      throw new Error("Firebase not configured");
    }
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...getAdminAuthHeaders(),
    };
    if (!headers.Authorization) {
      throw new Error("Admin session not authenticated. Please log in.");
    }

    return postJson("/api/save-catalog", { tracks, albums }, headers);
  },

  async loadCatalog(): Promise<{ tracks: any[]; albums: any[] } | null> {
    if (!isFirebaseConfigured) {
      throw new Error("Firebase not configured");
    }

    const headers: Record<string, string> = getAdminAuthHeaders();
    if (!headers.Authorization) {
      throw new Error("Admin session not authenticated. Please log in.");
    }

    const response = await fetch("/api/load-catalog", { headers });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Failed to load catalog");
    }

    const data = await response.json();
    return data.success ? { tracks: data.tracks || [], albums: data.albums || [] } : null;
  },

  async saveHistoricalData(dateStr: string, snapshot: any) {
    if (!isFirebaseConfigured) {
      throw new Error("Firebase not configured");
    }
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...getAdminAuthHeaders(),
    };
    if (!headers.Authorization) {
      throw new Error("Admin session not authenticated. Please log in.");
    }

    return postJson("/api/historical-data", { dateStr, snapshot }, headers);
  },

  async getHistoricalData(dateStr: string): Promise<any | null> {
    if (!isFirebaseConfigured) {
      throw new Error("Firebase not configured");
    }
    const headers: Record<string, string> = getAdminAuthHeaders();
    if (!headers.Authorization) {
      throw new Error("Admin session not authenticated. Please log in.");
    }

    const response = await fetch(`/api/historical-data?date=${encodeURIComponent(dateStr)}`, { headers });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Failed to load historical data");
    }

    const data = await response.json();
    return data.data || null;
  },
};

export { db };
