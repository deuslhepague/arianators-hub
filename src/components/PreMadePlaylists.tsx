"use client";

import React from "react";
import { Clock, Heart, ExternalLink, Info } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";

interface PreMadePlaylist {
  id: string;
  title: string;
  descriptionPt: string;
  descriptionEn: string;
  duration: string;
  tracksCount: number;
  spotifyUrl: string;
  category: "Focus" | "Sleep" | "Hits";
}

const PREMADE_PLAYLISTS: PreMadePlaylist[] = [
  {
    id: "road-to-1b",
    title: "road to 1 billion",
    descriptionEn: "ariana 300x + short songs from other people 100x. optimized playlist for maximum focus streams.",
    descriptionPt: "ariana 300x + músicas curtas de outras pessoas 100x. playlist otimizada para máximo de streams focados.",
    duration: "14h 21m",
    tracksCount: 400,
    spotifyUrl: "https://open.spotify.com/playlist/0ftRprrN0bgVYHOa3IcNyt",
    category: "Focus"
  },
  {
    id: "barely-tried",
    title: "cause i barely tried",
    descriptionEn: "hate that i made you love me 120x + short ariana songs 60x + short songs from other people 60x.",
    descriptionPt: "hate that i made you love me 120x + músicas curtas da ariana 60x + músicas curtas de outras pessoas 60x.",
    duration: "9h 18m",
    tracksCount: 240,
    spotifyUrl: "https://open.spotify.com/playlist/7e1k6Fu8lH8rEOn7Ahk0Rm",
    category: "Focus"
  },
  {
    id: "mixed-hits",
    title: "mixed",
    descriptionEn: "we can't be friends 20x + into you 20x + thank u, next 60x + positions 40x + no tears left to cry 40x + needy 20x. short songs from other people 100x.",
    descriptionPt: "we can't be friends 20x + into you 20x + thank u, next 60x + positions 40x + no tears left to cry 40x + needy 20x. músicas curtas de outras pessoas 100x.",
    duration: "14h 38m",
    tracksCount: 300,
    spotifyUrl: "https://open.spotify.com/playlist/2EXvlUi9kBYQF6QUvGlJUA",
    category: "Hits"
  },
];

export default function PreMadePlaylists() {
  const { language } = useLanguage();
  const { theme } = useTheme();
  const lt = theme === "light";

  const textMain = lt ? "text-neutral-950" : "text-white";
  const textSub = lt ? "text-neutral-600" : "text-neutral-400";
  const textMuted = lt ? "text-neutral-500" : "text-neutral-450";
  const border = lt ? "border-neutral-200" : "border-panel-border";
  const cardBg = lt ? "bg-white border-neutral-200 hover:border-black" : "bg-wine-dark/40 border-panel-border hover:border-white";
  const deepBg = lt ? "bg-neutral-50 border-neutral-200" : "bg-wine-deep border-panel-border";
  const iconBox = lt ? "bg-neutral-100 border-neutral-200 text-black" : "bg-neutral-900 border-neutral-800 text-white";
  const btnClass = lt
    ? "bg-black border-black hover:bg-neutral-800 text-white"
    : "bg-neutral-900 border-neutral-800 hover:border-white hover:bg-neutral-800 text-white";

  return (
    <section className="neobrutal-card p-6 lg:p-10 animate-fade-in" id="premade">
      <div className="border-b-2 border-foreground pb-6 mb-8">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-none border-2 border-foreground shadow-[2px_2px_0px_0px_var(--foreground)] ${iconBox}`}>
            <Heart className="w-8 h-8" />
          </div>
          <div>
            <h2 className={`text-2xl md:text-3xl font-bold tracking-wider uppercase ${textMain}`}>
              {language === "pt" ? "playlists da equipe do site" : "site team playlists"}
            </h2>
          </div>
        </div>
      </div>

      {/* Playlists Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        {PREMADE_PLAYLISTS.map((playlist) => (
          <div
            key={playlist.id}
            className="flex flex-col justify-between p-6 neobrutal-card transition-all duration-200 group"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className={`text-xs uppercase tracking-wider ${textMuted}`}>
                  {language === "pt" ? "playlist da equipe" : "team playlist"}
                </span>
                <div className={`flex items-center gap-1.5 text-xs ${textSub}`}>
                  <Clock className="w-3.5 h-3.5" />
                  {playlist.duration}
                </div>
              </div>

              <h3 className={`text-lg md:text-xl font-bold group-hover:underline mb-3 ${textMain}`}>
                {playlist.title}
              </h3>
              <p className={`text-xs mb-4 font-mono leading-relaxed ${textSub}`}>
                {language === "pt" ? playlist.descriptionPt : playlist.descriptionEn}
              </p>
            </div>

            <div className="border-t-2 border-foreground pt-4 flex items-center justify-between gap-4">
              <span className={`text-xs uppercase tracking-wider ${textSub}`}>
                {playlist.tracksCount} {language === "pt" ? "faixas" : "tracks"}
              </span>

              <a
                href={playlist.spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 neobrutal-btn text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                {language === "pt" ? "abrir spotify" : "launch spotify"}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Crucial Playlist Rule Disclaimer */}
      <div className="p-5 border-2 border-foreground flex items-start gap-4 text-sm leading-relaxed bg-wine-deep/40 text-neutral-450 shadow-[2px_2px_0px_0px_var(--foreground)]">
        <Info className={`w-5 h-5 flex-shrink-0 mt-0.5 ${textMuted}`} />
        <div>
          <strong className={`font-bold block mb-1 uppercase tracking-wider ${textMain}`}>
            {language === "pt" ? "regra de fillers:" : "filler rule:"}
          </strong>
          {language === "pt"
            ? <>estas playlists são feitas para intercalar faixas da ariana com músicas de outros artistas. criar playlists contendo apenas faixas da ariana pode levar o algoritmo a filtrar os streams por comportamento de bot. incluir outros artistas ajuda a garantir a contagem correta das faixas.</>
            : <>these playlists are configured to balance ariana grande tracks with songs by other artists. streaming a playlist containing exclusively ariana tracks can cause the algorithm to filter the streams as bot behavior. including other artists helps ensure track statistics are registered correctly.</>
          }
        </div>
      </div>
    </section>
  );
}
