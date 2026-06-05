"use client";

import React from "react";
import { useSpotify } from "@/context/SpotifyContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { extractTrackId } from "@/lib/playlist";
import { Flame, RefreshCw, CheckCircle2, AlertTriangle, Play, Info, Cloud } from "lucide-react";

export default function PlayThermometer() {
  const {
    user,
    token,
    login,
    thermometer,
    checkRecentlyPlayed,
    syncStatus,
    lastSyncedTime,
    focusTracks,
    isLoading,
    loginError,
    isDemoMode,
    isAdmin
  } = useSpotify();

  const { language, t } = useLanguage();
  const { theme } = useTheme();
  const lt = theme === "light";

  const [statsFmIdInput, setStatsFmIdInput] = React.useState("");
  const [connecting, setConnecting] = React.useState(false);
  const [catalogTracks, setCatalogTracks] = React.useState<any[]>([]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statsFmIdInput.trim()) return;
    setConnecting(true);
    try {
      await login(statsFmIdInput.trim());
    } catch (_) {
    } finally {
      setConnecting(false);
    }
  };

  React.useEffect(() => {
    const loadCatalog = async () => {
      try {
        const response = await fetch("/api/catalog");
        if (!response.ok) {
          throw new Error("Failed to load catalog");
        }

        const data = await response.json();
        setCatalogTracks(data.tracks || []);
      } catch (error) {
        console.error("Failed to load catalog for thermometer:", error);
        setCatalogTracks([]);
      }
    };

    void loadCatalog();
  }, []);

  const getLocalizedVersion = (trackId: string, focusIndex?: number) => {
    const matchedTrack = catalogTracks.find((t: any) =>
      t.spotifyTrackId === trackId || (t.alternativeIds || []).includes(trackId)
    );

    if (matchedTrack) {
      const isMain = matchedTrack.spotifyTrackId === trackId;
      return {
        name: isMain ? matchedTrack.title : `${matchedTrack.title} (Version ${focusIndex !== undefined ? focusIndex + 1 : 1})`,
        desc: `ID: ${trackId}`,
        coverUrl: matchedTrack.coverUrl || "/petal.jpg"
      };
    }

    // Check if we have cached metadata from recent plays
    if (typeof window !== "undefined") {
      const storedMetaStr = localStorage.getItem("arianator_track_metadata");
      if (storedMetaStr) {
        try {
          const storedMeta = JSON.parse(storedMetaStr);
          if (storedMeta[trackId]) {
            return {
              name: storedMeta[trackId].name,
              desc: `ID: ${trackId}`,
              coverUrl: storedMeta[trackId].coverUrl || "/petal.jpg"
            };
          }
        } catch (_) { }
      }
    }

    if (focusIndex !== undefined) {
      const labels = [
        { name: "we can't be friends (eternal sunshine)", desc: "eternal sunshine standard album" },
        { name: "we can't be friends (eternal sunshine - slightly deluxe)", desc: "slightly deluxe album release" },
        { name: "we can't be friends (eternal sunshine - signature edition)", desc: "signature vinyl/cd edition" },
        { name: "we can't be friends (wait for your love - single bundle)", desc: "individual single bundle release" },
        { name: "we can't be friends (wait for your love - compilation)", desc: "compilation track release" }
      ];
      if (labels[focusIndex]) {
        return {
          name: labels[focusIndex].name,
          desc: `ID: ${trackId}`,
          coverUrl: "/petal.jpg"
        };
      }
      return {
        name: language === "pt" ? `faixa foco (versão ${focusIndex + 1})` : `focus track (version ${focusIndex + 1})`,
        desc: `ID: ${trackId}`,
        coverUrl: "/petal.jpg"
      };
    }

    return {
      name: `Track: ${trackId}`,
      desc: `ID: ${trackId}`,
      coverUrl: "/petal.jpg"
    };
  };

  // If not logged in, show Stats.fm Connect CTA
  if (!user || !token) {
    return (
      <div className={`glass-panel p-8 text-center flex flex-col items-center justify-center min-h-[380px] animate-fade-in ${lt ? "bg-white border-neutral-200 text-neutral-800" : "text-floral-fg"}`}>
        <Flame className="w-14 h-14 text-rose mb-5 animate-pulse" />
        <h3 className="font-serif text-2xl text-rose mb-3 uppercase tracking-wider">
          {language === "pt" ? "desbloquear termômetro de plays" : "unlock play thermometer"}
        </h3>
        <p className={`text-sm max-w-md mb-6 leading-relaxed ${lt ? "text-neutral-600" : "text-neutral-400"}`}>
          {language === "pt"
            ? "informe seu usuário do stats.fm (ex: arianator_ag8 ou seu username customizado) para sincronizar seu histórico recente do spotify. certifique-se de que seu perfil e histórico de streams no stats.fm estejam configurados como públicos!"
            : "enter your stats.fm username or ID (e.g., arianator_ag8 or your custom username) to sync your recent spotify play history. make sure your stats.fm profile and streams are set to public!"}
        </p>
        <form onSubmit={handleConnect} className="w-full max-w-sm flex flex-col gap-3">
          <input
            type="text"
            required
            placeholder={language === "pt" ? "usuário ou ID do stats.fm" : "stats.fm username or ID"}
            value={statsFmIdInput}
            onChange={(e) => setStatsFmIdInput(e.target.value)}
            className={`w-full px-4 py-3 border rounded text-sm focus:outline-none focus:border-rose text-center font-mono ${lt ? "bg-neutral-50 border-neutral-200 text-neutral-900" : "bg-neutral-900 border-neutral-800 text-white"}`}
            disabled={isLoading || connecting}
          />
          {loginError && (
            <div className="text-xs text-red-400 bg-red-950/40 border border-red-900 p-2.5 rounded text-left leading-relaxed">
              ⚠️ {loginError}
            </div>
          )}
          <button
            type="submit"
            disabled={isLoading || connecting || !statsFmIdInput.trim()}
            className={`w-full flex items-center justify-center gap-2.5 px-6 py-3.5 font-bold text-sm tracking-wider uppercase transition-all duration-300 cursor-pointer border ${lt ? "bg-black text-white hover:bg-neutral-800 border-black" : "bg-white text-black hover:bg-neutral-200 border-neutral-850"}`}
          >
            <Play className="fill-current w-4 h-4" />
            {isLoading || connecting
              ? (language === "pt" ? "conectando..." : "connecting...")
              : (language === "pt" ? "conectar perfil" : "connect profile")}
          </button>
        </form>
      </div>
    );
  }

  // Determine list of all tracks to render (only showing tracks that have plays > 0 today)
  const focusTrackIdsList = focusTracks.map(extractTrackId);
  const otherTrackIds = Object.keys(thermometer).filter(id => !focusTrackIdsList.includes(id));
  const allTrackIdsToRender = [
    ...focusTrackIdsList.map((id, index) => ({ id, focusIndex: index })),
    ...otherTrackIds.map(id => ({ id, focusIndex: undefined }))
  ]
    .filter(item => item.focusIndex !== undefined || (thermometer[item.id] || 0) > 0)
    .sort((a, b) => (thermometer[b.id] || 0) - (thermometer[a.id] || 0));

  return (
    <div className={`glass-panel p-6 lg:p-10 animate-fade-in flex flex-col justify-between h-full ${lt ? "bg-white border-neutral-200 text-neutral-800" : "text-floral-fg"}`}>
      <div>
        <div className={`flex items-center justify-between gap-4 border-b pb-4 mb-6 ${lt ? "border-neutral-200" : "border-panel-border"}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded border ${lt ? "bg-neutral-50 border-neutral-200 text-rose" : "bg-neutral-900 border-neutral-800 text-white"}`}>
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <h3 className={`font-bold text-xl md:text-2xl tracking-wider uppercase ${lt ? "text-neutral-950" : "text-white"}`}>
                {t("thermometer.title")}
              </h3>
              <p className={`text-xs ${lt ? "text-neutral-500" : "text-neutral-400"}`}>
                {language === "pt" ? "contador diário de streams da fanbase ativa" : "daily tracks stream counter for active fanbase plays"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Cloud Sync Database Badge */}
            <span className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${isDemoMode ? (lt ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-amber-950/60 text-amber-400 border border-amber-900") : (lt ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-emerald-950/60 text-emerald-400 border border-emerald-900")}`}>
              <Cloud className="w-3.5 h-3.5" />
              {isDemoMode ? (language === "pt" ? "banco local" : "local storage") : (language === "pt" ? "nuvem" : "cloud synced")}
            </span>

            {isAdmin && (
              <button
                onClick={() => checkRecentlyPlayed(true)}
                disabled={syncStatus === "syncing"}
                className={`flex items-center gap-2 px-4 py-2 border text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer ${lt ? "bg-neutral-50 border-neutral-200 hover:border-black text-neutral-800" : "bg-neutral-900 border-neutral-800 hover:border-white text-white"}`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === "syncing" ? "animate-spin" : ""}`} />
                {syncStatus === "syncing" ? (language === "pt" ? "sincronizando..." : "syncing...") : (language === "pt" ? "sincronizar" : "sync plays")}
              </button>
            )}
          </div>
        </div>

        {/* Sync Status / Info */}
        <div className={`flex items-center justify-between text-xs mb-6 p-3 border rounded font-mono ${lt ? "bg-neutral-50 border-neutral-200 text-neutral-600" : "bg-wine-deep border-panel-border text-neutral-450"}`}>
          <span>
            {language === "pt" ? "status: " : "status: "}
            {syncStatus === "success" ? (
              <span className="text-rose font-bold">{language === "pt" ? "atualizado!" : "updated!"}</span>
            ) : syncStatus === "error" ? (
              <span className="text-red-400 font-bold">{language === "pt" ? "erro ao sincronizar" : "sync error"}</span>
            ) : (
              (language === "pt" ? "auto-sincronia ativa" : "auto-sync active")
            )}
          </span>
          <span>
            {lastSyncedTime
              ? `${language === "pt" ? "última verificação: " : "last checked: "}${lastSyncedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
              : (language === "pt" ? "não sincronizado" : "not synced yet")
            }
          </span>
        </div>

        {/* Info Box */}
        <div className={`mb-6 p-4 border rounded flex gap-3 text-xs md:text-sm leading-relaxed ${lt ? "bg-neutral-50 border-neutral-200 text-neutral-750" : "bg-wine-dark/40 border-panel-border text-neutral-300"}`}>
          <Info className="w-5 h-5 text-rose flex-shrink-0 mt-0.5" />
          <div>
            {t("thermometer.guideline")}
          </div>
        </div>

        {/* Mobile Database Status (smaller screens) */}
        <div className="md:hidden mb-4 flex justify-end">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider ${isDemoMode ? (lt ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-amber-950/60 text-amber-400 border border-amber-900") : (lt ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-emerald-950/60 text-emerald-400 border border-emerald-900")}`}>
            <Cloud className="w-3 h-3" />
            {isDemoMode ? (language === "pt" ? "banco local" : "local storage") : (language === "pt" ? "banco nuvem" : "cloud synced")}
          </span>
        </div>

        {/* Thermometers Grid */}
        <div className="space-y-5">
          {allTrackIdsToRender.length === 0 ? (
            <div className={`text-center py-12 border border-dashed rounded font-serif text-sm ${lt ? "bg-neutral-50/50 border-neutral-200 text-neutral-500" : "bg-neutral-950/40 border-neutral-900 text-neutral-400"}`}>
              {language === "pt"
                ? "nenhuma reprodução de ariana grande registrada hoje. comece a ouvir no spotify!"
                : "no ariana grande streams registered today. start listening on spotify!"}
            </div>
          ) : (
            allTrackIdsToRender.map((item) => {
              const count = thermometer[item.id] || 0;
              const percentage = Math.min((count / 20) * 100, 100);

              const version = getLocalizedVersion(item.id, item.focusIndex);

              // Status colors
              let progressBg = "bg-rose";
              let statusColor = lt ? "text-neutral-500" : "text-neutral-450";

              if (count >= 20) {
                progressBg = "bg-emerald-500";
                statusColor = "text-emerald-600 dark:text-emerald-400 font-bold";
              } else if (count >= 10) {
                progressBg = "bg-amber-500";
                statusColor = "text-amber-600 dark:text-amber-500 font-bold";
              } else if (count > 0) {
                statusColor = "text-rose";
              }

              return (
                <div key={item.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm md:text-base">
                    <div className="flex items-center gap-3">
                      <img
                        src={version.coverUrl}
                        alt={version.name}
                        className={`w-10 h-10 rounded object-cover border ${lt ? "border-neutral-200" : "border-panel-border"}`}
                      />
                      <div>
                        <span className={`font-semibold block ${lt ? "text-neutral-950" : "text-white"}`}>{version.name}</span>
                        <span className={`text-[10px] font-mono block mt-0.5 ${lt ? "text-neutral-450" : "text-neutral-500"}`}>{version.desc}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs md:text-sm font-bold block ${statusColor}`}>{count}/20</span>
                      <span className={`text-[10px] block uppercase tracking-wider mt-0.5 ${lt ? "text-neutral-400" : "text-neutral-500"}`}>
                        {language === "pt" ? "reproduções hoje" : "plays today"}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar container */}
                  <div className={`w-full rounded h-2.5 overflow-hidden border ${lt ? "bg-neutral-100 border-neutral-200" : "bg-wine-deep border-panel-border"}`}>
                    <div
                      className={`h-full rounded transition-all duration-500 ease-out ${progressBg}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  {count >= 20 && (
                    <div className="text-[11px] text-emerald-500 flex items-center gap-1.5 font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {language === "pt"
                        ? `meta diária ideal alcançada! (+${count - 20} streams adicionais contados)`
                        : `optimal daily target reached! (+${count - 20} extra streams counted)`}
                    </div>
                  )}
                  {count < 20 && count >= 10 && (
                    <div className="text-[11px] text-amber-500 flex items-center gap-1.5 font-mono">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {language === "pt"
                        ? "metade do caminho alcançado! continue ouvindo esta versão."
                        : "half way there! keep playing this version."}
                    </div>
                  )}
                  {count > 0 && count < 10 && (
                    <div className="text-[11px] text-rose flex items-center gap-1.5 font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5 text-rose/80" />
                      {language === "pt" ? "reproduções registrada hoje" : "streams registered today"}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className={`border-t mt-6 pt-4 text-xs leading-relaxed font-mono ${lt ? "border-neutral-200 text-neutral-500" : "border-panel-border text-neutral-400"}`}>
        💡 <strong>{language === "pt" ? "como funciona a sincronização?" : "how does it sync?"}</strong>{" "}
        {language === "pt"
          ? "nossos servidores sincronizam as reproduções de todos os usuários cadastrados diretamente com o stats.fm em segundo plano de forma automática!"
          : "our servers automatically synchronize play histories for all registered users in the background using stats.fm integration!"}
      </div>
    </div>
  );
}
