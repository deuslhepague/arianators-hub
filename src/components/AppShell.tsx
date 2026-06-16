"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSpotify } from "@/context/SpotifyContext";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  BookOpen,
  Music,
  Compass,
  Settings,
  Sun,
  Moon,
  LogOut,
  ArrowUp,
  ArrowDown
} from "lucide-react";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoading: isAuthLoading } = useSpotify();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();

  const [isScrolledDown, setIsScrolledDown] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolledDown(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleScrollToggle = () => {
    if (window.scrollY > 300) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
    }
  };

  // Helper to determine the active tab
  const getActiveTab = () => {
    if (pathname === "/streams" || pathname === "/") return "streams";
    if (pathname === "/generator") return "generator";
    if (pathname === "/guide") return "guide";
    if (pathname === "/admin") return "admin";
    if (pathname === "/remove-user") return "remove-user";
    return "streams";
  };

  const activeTab = getActiveTab();

  const handleLogout = async () => {
    await logout();
    router.push("/streams");
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-floral-bg text-floral-fg transition-colors duration-200 pb-12 md:pb-28">
      {/* TOP UTILITY BAR (Login / Theme) */}
      <div className="w-full bg-wine-deep px-4 md:px-8 py-2.5 flex justify-between items-center text-xs text-mauve border-b border-panel-border">
        <div>
          <span>{t("subtitle.tagline")}</span>
        </div>
        <div className="flex items-center gap-4">
          {isAuthLoading ? (
            <span className="animate-pulse pl-2 border-l border-panel-border">
              {t("auth.connecting")}
            </span>
          ) : user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-panel-border">
              <span className="truncate max-w-[100px] text-rose font-semibold">
                {user.display_name}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {/* SIGNATURE SHOP-STYLE CENTERED HEADER */}
      <header className="w-full pt-10 pb-8 flex flex-col items-center justify-center border-b border-panel-border bg-wine/20">
        <Link
          href="/streams"
          className="text-3xl md:text-4xl font-serif text-rose tracking-widest lowercase cursor-pointer hover:opacity-80 transition-opacity"
        >
          arianators hub
        </Link>
        <span className="text-[10px] text-mauve font-serif tracking-widest lowercase mt-1.5 border-t border-panel-border pt-1.5 px-6">
          {t("brand.subtitle")}
        </span>
      </header>

      {/* CENTERED TAB NAVIGATION */}
      <nav className="border-b border-panel-border bg-wine/40 sticky top-0 z-40 transition-colors">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex justify-center flex-wrap gap-x-8 gap-y-2 text-xs font-bold uppercase tracking-widest text-mauve">
          <Link
            href="/guide"
            className={`hover:text-rose transition-colors ${activeTab === "guide" ? "text-rose underline underline-offset-8 decoration-1" : ""
              }`}
          >
            {t("nav.guide")}
          </Link>
          <Link
            href="/streams"
            className={`hover:text-rose transition-colors ${activeTab === "streams" ? "text-rose underline underline-offset-8 decoration-1" : ""
              }`}
          >
            {t("nav.streams")}
          </Link>
          <Link
            href="/generator"
            className={`hover:text-rose transition-colors ${activeTab === "generator" ? "text-rose underline underline-offset-8 decoration-1" : ""
              }`}
          >
            {t("nav.generator")}
          </Link>
          <Link
            href="/admin"
            className={`hover:text-rose transition-colors ${activeTab === "admin" ? "text-rose underline underline-offset-8 decoration-1" : ""
              }`}
          >
            {t("nav.admin")}
          </Link>
        </div>
      </nav>

      {/* MAIN VIEW CONTROLLER */}
      <main className="max-w-6xl mx-auto px-4 md:px-8 pt-8 pb-16 flex-1 w-full">
        {children}
      </main>

      {/* FLOATING MOBILE/DESKTOP BOTTOM NAVIGATION BAR */}
      <div className="floating-bottom-nav px-6 py-3 hidden md:flex items-center gap-6 md:gap-10">
        {[
          { id: "guide", label: t("nav.guide"), icon: BookOpen, path: "/guide" },
          { id: "streams", label: t("nav.streams"), icon: Music, path: "/streams" },
          { id: "generator", label: t("nav.generator"), icon: Compass, path: "/generator" },
          { id: "admin", label: t("nav.admin"), icon: Settings, path: "/admin" },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <Link
              key={item.id}
              href={item.path}
              className={`flex flex-col items-center gap-1 transition-all ${isActive
                  ? (theme === "light" ? "text-black scale-110 font-bold" : "text-white scale-110 font-bold")
                  : (theme === "light" ? "text-neutral-500 hover:text-black" : "text-neutral-400 hover:text-white")
                }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] font-bold uppercase tracking-widest">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* FLOATING QUICK SETTINGS DOCK */}
      <div className="fixed right-4 bottom-6 md:bottom-8 z-50 flex flex-col gap-3">
        {/* Scroll to top/bottom button (mobile only) */}
        <button
          onClick={handleScrollToggle}
          className="md:hidden w-11 h-11 rounded-full flex items-center justify-center shadow-lg border backdrop-blur-md transition-all duration-250 hover:scale-110 cursor-pointer bg-white/95 border-neutral-300 text-neutral-900 hover:bg-neutral-100 dark:bg-neutral-900/95 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-800"
          title={isScrolledDown ? (language === "pt" ? "Ir para o topo" : "Scroll to top") : (language === "pt" ? "Ir para o final" : "Scroll to bottom")}
        >
          {isScrolledDown ? (
            <ArrowUp className="w-4 h-4 text-rose" />
          ) : (
            <ArrowDown className="w-4 h-4 text-rose" />
          )}
        </button>

        {/* Language button */}
        <button
          onClick={() => setLanguage(language === "en" ? "pt" : "en")}
          className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-xs uppercase tracking-wider shadow-lg border backdrop-blur-md transition-all duration-250 hover:scale-110 cursor-pointer bg-white/95 border-neutral-300 text-neutral-900 hover:bg-neutral-100 dark:bg-neutral-900/95 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-800"
          title={language === "pt" ? "Alterar para Inglês" : "Change to Portuguese"}
        >
          {language === "en" ? "pt" : "en"}
        </button>

        {/* Theme button */}
        <button
          onClick={toggleTheme}
          className="w-11 h-11 rounded-full flex items-center justify-center shadow-lg border backdrop-blur-md transition-all duration-250 hover:scale-110 cursor-pointer bg-white/95 border-neutral-300 text-neutral-900 hover:bg-neutral-100 dark:bg-neutral-900/95 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-800"
          title={language === "pt" ? "Alternar tema claro/escuro" : "Toggle theme light/dark"}
        >
          {theme === "dark" ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-650" />}
        </button>

        {/* Logout button */}
        {user && (
          <button
            onClick={handleLogout}
            className="w-11 h-11 rounded-full flex items-center justify-center shadow-lg border backdrop-blur-md transition-all duration-250 hover:scale-110 cursor-pointer bg-white/95 border-neutral-300 text-neutral-900 hover:bg-red-50 hover:text-red-650 dark:bg-neutral-900/95 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-red-950/40 dark:hover:text-red-400"
            title={language === "pt" ? "Sair da conta" : "Logout"}
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
