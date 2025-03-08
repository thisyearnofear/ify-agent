"use client";

import dynamic from "next/dynamic";
import { Providers } from "@/components/providers/Providers";

// Dynamically import components that need to be client-side only
const FrameContent = dynamic(() => import("./FrameContent"), {
  ssr: false,
  loading: () => (
    <div className="p-4 text-center text-white">Loading frame...</div>
  ),
});

export default function FramePage() {
  return (
    <Providers>
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-900">
        <FrameContent />
      </div>
    </Providers>
  );
}
