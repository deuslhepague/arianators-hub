"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import {
  BookOpen,
  CheckCircle,
  XCircle,
  Globe,
  Compass,
  Layers,
  Info,
  TrendingUp,
  Clock,
  Volume2,
  Monitor
} from "lucide-react";

export default function StreamingGuide() {
  const [activeTab, setActiveTab] = useState<"basics" | "rules" | "multi" | "charts">("basics");
  const { language } = useLanguage();
  const { theme } = useTheme();
  const [localResetTime, setLocalResetTime] = useState<string>("");

  useEffect(() => {
    const utcDate = new Date();
    utcDate.setUTCHours(0, 0, 0, 0);
    const timeStr = utcDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setLocalResetTime(timeStr);
  }, []);

  // Theme helpers
  const lt = theme === "light";
  const textMain = lt ? "text-neutral-950" : "text-white";
  const textSub = lt ? "text-neutral-600" : "text-neutral-400";
  const textMuted = lt ? "text-neutral-500" : "text-neutral-450";
  const border = lt ? "border-neutral-200" : "border-panel-border";
  const cardBg = lt ? "bg-white border-neutral-200" : "bg-neutral-950/40 border-panel-border";
  const deepBg = lt ? "bg-neutral-50 border-neutral-200" : "bg-wine-deep border-panel-border";
  const tabBg = lt ? "bg-neutral-100 border-neutral-200" : "bg-neutral-950 border-neutral-900";
  const tabActive = lt ? "bg-black text-white" : "bg-white text-black";
  const tabInactive = lt ? "text-neutral-500 hover:text-black" : "text-neutral-450 hover:text-white";
  const iconBox = lt ? "text-black" : "text-white";

  return (
    <section className="glass-panel p-6 lg:p-10 animate-fade-in" id="guide">
      <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 border-b ${border} pb-6`}>
        <div>
          <h2 className={`text-xl md:text-2xl font-bold tracking-wider uppercase flex items-center gap-3 ${textMain}`}>
            <BookOpen className={`w-6 h-6 ${iconBox}`} />
            {language === "pt" ? "guia de streaming" : "streaming guide"}
          </h2>
          {/*
          <p className={`text-sm mt-1 font-mono ${textMuted}`}>
            {language === "pt"
              ? "domine a arte do streaming e maximize o suporte aos charts da ariana grande"
              : "master the art of streaming and maximize support for ariana grande's charts"}
          </p>*/}
        </div>

        {/* Tab Controls */}
        <div className={`flex flex-wrap gap-2 p-1.5 border rounded font-mono ${tabBg}`}>
          {[
            { id: "basics", label: language === "pt" ? "o básico" : "the basics" },
            { id: "rules", label: language === "pt" ? "regras" : "dos & don'ts" },
            { id: "multi", label: language === "pt" ? "multi-contas" : "multi-account" },
            { id: "charts", label: language === "pt" ? "metas e charts" : "target charts" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded transition-all duration-200 cursor-pointer ${activeTab === tab.id
                ? `${tabActive} font-extrabold shadow`
                : tabInactive
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Contents */}
      <div className="min-h-[380px]">
        {/* Tab 1: Basics */}
        {activeTab === "basics" && (
          <div className="space-y-6 animate-slide-up">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`p-6 border rounded ${cardBg}`}>
                <h3 className={`text-base font-bold uppercase tracking-wider mb-3 flex items-center gap-2 ${textMain}`}>
                  <Info className="w-5 h-5 text-rose" />
                  {language === "pt" ? "o que é streaming no spotify?" : "what is spotify streaming?"}
                </h3>
                <p className={`text-sm leading-relaxed font-serif ${textSub}`}>
                  {language === "pt"
                    ? "o spotify é o principal motor para registrar recordes e charts globais (billboard hot 100, global top 50, etc.). no entanto, a repetição simples não funciona: o sistema possui filtros que bloqueiam comportamentos parecidos com robôs."
                    : "spotify is the main engine driving records on the charts (billboard hot 100, billboard 200, global top 50, etc.). however, simple repetition doesn't work. the system filters bot-like behavior."}
                </p>
                <div className={`mt-4 p-4 border rounded ${deepBg}`}>
                  <p className={`text-xs leading-relaxed font-mono ${textMain}`}>
                    <strong className={`uppercase ${textMain}`}>
                      {language === "pt" ? "a regra dos 20 plays:" : "the 20-plays rule:"}
                    </strong>{" "}
                    {language === "pt"
                      ? "o spotify só conta cerca de 20 reproduções de uma mesma versão por dia por conta para os charts. tocar em loop uma única música 100 vezes seguidas descarta 80 streams! por isso, geramos playlists que alternam edições de álbuns e lançamentos alternativos."
                      : "spotify only counts around 20 plays per song version per day per user for the charts. streaming a single song 100 times in a row on repeat wastes 80 streams! instead, we stream alternative album releases and editions."}
                  </p>
                </div>
              </div>

              <div className={`p-6 border rounded ${cardBg}`}>
                <h3 className={`text-base font-bold uppercase tracking-wider mb-3 flex items-center gap-2 ${textMain}`}>
                  <Clock className={`w-5 h-5 ${iconBox}`} />
                  {language === "pt" ? "reinício diário" : "daily resets"}
                </h3>
                <p className={`text-sm leading-relaxed font-serif ${textSub}`}>
                  {language === "pt"
                    ? `o período diário de contagem do spotify global encerra e reinicia exatamente às 12am GMT${localResetTime ? ` (${localResetTime} no seu horário local)` : ""}. atente-se a esse horário para zerar o seu termômetro!`
                    : `the daily counting period for spotify global ends and resets at 12am GMT${localResetTime ? ` (${localResetTime} your local time)` : ""}. make sure to track your local time to reset your daily play thermometer counts!`}
                </p>
                <div className="mt-6 grid grid-cols-2 gap-4 text-center text-xs font-mono">
                  <div className={`p-3 border rounded ${deepBg}`}>
                    <span className={`block mb-1 ${textMuted}`}>{language === "pt" ? "reinício gmt" : "gmt reset"}</span>
                    <span className={`font-bold text-sm ${textMain}`}>00:00 (12am GMT)</span>
                  </div>
                  <div className={`p-3 border rounded ${deepBg}`}>
                    <span className={`block mb-1 ${textMuted}`}>{language === "pt" ? "reinício local" : "local reset time"}</span>
                    <span className={`font-bold text-sm ${textMain}`}>
                      {localResetTime || "12am GMT"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className={`p-6 border rounded ${cardBg}`}>
              <h3 className={`text-base font-bold uppercase tracking-wider mb-4 flex items-center gap-2 ${textMain}`}>
                <Monitor className={`w-5 h-5 ${iconBox}`} />
                {language === "pt" ? "spotify gratuito vs spotify premium" : "spotify free vs spotify premium"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm font-serif">
                <div>
                  <h4 className={`font-bold mb-2 uppercase tracking-wide text-xs font-mono ${textMain}`}>
                    {language === "pt" ? "spotify gratuito (computador/web)" : "spotify free (computer/web)"}
                  </h4>
                  <ul className={`space-y-2 list-disc list-inside ${textSub}`}>
                    {language === "pt" ? (
                      <>
                        <li>reproduza qualquer faixa sob demanda na ordem desejada</li>
                        <li>sem limite de pulos de faixa!</li>
                        <li>contém anúncios em áudio entre as músicas</li>
                        <li>excelente para rodar múltiplas contas no pc!</li>
                      </>
                    ) : (
                      <>
                        <li>play any song on-demand in the order you choose</li>
                        <li>no skip limits!</li>
                        <li>contains audio/banner ads between tracks</li>
                        <li>great for multi-account container streaming on pc!</li>
                      </>
                    )}
                  </ul>
                </div>
                <div>
                  <h4 className={`font-bold mb-2 uppercase tracking-wide text-xs font-mono ${textMain}`}>
                    {language === "pt" ? "spotify premium (todos os dispositivos)" : "spotify premium (all devices)"}
                  </h4>
                  <ul className={`space-y-2 list-disc list-inside ${textSub}`}>
                    {language === "pt" ? (
                      <>
                        <li>sem anúncios - streams contínuos</li>
                        <li>permite download offline mantendo alta contagem</li>
                        <li>controle total no celular (sem modo aleatório forçado)</li>
                        <li>qualidade de áudio superior para contagem dos charts</li>
                      </>
                    ) : (
                      <>
                        <li>no ads whatsoever - continuous streaming</li>
                        <li>download tracks for high-fidelity offline streams</li>
                        <li>total control on mobile (no forced shuffle)</li>
                        <li>highest audio quality stream counting</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: DOs & DON'Ts */}
        {activeTab === "rules" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-slide-up text-sm">
            {/* DO LIST */}
            <div className="space-y-4">
              <h3 className={`text-sm font-bold flex items-center gap-2 border-b pb-2 uppercase tracking-wider ${textMain} ${border}`}>
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                {language === "pt" ? "o que fazer" : "what to do"}
              </h3>
              <ul className="space-y-3.5 text-neutral-400 font-serif">
                {language === "pt" ? (
                  <>
                    <li className="flex items-start gap-2.5">
                      <span className={textMain}>✔</span>
                      <span><strong>ouça até o final:</strong> deixe as faixas tocarem do primeiro ao último segundo.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className={textMain}>✔</span>
                      <span><strong>misture eras e artistas:</strong> intercale a música foco com hits antigos da ariana e interlúdios de terceiros.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className={textMain}>✔</span>
                      <span><strong>volume:</strong> mantenha o volume do dispositivo acima de <strong>50%</strong>. se precisar de silêncio, conecte fones de ouvido mas não zere o player.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className={textMain}>✔</span>
                      <span><strong>crossfade e autoplay:</strong> ative o crossfade (até 12s) para transições suaves. desative o autoplay automático.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className={textMain}>✔</span>
                      <span><strong>interaja:</strong> curta músicas, salve na biblioteca, compartilhe links e veja a letra para parecer uma conta ativa humana.</span>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-start gap-2.5">
                      <span className={textMain}>✔</span>
                      <span><strong>listen to completion:</strong> let focus songs play from the very first to the last second.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className={textMain}>✔</span>
                      <span><strong>mix eras & artists:</strong> intercalate the focus track with older ariana hits and non-ariana fillers.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className={textMain}>✔</span>
                      <span><strong>audible volume:</strong> keep the device/app volume above <strong>50%</strong>. if you want silence, use headphones but keep the player volume up.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className={textMain}>✔</span>
                      <span><strong>crossfade & autoplay:</strong> enable crossfade (up to 12s) for smooth transitions. disable autoplay.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className={textMain}>✔</span>
                      <span><strong>interact:</strong> save tracks, share links on social media, like albums, and view lyrics to look human.</span>
                    </li>
                  </>
                )}
              </ul>
            </div>

            {/* DON'T LIST */}
            <div className="space-y-4">
              <h3 className={`text-sm font-bold flex items-center gap-2 border-b pb-2 uppercase tracking-wider ${textMain} ${border}`}>
                <XCircle className="w-5 h-5 text-red-500" />
                {language === "pt" ? "o que não fazer" : "what not to do"}
              </h3>
              <ul className={`space-y-3.5 font-serif ${textSub}`}>
                {language === "pt" ? (
                  <>
                    <li className="flex items-start gap-2.5">
                      <span className={textMain}>✘</span>
                      <span><strong>não deixar em loop:</strong> tocar a mesma música sem interrupção bloqueia a contagem nos charts.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className={textMain}>✘</span>
                      <span><strong>não mute o app do spotify:</strong> mutar o player do spotify diretamente cancela o registro do stream.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className={textMain}>✘</span>
                      <span><strong>não use vpns/proxies:</strong> streams por vpn são descartados dos charts oficiais de cada território.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className={textMain}>✘</span>
                      <span><strong>não acelere ou pule:</strong> avançar trechos ou ouvir em velocidade acelerada cancela o registro de stream.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className={textMain}>✘</span>
                      <span><strong>não repita a mesma playlist:</strong> altere ou crie playlists novas para evitar detecção de rotinas automatizadas.</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-rose">
                      <span className="font-bold">✘</span>
                      <span className="font-bold">evite playlists formadas 100% por músicas da ariana grande: é essencial intercalar faixas dela com músicas de outros artistas para evitar que o algoritmo do spotify filtre os streams como comportamento robótico.</span>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-start gap-2.5">
                      <span className={textMain}>✘</span>
                      <span><strong>do not loop one song:</strong> looping a single song blocks chart counting and flags you as a bot.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className={textMain}>✘</span>
                      <span><strong>do not mute spotify:</strong> muting the spotify application directly will cancel the stream registration.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className={textMain}>✘</span>
                      <span><strong>do not use vpns/hacks:</strong> streaming with a vpn filters your plays out of the local chart database.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className={textMain}>✘</span>
                      <span><strong>do not fast-forward:</strong> skipping forward or playing at higher speeds cancels the stream count.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className={textMain}>✘</span>
                      <span><strong>do not loop one playlist:</strong> change up playlists daily to avoid looking like automated routines.</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-rose">
                      <span className="font-bold">✘</span>
                      <span className="font-bold">avoid playlists with 100% ariana grande songs: it is essential to alternate her tracks with songs by other artists. if a playlist consists exclusively of her songs, the spotify algorithm may flag and filter the streams.</span>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Tab 3: Multi-Account Strategy */}
        {activeTab === "multi" && (
          <div className="space-y-6 animate-slide-up text-sm">
            <div className={`p-5 border rounded flex flex-col md:flex-row md:items-center gap-4 ${deepBg}`}>
              <Layers className={`w-8 h-8 flex-shrink-0 ${iconBox}`} />
              <div>
                <h4 className={`text-base font-bold uppercase tracking-wider ${textMain}`}>
                  {language === "pt" ? "estratégia avançada no pc: multi-streaming" : "advanced desktop strategy: multi-streaming"}
                </h4>
                <p className={`text-xs mt-1 font-mono ${textMuted}`}>
                  {language === "pt"
                    ? "multiplique seu impacto nos charts tocando playlists em várias contas simultâneas usando containers."
                    : "multiply your streaming impact by playing spotify on multiple accounts at the same time using browser containment systems."}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-serif">
              {/* Browser Profiles */}
              <div className={`p-6 border rounded flex flex-col justify-between ${cardBg}`}>
                <div>
                  <h4 className={`font-bold flex items-center gap-2 mb-3 uppercase tracking-wider text-xs font-mono ${textMain}`}>
                    <Globe className={`w-4 h-4 ${iconBox}`} />
                    chrome / edge / brave
                  </h4>
                  <p className={`mb-4 leading-relaxed ${textSub}`}>
                    {language === "pt"
                      ? "estes navegadores permitem criar perfis de usuários separados. cada perfil atua de forma isolada, contendo seus próprios cookies."
                      : "these browsers let you create distinct user profiles. each profile acts as a clean, completely isolated browser instance with its own cookies and local storage."}
                  </p>
                  <ol className={`space-y-2 list-decimal list-inside leading-relaxed text-xs font-mono ${textSub}`}>
                    {language === "pt" ? (
                      <>
                        <li>clique no ícone de perfil no canto superior direito do navegador</li>
                        <li>clique em <strong>adicionar perfil</strong> (selecione 'continuar sem conta')</li>
                        <li>dê um nome (ex: 'stream 1', 'stream 2')</li>
                        <li>abra o spotify web player em cada perfil e faça login com contas <strong>diferentes</strong></li>
                        <li>inicie a playlist gerada em todas as janelas ao mesmo tempo!</li>
                      </>
                    ) : (
                      <>
                        <li>click your profile icon in the top-right corner of chrome/edge</li>
                        <li>click <strong>add</strong> to create a new profile (choose "continue without account")</li>
                        <li>name it (e.g. "stream 1", "stream 2")</li>
                        <li>open spotify web player in each profile and log in with <strong>different</strong> spotify accounts</li>
                        <li>stream your custom generated playlists simultaneously!</li>
                      </>
                    )}
                  </ol>
                </div>
                <div className={`mt-6 p-3 border rounded text-xs leading-normal font-mono ${deepBg} ${textSub}`}>
                  ⚡ {language === "pt" ? "nota: você precisa de uma conta separada do spotify para cada aba/perfil." : "note: you need a separate spotify account (free or premium) for each browser profile."}
                </div>
              </div>

              {/* Firefox Multi-Account Containers */}
              <div className={`p-6 border rounded flex flex-col justify-between ${cardBg}`}>
                <div>
                  <h4 className={`font-bold flex items-center gap-2 mb-3 uppercase tracking-wider text-xs font-mono ${textMain}`}>
                    <Compass className={`w-4 h-4 ${iconBox}`} />
                    firefox (containers)
                  </h4>
                  <p className={`mb-4 leading-relaxed ${textSub}`}>
                    {language === "pt"
                      ? "o firefox possui uma extensão nativa que isola abas de modo que cookies e históricos não se misturem entre si na mesma janela."
                      : "firefox has a native extension called \"multi-account containers\" which lets you open isolated, color-coded tabs that do not share cookies."}
                  </p>
                  <ol className={`space-y-2 list-decimal list-inside leading-relaxed text-xs font-mono ${textSub}`}>
                    {language === "pt" ? (
                      <>
                        <li>instale a extensão <strong>firefox multi-account containers</strong> na loja oficial</li>
                        <li>clique no ícone de containers e adicione novos (ex: 'ari 1', 'ari 2')</li>
                        <li>segure o botão '+' de abrir nova aba e escolha o container desejado</li>
                        <li>faça login em contas distintas e inicie suas playlists de streams!</li>
                      </>
                    ) : (
                      <>
                        <li>install the extension <strong>firefox multi-account containers</strong> from the mozilla store</li>
                        <li>click the container icon on your toolbar and click <strong>manage containers</strong> &rarr; <strong>new container</strong></li>
                        <li>create containers like "ari 1", "ari 2"</li>
                        <li>long-press the "+" tab button and select the container you want to open</li>
                        <li>log in to a separate spotify account in each container tab and start streaming!</li>
                      </>
                    )}
                  </ol>
                </div>
                <div className={`mt-6 p-3 border rounded text-xs leading-normal font-mono ${deepBg} ${textSub}`}>
                  🦊 {language === "pt" ? "dica: este método economiza muita memória RAM rodando tudo numa janela só!" : "tip: this is the most memory-efficient method since it runs inside a single window!"}
                </div>
              </div>
            </div>

            <div className={`p-4 border text-xs md:text-sm flex gap-3 leading-relaxed rounded font-serif ${deepBg} ${textSub}`}>
              <Volume2 className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconBox}`} />
              <div>
                <strong className={`uppercase tracking-wider block mb-1 font-mono ${textMain}`}>
                  {language === "pt" ? "aviso de volume:" : "volume warning:"}
                </strong>
                {language === "pt"
                  ? "o volume das janelas deve ser mantido acima de 50%. se o som de vários perfis simultâneos for irritante, clique com o botão direito na aba do navegador no chrome ou firefox e escolha 'silenciar site/aba'. isso corta o áudio no sistema, mas mantém o spotify tocando internamente garantindo os plays!"
                  : "each profile/tab must register volume above 50%. if your computer is playing multiple audio streams and it gets annoying, you can right-click each browser tab (in chrome/firefox) and select \"mute site / mute tab\". this mutes the audio in your system mixer but allows the spotify player itself to continue playing at full volume, ensuring streams count!"}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Charts */}
        {activeTab === "charts" && (
          <div className="space-y-6 animate-slide-up text-sm">
            <h3 className={`text-base font-bold uppercase tracking-wider flex items-center gap-2 mb-4 ${textMain}`}>
              <TrendingUp className={`w-5 h-5 ${iconBox}`} />
              {language === "pt" ? "charts foco no spotify" : "target spotify charts"}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
              <div className={`p-6 border rounded ${cardBg}`}>
                <h4 className={`font-bold mb-3 uppercase tracking-wider ${textMain}`}>
                  {language === "pt" ? "foco global" : "global focus"}
                </h4>
                <ul className={`space-y-2 ${textSub}`}>
                  <li className={`flex justify-between border-b pb-1 ${border}`}>
                    <span>daily top songs global</span>
                    <span className={`font-medium ${textMain}`}>{language === "pt" ? "diário" : "daily"}</span>
                  </li>
                  <li className={`flex justify-between border-b pb-1 ${border}`}>
                    <span>daily top artists global</span>
                    <span className={`font-medium ${textMain}`}>{language === "pt" ? "diário" : "daily"}</span>
                  </li>
                  <li className={`flex justify-between border-b pb-1 ${border}`}>
                    <span>daily viral songs global</span>
                    <span className={`font-medium ${textMain}`}>{language === "pt" ? "diário" : "daily"}</span>
                  </li>
                  <li className={`flex justify-between border-b pb-1 ${border}`}>
                    <span>weekly top songs global</span>
                    <span className={`font-medium ${textMain}`}>{language === "pt" ? "semanal" : "weekly"}</span>
                  </li>
                  <li className={`flex justify-between border-b pb-1 ${border}`}>
                    <span>billboard global 200</span>
                    <span className={`font-medium ${textMain}`}>{language === "pt" ? "semanal" : "weekly"}</span>
                  </li>
                </ul>
              </div>

              <div className={`p-6 border rounded ${cardBg}`}>
                <h4 className={`font-bold mb-3 uppercase tracking-wider ${textMain}`}>
                  {language === "pt" ? "foco nacional (seu país)" : "national focus (your country)"}
                </h4>
                <ul className={`space-y-2 ${textSub}`}>
                  <li className={`flex justify-between border-b pb-1 ${border}`}>
                    <span>daily top songs local</span>
                    <span className={`font-medium ${textMain}`}>{language === "pt" ? "diário" : "daily"}</span>
                  </li>
                  <li className={`flex justify-between border-b pb-1 ${border}`}>
                    <span>daily top artists local</span>
                    <span className={`font-medium ${textMain}`}>{language === "pt" ? "diário" : "daily"}</span>
                  </li>
                  <li className={`flex justify-between border-b pb-1 ${border}`}>
                    <span>daily viral songs local</span>
                    <span className={`font-medium ${textMain}`}>{language === "pt" ? "diário" : "daily"}</span>
                  </li>
                  <li className={`flex justify-between border-b pb-1 ${border}`}>
                    <span>weekly top songs local</span>
                    <span className={`font-medium ${textMain}`}>{language === "pt" ? "semanal" : "weekly"}</span>
                  </li>
                  <li className={`flex justify-between border-b pb-1 ${border}`}>
                    <span>billboard hot 100</span>
                    <span className={`font-medium ${textMain}`}>{language === "pt" ? "semanal" : "weekly"}</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className={`p-4 border text-center rounded font-serif ${deepBg}`}>
              <p className={`text-sm italic leading-relaxed ${textSub}`}>
                {language === "pt"
                  ? 'cada stream importa.'
                  : 'every single stream counts.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
