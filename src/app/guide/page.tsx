"use client";

import React from "react";
import StreamingGuide from "@/components/StreamingGuide";
import PreMadePlaylists from "@/components/PreMadePlaylists";

export default function GuidePage() {
  return (
    <div className="space-y-6">
      <StreamingGuide />
      <PreMadePlaylists />
    </div>
  );
}
