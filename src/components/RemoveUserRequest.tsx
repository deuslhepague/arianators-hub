"use client";

import React, { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { useSpotify } from "@/context/SpotifyContext";
import { dbOperations } from "@/lib/firebase";
import { Trash2, AlertCircle, CheckCircle, LogIn } from "lucide-react";

export default function RemoveUserRequest() {
  const { language } = useLanguage();
  const { theme } = useTheme();
  const { user, login } = useSpotify();

  const [spotifyId, setSpotifyId] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<boolean>(false);

  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spotifyId.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(false);

    try {
      const cleanId = spotifyId.trim();
      // Submit deletion request using the entered Spotify ID
      await dbOperations.requestUserDeletion(cleanId, cleanId);
      
      setSuccessMsg(true);
      setSpotifyId("");
    } catch (err) {
      console.error(err);
      setErrorMsg(
        language === "pt"
          ? "erro ao registrar solicitação. tente novamente."
          : "error submitting request. please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLoggedInSubmit = async () => {
    if (!user) return;
    
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(false);

    try {
      await dbOperations.requestUserDeletion(user.id, user.display_name);
      setSuccessMsg(true);
    } catch (err) {
      console.error(err);
      setErrorMsg(
        language === "pt"
          ? "erro ao registrar solicitação. tente novamente."
          : "error submitting request. please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`glass-panel p-8 max-w-md mx-auto text-floral-fg animate-fade-in ${theme === "light" ? "bg-white border-neutral-200" : "bg-wine border-panel-border"}`}>
      <div className="flex flex-col items-center text-center">
        <div className="p-3 bg-red-950/20 border border-red-900 text-red-500 rounded-full mb-5">
          <Trash2 className="w-8 h-8" />
        </div>
        
        <h3 className="font-serif text-2xl text-rose mb-3 uppercase tracking-wider">
          {language === "pt" ? "remover meus dados" : "request data removal"}
        </h3>
        
        <p className="text-xs text-neutral-400 leading-relaxed mb-6">
          {language === "pt"
            ? "se você deseja que todos os seus registros de streaming e pontuações no leaderboard sejam removidos do site, solicite a exclusão abaixo. sua solicitação será revisada pelos administradores."
            : "if you wish to have all your streaming stats and leaderboard entries removed from the site, submit a removal request below. your request will be reviewed by administrators."}
        </p>

        {successMsg && (
          <div className="w-full mb-6 p-4 rounded text-left bg-emerald-950/40 border border-emerald-900 text-emerald-400 text-xs flex gap-2.5 items-start leading-relaxed">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block mb-0.5">
                {language === "pt" ? "solicitação enviada!" : "request submitted!"}
              </strong>
              {language === "pt"
                ? "sua solicitação de exclusão de dados foi registrada e está aguardando revisão dos administradores."
                : "your data deletion request has been registered and is currently pending review by the administrators."}
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="w-full mb-6 p-4 rounded text-left bg-red-950/40 border border-red-900 text-red-400 text-xs flex gap-2.5 items-start leading-relaxed">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block mb-0.5">
                {language === "pt" ? "erro na solicitação" : "request error"}
              </strong>
              {errorMsg}
            </div>
          </div>
        )}

        {user ? (
          // Logged in flow
          <div className={`w-full p-6 border rounded-lg text-center ${theme === "light" ? "bg-neutral-50 border-neutral-200" : "bg-neutral-900/60 border-neutral-800"}`}>
            <p className="text-xs text-neutral-400 mb-2">
              {language === "pt" ? "conectado como:" : "connected as:"}
            </p>
            <p className="text-sm font-bold text-rose mb-5">
              {user.display_name} <span className="font-mono text-xs text-neutral-500">({user.id})</span>
            </p>
            
            <button
              onClick={handleLoggedInSubmit}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-rose hover:bg-rose-dark disabled:opacity-50 text-floral-bg font-extrabold text-xs uppercase tracking-wider transition-colors cursor-pointer border border-rose"
            >
              {loading 
                ? (language === "pt" ? "processando..." : "processing...") 
                : (language === "pt" ? "excluir meus dados" : "delete my data")}
            </button>
          </div>
        ) : (
          // Not logged in flow
          <div className="w-full space-y-6">
            <div className={`p-4 border rounded-lg text-center ${theme === "light" ? "bg-neutral-50 border-neutral-200" : "bg-neutral-900/60 border-neutral-800"}`}>
              <p className="text-xs text-neutral-400 mb-3 leading-relaxed">
                {language === "pt"
                  ? "para uma solicitação instantânea e segura, conecte-se com sua conta do Spotify antes."
                  : "for an instant and secure request, connect your Spotify account first."}
              </p>
              <button
                onClick={login}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-650 hover:bg-green-700 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer rounded"
              >
                <LogIn className="w-4 h-4" />
                {language === "pt" ? "entrar com spotify" : "login with spotify"}
              </button>
            </div>

            <div className="flex items-center my-4">
              <div className="flex-1 border-t border-neutral-850"></div>
              <span className="px-3 text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                {language === "pt" ? "ou digite manualmente" : "or enter manually"}
              </span>
              <div className="flex-1 border-t border-neutral-850"></div>
            </div>

            <form onSubmit={handleSubmitManual} className="w-full space-y-4">
              <div className="text-left">
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5 ml-1">
                  {language === "pt" ? "usuário ou ID do spotify" : "spotify username or ID"}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. your_spotify_id"
                  value={spotifyId}
                  onChange={(e) => setSpotifyId(e.target.value)}
                  className={`w-full px-4 py-3 border rounded text-xs focus:outline-none focus:border-rose text-center font-mono ${theme === "light" ? "bg-neutral-50 border-neutral-300 text-neutral-900" : "bg-neutral-900 border-neutral-800 text-white"}`}
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !spotifyId.trim()}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-rose hover:bg-rose-dark disabled:opacity-50 text-floral-bg font-extrabold text-xs uppercase tracking-wider transition-colors cursor-pointer border border-rose"
              >
                {loading 
                  ? (language === "pt" ? "processando..." : "processing...") 
                  : (language === "pt" ? "solicitar remoção" : "submit request")}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
