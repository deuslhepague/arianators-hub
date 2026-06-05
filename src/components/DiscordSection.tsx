"use client";

import React from "react";
import { MessageSquare, Users, Sparkles, ExternalLink } from "lucide-react";

export default function DiscordSection() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-[#c88f8f]/10 bg-gradient-to-br from-[#160a12] via-[#0b0609] to-[#12071c] p-6 lg:p-10 animate-fade-in flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl vintage-frame">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 rounded-full bg-[#5865F2]/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-56 h-56 rounded-full bg-rose/5 blur-3xl pointer-events-none" />

      <div className="space-y-4 max-w-xl z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5865F2]/10 border border-[#5865F2]/20 text-xs font-semibold text-[#5865F2]">
          <MessageSquare className="w-4 h-4" />
          Community / Discord (Em breve)
        </div>
        <h2 className="font-serif text-3xl md:text-4xl text-floral-fg">
          Join the Future Discord Community
        </h2>
        <p className="text-base md:text-lg text-mauve leading-relaxed">
          We are setting up a dedicated Discord server for global streaming parties! You will be able to organize streaming shifts with other fans, participate in group listening sessions, coordinate on-demand playtimes, and receive updates directly from fanbase charts.
        </p>
        
        <div className="grid grid-cols-2 gap-4 pt-2 text-sm text-mauve">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-rose" />
            <span>Coordinated Listening Parties</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-gold" />
            <span>Fanbase Giveaways & Goals</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center flex-shrink-0 gap-3 z-10">
        <button
          disabled
          className="flex items-center gap-2 px-6 py-4 bg-[#5865F2]/40 text-[#f5ebe6]/60 rounded-full font-semibold text-base transition-all w-full md:w-auto justify-center cursor-not-allowed border border-[#5865F2]/20"
        >
          <span>Server Launching Soon</span>
          <ExternalLink className="w-4 h-4" />
        </button>
        <span className="text-xs text-mauve">
          Stay tuned for the link launch!
        </span>
      </div>
    </section>
  );
}
