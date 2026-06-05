"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "en" | "pt";

type TranslationDict = {
  [key: string]: string;
};

const translations: Record<Language, TranslationDict> = {
  en: {
    // Utility and Brand
    "brand.subtitle": "spotify tracking dashboard",
    "theme.light": "light mode",
    "theme.dark": "dark mode",
    "auth.connect": "connect spotify",
    "auth.logout": "logout",
    "auth.connecting": "connecting...",
    "nav.streams": "streams",
    "nav.tracker": "tracker",
    "nav.generator": "generator",
    "nav.leaderboard": "leaderboard",
    "nav.guide": "guide",
    "nav.admin": "admin",
    "subtitle.tagline": "spotify tracking dashboard for arianators",

    // Admin Passcode Screen
    "admin.passcode_required": "admin access required",
    "admin.passcode_description": "please enter the administrator passcode to access configurations.",
    "admin.passcode_placeholder": "enter passcode...",
    "admin.unlock": "unlock panel",
    "admin.invalid_passcode": "invalid passcode. access denied.",

    // Leaderboard Tabs & Content
    "leaderboard.title": "leaderboard",
    "leaderboard.subtitle": "daily streaming contributions and track rankings",
    "leaderboard.fans": "fans ranking",
    "leaderboard.songs": "songs ranking",
    "leaderboard.fanbase_total": "fanbase total",
    "leaderboard.active_fans": "active fans",
    "leaderboard.streams": "streams",
    "leaderboard.empty": "no stream data tracked today.",
    "leaderboard.updates": "updates in real-time as users stream ariana tracks",
    "leaderboard.you": "(you)",
    "leaderboard.rank": "rank",

    // Thermometer
    "thermometer.title": "play thermometer",
    "thermometer.subtitle": "your absolute daily streams per song version",
    "thermometer.plays": "plays",
    "thermometer.guideline": "recommended daily target: keep plays under 20 per song version to ensure they count towards the global charts.",
    "thermometer.limit_reached": "version limit hit! stream another version to keep supporting.",
    "thermometer.warning": "important: do not loop a single version on repeat. alternate between versions and other artists to bypass spam filters.",

    // Playlist Generator
    "generator.title": "smart playlist generator",
    "generator.subtitle": "create optimized filler playlists to maximize charts",
    "generator.tab1": "focus track",
    "generator.tab2": "hits (database)",
    "generator.tab3": "interludes (others)",
    "generator.tab4": "short tracks",
    "generator.target": "target focus track",
    "generator.select_target": "select focus track",
    "generator.select_hits": "select hits & counts",
    "generator.select_interludes": "select filler interludes",
    "generator.select_shorts": "select short focus tracks",
    "generator.generate": "generate & export to spotify",
    "generator.duration": "estimated duration",
    "generator.tracks_count": "tracks count",
    "generator.playlist_success": "playlist generated successfully! redirecting to spotify...",

    // Songs detail and streams view
    "streams.title": "focus track target tracking",
    "streams.subtitle": "latest official statistics for focus tracks",
    "streams.milestone": "milestone",
    "streams.daily_gain": "daily gain",
    "streams.avg_daily": "avg daily",
    "streams.days_remaining": "days remaining",
    "streams.days": "days",
    "streams.listen": "listen now",
    "streams.close": "close details",
    "streams.details_title": "track statistics detail",
    "streams.album_title": "albums tracker",
    "streams.album_subtitle": "album streaming totals"
  },
  pt: {
    // Utility and Brand
    "brand.subtitle": "painel de rastreamento de streams",
    "theme.light": "modo claro",
    "theme.dark": "modo escuro",
    "auth.connect": "conectar spotify",
    "auth.logout": "sair",
    "auth.connecting": "conectando...",
    "nav.streams": "músicas",
    "nav.tracker": "termômetro",
    "nav.generator": "gerador",
    "nav.leaderboard": "ranking",
    "nav.guide": "guia",
    "nav.admin": "admin",
    "subtitle.tagline": "painel de rastreamento de streams para arianators",

    // Admin Passcode Screen
    "admin.passcode_required": "acesso administrador necessário",
    "admin.passcode_description": "por favor, insira a senha do administrador para acessar as configurações.",
    "admin.passcode_placeholder": "digite a senha...",
    "admin.unlock": "desbloquear painel",
    "admin.invalid_passcode": "senha inválida. acesso negado.",

    // Leaderboard Tabs & Content
    "leaderboard.title": "ranking geral",
    "leaderboard.subtitle": "contribuições diárias de streaming e ranking de músicas",
    "leaderboard.fans": "ranking de fãs",
    "leaderboard.songs": "ranking de músicas",
    "leaderboard.fanbase_total": "total da fanbase",
    "leaderboard.active_fans": "fãs ativos",
    "leaderboard.streams": "streams",
    "leaderboard.empty": "nenhum stream registrado hoje.",
    "leaderboard.updates": "atualizações em tempo real conforme a fanbase ouve faixas da ariana",
    "leaderboard.you": "(você)",
    "leaderboard.rank": "posição",

    // Thermometer
    "thermometer.title": "termômetro de plays",
    "thermometer.subtitle": "seus streams diários absolutos por versão da música",
    "thermometer.plays": "reproduções",
    "thermometer.guideline": "meta diária recomendada: mantenha os plays abaixo de 20 por versão da música para garantir que contem para os charts globais.",
    "thermometer.limit_reached": "limite de versão atingido! ouça outra versão para continuar apoiando.",
    "thermometer.warning": "importante: não repita uma única versão em loop. alterne entre versões e outros artistas para evitar filtros de spam.",

    // Playlist Generator
    "generator.title": "gerador de playlist inteligente",
    "generator.subtitle": "crie playlists otimizadas com fillers para maximizar os charts",
    "generator.tab1": "música principal",
    "generator.tab2": "hits (banco de dados)",
    "generator.tab3": "interlúdios (outros artistas)",
    "generator.tab4": "músicas curtas",
    "generator.target": "escolher música principal",
    "generator.select_target": "selecione a música principal",
    "generator.select_hits": "selecione os hits e repetições",
    "generator.select_interludes": "selecione os interlúdios",
    "generator.select_shorts": "selecione músicas curtas de apoio",
    "generator.generate": "gerar e exportar para o spotify",
    "generator.duration": "duração estimada",
    "generator.tracks_count": "total de faixas",
    "generator.playlist_success": "playlist gerada com sucesso! redirecionando para o spotify...",

    // Songs detail and streams view
    "streams.title": "metas das faixas principais",
    "streams.subtitle": "estatísticas oficiais mais recentes para faixas principais",
    "streams.milestone": "meta",
    "streams.daily_gain": "ganho diário",
    "streams.avg_daily": "média diária",
    "streams.days_remaining": "dias restantes",
    "streams.days": "dias",
    "streams.listen": "ouvir no spotify",
    "streams.close": "fechar detalhes",
    "streams.details_title": "detalhes estatísticos da faixa",
    "streams.album_title": "rastreador de álbuns",
    "streams.album_subtitle": "totais de reproduções de álbuns"
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("arianator_language") as Language;
      if (stored === "en" || stored === "pt") {
        setLanguageState(stored);
      } else {
        const browserLang = navigator.language || "";
        if (browserLang.toLowerCase().startsWith("pt")) {
          setLanguageState("pt");
        } else {
          setLanguageState("en");
        }
      }
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("arianator_language", lang);
    }
  };

  const t = (key: string): string => {
    return translations[language][key] || translations["en"][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
