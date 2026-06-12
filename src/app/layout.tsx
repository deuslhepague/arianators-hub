import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";
import { SpotifyProvider } from "@/context/SpotifyContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { LanguageProvider } from "@/context/LanguageContext";
import AppShell from "@/components/AppShell";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "arianators hub | Spotify Streams Tracker for Ariana Grande",
  description: "Track your streams, generate optimized filler playlists, and monitor rankings on the global leaderboard to support Ariana Grande's era.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col transition-colors duration-200">
        <LanguageProvider>
          <ThemeProvider>
            <SpotifyProvider>
              <AppShell>
                {children}
              </AppShell>
            </SpotifyProvider>
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}

