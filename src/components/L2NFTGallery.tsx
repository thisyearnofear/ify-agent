"use client";

import { useState } from "react";
import MantleifyGallery from "./MantleifyGallery";
import ScrollifyNFTGallery from "./ScrollifyNFTGallery";

/**
 * Component that combines Mantle and Scroll NFT galleries with tabs
 */
export default function L2NFTGallery() {
  const [activeTab, setActiveTab] = useState<"mantle" | "scroll">("mantle");

  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold text-center mb-4">
        Mantle & Scroll NFTs
      </h2>

      {/* Filter buttons - styled like BaseNFTGallery */}
      <div className="flex justify-center gap-2 mb-4">
        <button
          className={`px-3 py-1 text-xs rounded-full ${
            activeTab === "mantle"
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
          onClick={() => setActiveTab("mantle")}
        >
          Mantle
        </button>
        <button
          className={`px-3 py-1 text-xs rounded-full ${
            activeTab === "scroll"
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
          onClick={() => setActiveTab("scroll")}
        >
          Scroll
        </button>
      </div>

      {/* Gallery content */}
      <div className="mt-4">
        {activeTab === "mantle" ? (
          <MantleifyGallery />
        ) : (
          <ScrollifyNFTGallery />
        )}
      </div>
    </div>
  );
}
