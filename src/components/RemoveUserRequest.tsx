"use client";

import React, { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { dbOperations } from "@/lib/firebase";
import { Trash2, AlertCircle, CheckCircle } from "lucide-react";

export default function RemoveUserRequest() {
  const { language } = useLanguage();
  const { theme } = useTheme();

  const [statsId, setStatsId] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statsId.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(false);

    try {
      // 1. Fetch to verify stats.fm profile exists
      const res = await fetch(`https://api.stats.fm/api/v1/users/${statsId.trim()}`);
      if (!res.ok) {
        throw new Error("NOT_FOUND");
      }
      
      const data = await res.json();
      const profile = data.item;
      if (!profile) {
        throw new Error("NOT_FOUND");
      }

      // 2. Submit deletion request
      const displayName = profile.displayName || profile.customId || profile.id;
      await dbOperations.requestUserDeletion(profile.id, displayName);
      
      setSuccessMsg(true);
      setStatsId("");
    } catch (err) {
      console.error(err);
      setErrorMsg(
        language === "pt"
          ? "perfil do stats.fm não encontrado. verifique se digitou o ID/nome de usuário correto."
          : "stats.fm profile not found. please check if you entered the correct username or ID."
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
            ? "se você deseja que todos os seus registros de streaming e pontuações no leaderboard sejam removidos do site, insira seu ID ou usuário do stats.fm abaixo. sua solicitação será enviada aos administradores para aprovação."
            : "if you wish to have all your streaming stats and leaderboard entries removed from the site, enter your stats.fm ID or username below. your request will be sent to the administrators for approval."}
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

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div className="text-left">
            <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5 ml-1">
              {language === "pt" ? "usuário ou ID do stats.fm" : "stats.fm username or ID"}
            </label>
            <input
              type="text"
              required
              placeholder="e.g. arianator_ag8"
              value={statsId}
              onChange={(e) => setStatsId(e.target.value)}
              className={`w-full px-4 py-3 border rounded text-xs focus:outline-none focus:border-rose text-center font-mono ${theme === "light" ? "bg-neutral-50 border-neutral-300 text-neutral-900" : "bg-neutral-900 border-neutral-800 text-white"}`}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !statsId.trim()}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-rose hover:bg-rose-dark disabled:opacity-50 text-floral-bg font-extrabold text-xs uppercase tracking-wider transition-colors cursor-pointer border border-rose"
          >
            {loading 
              ? (language === "pt" ? "processando..." : "processing...") 
              : (language === "pt" ? "solicitar remoção" : "submit request")}
          </button>
        </form>
      </div>
    </div>
  );
}
